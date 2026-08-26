import * as THREE from 'three';
import {
  blurFragmentShader,
  brightPassFragmentShader,
  fullscreenVertexShader,
  postFragmentShader,
} from './shaders';

/**
 * Threshold → separable blur → composite.
 *
 * The blur runs at a quarter of the scene resolution in each axis, so the
 * three extra passes cost roughly 6% of one full-resolution pass. Tone
 * mapping lives in the composite step rather than on the renderer, which is
 * what lets the wordmark be drawn afterwards with its colours untouched.
 */
export class PostPipeline {
  readonly sceneTarget: THREE.WebGLRenderTarget;

  private readonly bloomA: THREE.WebGLRenderTarget;
  private readonly bloomB: THREE.WebGLRenderTarget;
  private readonly quad: THREE.Mesh;
  private readonly camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private readonly geometry = new THREE.PlaneGeometry(2, 2);

  private readonly brightMat: THREE.ShaderMaterial;
  private readonly blurMat: THREE.ShaderMaterial;
  private readonly compositeMat: THREE.ShaderMaterial;

  private width = 1;
  private height = 1;

  bloomEnabled = true;

  constructor(renderer: THREE.WebGLRenderer) {
    const type = renderer.capabilities.isWebGL2 ? THREE.HalfFloatType : THREE.UnsignedByteType;
    const options: THREE.RenderTargetOptions = {
      type,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      depthBuffer: true,
      stencilBuffer: false,
      colorSpace: THREE.LinearSRGBColorSpace,
    };

    this.sceneTarget = new THREE.WebGLRenderTarget(1, 1, options);
    this.bloomA = new THREE.WebGLRenderTarget(1, 1, { ...options, depthBuffer: false });
    this.bloomB = new THREE.WebGLRenderTarget(1, 1, { ...options, depthBuffer: false });

    this.brightMat = new THREE.ShaderMaterial({
      vertexShader: fullscreenVertexShader,
      fragmentShader: brightPassFragmentShader,
      uniforms: {
        uScene: { value: this.sceneTarget.texture },
        uThreshold: { value: 0.62 },
        uKnee: { value: 0.22 },
      },
      depthTest: false,
      depthWrite: false,
    });

    this.blurMat = new THREE.ShaderMaterial({
      vertexShader: fullscreenVertexShader,
      fragmentShader: blurFragmentShader,
      uniforms: {
        uSource: { value: null },
        uDirection: { value: new THREE.Vector2() },
      },
      depthTest: false,
      depthWrite: false,
    });

    this.compositeMat = new THREE.ShaderMaterial({
      vertexShader: fullscreenVertexShader,
      fragmentShader: postFragmentShader,
      uniforms: {
        uScene: { value: this.sceneTarget.texture },
        uBloom: { value: this.bloomB.texture },
        uBloomStrength: { value: 0.42 },
        uExposure: { value: 1.32 },
        uAberration: { value: 0.0085 },
        uVignette: { value: 0.55 },
      },
      depthTest: false,
      depthWrite: false,
    });

    this.quad = new THREE.Mesh(this.geometry, this.brightMat);
    this.quad.frustumCulled = false;
  }

  /**
   * `sceneScale` renders the atmosphere below the canvas resolution and lets
   * the composite upscale it. On a phone this is the cheapest large win
   * available: the expensive fragment work is the backdrop and the fireworks,
   * and both are smooth enough that the upscale is invisible.
   */
  setSize(width: number, height: number, pixelRatio: number, sceneScale = 1) {
    this.width = Math.max(1, Math.round(width * pixelRatio * sceneScale));
    this.height = Math.max(1, Math.round(height * pixelRatio * sceneScale));
    this.sceneTarget.setSize(this.width, this.height);

    const bw = Math.max(1, Math.round(this.width / 4));
    const bh = Math.max(1, Math.round(this.height / 4));
    this.bloomA.setSize(bw, bh);
    this.bloomB.setSize(bw, bh);
  }

  private draw(renderer: THREE.WebGLRenderer, material: THREE.ShaderMaterial, target: THREE.WebGLRenderTarget | null) {
    this.quad.material = material;
    renderer.setRenderTarget(target);
    renderer.render(this.quad, this.camera);
  }

  /** Consumes `sceneTarget` and writes the graded frame to the canvas. */
  render(renderer: THREE.WebGLRenderer) {
    if (this.bloomEnabled) {
      this.draw(renderer, this.brightMat, this.bloomA);

      const texelX = 1 / this.bloomA.width;
      const texelY = 1 / this.bloomA.height;

      this.blurMat.uniforms.uSource.value = this.bloomA.texture;
      this.blurMat.uniforms.uDirection.value.set(texelX, 0);
      this.draw(renderer, this.blurMat, this.bloomB);

      this.blurMat.uniforms.uSource.value = this.bloomB.texture;
      this.blurMat.uniforms.uDirection.value.set(0, texelY);
      this.draw(renderer, this.blurMat, this.bloomA);

      this.compositeMat.uniforms.uBloom.value = this.bloomA.texture;
      this.compositeMat.uniforms.uBloomStrength.value = 0.42;
    } else {
      this.compositeMat.uniforms.uBloomStrength.value = 0;
    }

    this.draw(renderer, this.compositeMat, null);
  }

  setQuality(tier: 'high' | 'medium' | 'low') {
    this.bloomEnabled = tier !== 'low';
    const u = this.compositeMat.uniforms;
    u.uAberration.value = tier === 'high' ? 0.0085 : 0;
    u.uVignette.value = tier === 'low' ? 0.45 : 0.55;
  }

  dispose() {
    this.sceneTarget.dispose();
    this.bloomA.dispose();
    this.bloomB.dispose();
    this.geometry.dispose();
    this.brightMat.dispose();
    this.blurMat.dispose();
    this.compositeMat.dispose();
  }
}
