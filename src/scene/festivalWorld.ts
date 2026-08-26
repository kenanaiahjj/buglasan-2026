import * as THREE from 'three';
import gsap from 'gsap';
import { BUGLASAN_HERO_LOGO } from '../data/pageant';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import {
  backdropFragmentShader,
  backdropVertexShader,
  fireworksFragmentShader,
  fireworksVertexShader,
  floatingOrbFragmentShader,
  floatingOrbVertexShader,
  landmarkFragmentShader,
  landmarkVertexShader,
  particleFragmentShader,
  particleVertexShader,
} from './shaders';

/** Everything on this layer is composited crisp, after post-processing. */
export const LAYER_ATMOSPHERE = 0;
export const LAYER_OVERLAY = 1;

type LandmarkConfig = {
  file: string;
  pos: [number, number, number];
  size: [number, number];
  parallax: number;
  driftPhase: number;
  /** Relative weight in the reveal; architecture reads louder than scenery. */
  presence: number;
};

/**
 * The Dumaguete skyline, scattered across the stage.
 *
 * Laid out to two rules, both learned the hard way from an earlier version
 * that carried thirty-two pieces:
 *
 *   Every piece sits wholly inside the frame. The reveal is a pool of light
 *   the size of a landmark, so a landmark half off the edge is a landmark you
 *   can never actually see — twenty-seven of the thirty-two were clipped.
 *   The bounds below allow for the fit-scale, the camera tilt and the full
 *   parallax swing at a 3:2 viewport, the narrowest desktop shape.
 *
 *   Prominent pieces do not stack. The old set had the hall sitting entirely
 *   on top of a palm and a row of huts, and the ridge covering the cathedral
 *   almost completely; lighting any one of them lit three overlapping
 *   drawings at once. Duplicates of each landmark are gone and the survivors
 *   are spread to the flanks, leaving the middle column clear for the
 *   wordmark and the type beneath it.
 *
 * Ordered heroes-first: the low-power build takes the head of the list.
 * `parallax` rises with proximity so the set separates as the pointer moves,
 * and `presence` weights each piece in the reveal.
 */
const LANDMARKS: LandmarkConfig[] = [
  // ── heroes: the low-power build stops after these ─────────────────────
  { file: '/assets/landmarks/mt-talinis.svg', pos: [0.0, 2.9, -9.0], size: [8.5, 4.01], parallax: 0.14, driftPhase: 0.0, presence: 0.5 },
  { file: '/assets/landmarks/dumaguete-cathedral.svg', pos: [-4.4, 1.15, -5.8], size: [4.6, 3.65], parallax: 0.34, driftPhase: 4.8, presence: 1.0 },
  { file: '/assets/landmarks/dumaguete-belltower.svg', pos: [5.0, 1.4, -5.4], size: [2.7, 4.12], parallax: 0.36, driftPhase: 1.2, presence: 1.05 },
  { file: '/assets/landmarks/negros-capitol.svg', pos: [4.5, -3.2, -6.2], size: [4.8, 3.08], parallax: 0.3, driftPhase: 2.2, presence: 0.9 },
  { file: '/assets/landmarks/silliman-hall.svg', pos: [-4.15, -3.1, -5.2], size: [4.8, 3.3], parallax: 0.36, driftPhase: 0.6, presence: 0.9 },
  { file: '/assets/landmarks/rizal-boulevard.svg', pos: [0.0, -2.7, -4.2], size: [5.4, 3.38], parallax: 0.4, driftPhase: 2.8, presence: 0.7 },
  { file: '/assets/landmarks/silliman-portal.svg', pos: [5.9, -1.4, -6.4], size: [2.4, 2.59], parallax: 0.26, driftPhase: 3.1, presence: 0.5 },
  { file: '/assets/landmarks/palm-cluster.svg', pos: [-5.3, -1.5, -4.6], size: [2.0, 2.21], parallax: 0.3, driftPhase: 3.3, presence: 0.45 },

  // The Bais dolphins are drawn (bais-dolphins.svg) but not placed: they are
  // a waterline piece, the waterline is the one band with no room left, and
  // behind the boulevard they were invisible anyway.

  // ── far field: the reduced variants ──────────────────────────────────
  //
  // Drawn for distance rather than scaled down to it. A piece authored at six
  // units and shown at one and a half loses its hatching to the mip chain and
  // keeps only a grey haze, so these carry a handful of heavy strokes and
  // almost no colour — the smallest and whitest things on the stage, and what
  // opens the depth between the shoreline and the horizon.
  { file: '/assets/landmarks/far-ridge.svg', pos: [0.6, 0.6, -10.0], size: [9.0, 3.5], parallax: 0.1, driftPhase: 2.1, presence: 0.28 },
  { file: '/assets/landmarks/far-huts.svg', pos: [-1.4, -3.6, -8.6], size: [5.0, 1.56], parallax: 0.16, driftPhase: 4.4, presence: 0.3 },
];

/** On low-power devices only the heroes at the head of the list are built. */
const LOW_POWER_LANDMARKS = 10;

/**
 * How much of the skyline is visible with the cursor away.
 *
 * Where there is a pointer this is almost nothing — the layer is meant to be
 * discovered by sweeping the cursor, not read on arrival. Touch devices get a
 * slightly higher floor because they have no hover to reveal with, and would
 * otherwise be left with an empty sky.
 */
const REST_WITH_HOVER = 0.022;
const REST_WITHOUT_HOVER = 0.06;

/**
 * The supplied low-poly GLB is the hero wordmark source. The transparent PNG
 * stays available in the DOM as the loading and error fallback.
 */
export const BUGLASAN_HERO_MODEL_SRC = '/assets/buglasan-hero-2026.glb';
/** Keep the supplied GLB materials on their authored PBR pipeline. */
export const BUGLASAN_HERO_MATERIAL_MODE = 'source' as const;
const LOGO_ASPECT = BUGLASAN_HERO_LOGO.width / BUGLASAN_HERO_LOGO.height;
const LOGO_WIDTH = 5.35;
/**
 * How hard the wordmark catches the light, and how fast that light travels.
 *
 * `sheen` is the shader-side gloss added on top of the model's own PBR: a
 * travelling specular band plus a fresnel rim. `autoOrbit` is the speed the
 * light circles on its own where there is no cursor to follow.
 */
/**
 * Surface finish for the wordmark.
 *
 * Chrome and glass are not a shader effect, they are three properties held
 * together: a near-mirror roughness, high metalness so the reflection carries
 * the colour instead of a diffuse layer, and — most of all — an environment
 * with structure in it. A smooth surface reflecting a smooth gradient returns
 * a smooth wash, which is exactly what plastic looks like. The horizon line
 * and the softbox strips below are what the eye reads as "polished".
 */
export const BUGLASAN_HERO_FINISH = {
  /* Just under full metal. The last of the diffuse is what keeps the mark
     present against a near-black stage, where a true mirror would go dark
     wherever the studio has nothing to give it. */
  metalness: 0.82,
  roughness: 0.12,
  /** Lacquer layer over the metal. This is the "glassy" half. */
  clearcoat: 1,
  clearcoatRoughness: 0.05,
  envMapIntensity: 1.9,
} as const;

export const BUGLASAN_HERO_SHEEN = {
  /** Broad sheen — the soft body of the highlight. Kept low. */
  sheen: 0.05,
  /** The tight specular glint riding inside the sheen. */
  glint: 0.16,
  /** Silhouette rim. Confined to the true edge, not an all-over haze. */
  rim: 0.09,
  /** How far the highlight takes the surface's own colour. 1 = fully tinted. */
  tint: 0.74,
  /** Gaussian falloffs. Higher = tighter. */
  sheenFalloff: 5.0,
  glintFalloff: 90.0,
  autoOrbit: 0.28,
  /** How far the key and rim lights swing from the pointer, in world units. */
  lightTravel: 3.6,
} as const;

export const BUGLASAN_HERO_LIGHTING = {
  /* Dropped from 3.4. Fill light this high lifts the shadow side to the same
     value as the lit side, and a form with no dark in it cannot read as
     solid — everything arrives mid-bright and slightly plastic. The glint
     below only looks expensive if there is something dark to sit against. */
  ambientIntensity: 1.6,
  keyIntensity: 7,
  frontIntensity: 26,
  rimIntensity: 14,
  sourceIntensity: 38,
  sourcePosition: [-2.55, 0.95, 3.3] as const,
} as const;

/** Fixed points of light that frame the wordmark without competing with it. */
export const BUGLASAN_SPARKLE_LAYOUT = [
  { position: [-3.65, 2.35, -1.8] as const, scale: 2.8, phase: 0.4 },
  { position: [-2.25, 2.95, -2.2] as const, scale: 2.3, phase: 1.8 },
  { position: [-1.0, 3.15, -2.4] as const, scale: 2.0, phase: 3.1 },
  { position: [1.15, 3.0, -2.3] as const, scale: 2.2, phase: 4.5 },
  { position: [2.65, 2.75, -2.0] as const, scale: 2.6, phase: 0.9 },
  { position: [3.7, 1.9, -1.4] as const, scale: 3.0, phase: 2.2 },
  { position: [4.05, 0.55, -1.0] as const, scale: 2.3, phase: 3.8 },
  { position: [3.75, -0.85, -0.8] as const, scale: 2.6, phase: 5.2 },
  { position: [2.65, -1.55, -0.4] as const, scale: 2.2, phase: 1.4 },
  { position: [1.25, -1.85, -0.6] as const, scale: 2.0, phase: 4.0 },
  { position: [-1.25, -1.85, -0.6] as const, scale: 2.2, phase: 0.6 },
  { position: [-2.6, -1.55, -0.4] as const, scale: 2.4, phase: 2.8 },
  { position: [-3.7, -0.85, -0.8] as const, scale: 2.8, phase: 5.8 },
  { position: [-4.0, 0.55, -1.1] as const, scale: 2.4, phase: 1.9 },
  { position: [-3.6, 1.65, -1.6] as const, scale: 2.8, phase: 4.7 },
] as const;

export type FestivalWorld = ReturnType<typeof buildFestivalWorld>;

export function buildFestivalWorld(
  scene: THREE.Scene,
  renderer: THREE.WebGLRenderer,
  quality: { lowPower: boolean; reducedMotion: boolean; onLogoProgress?: (fraction: number) => void },
) {
  const world = new THREE.Group();
  scene.add(world);

  const canHover = typeof window !== 'undefined' && window.matchMedia('(hover: hover)').matches;
  const REST_LEVEL = canHover ? REST_WITH_HOVER : REST_WITHOUT_HOVER;

  const disposables: { dispose: () => void }[] = [];
  const track = <T extends { dispose: () => void }>(item: T) => {
    disposables.push(item);
    return item;
  };

  /* -------------------------------------------------- backdrop */
  const backdropGeo = track(new THREE.PlaneGeometry(1, 1));
  const backdropUniforms = {
    uTime: { value: 0 },
    uMouse: { value: new THREE.Vector2(0, 0) },
    uIntensity: { value: 1 },
  };
  // Fewer FBM octaves and no star field on low-power devices; the two heavy
  // fragment shaders compile a cheaper variant rather than being switched off.
  const lowDefines = quality.lowPower ? { QUALITY_LOW: '' } : undefined;

  const backdropMat = track(
    new THREE.ShaderMaterial({
      vertexShader: backdropVertexShader,
      fragmentShader: backdropFragmentShader,
      uniforms: backdropUniforms,
      defines: lowDefines,
      depthWrite: false,
    }),
  );
  // A 1x1 quad locked to the camera each frame. Kept out of `world` so the
  // aspect fitting applied to the atmosphere cannot crop the sky: the old
  // 64x40 plane at z = -9.5 put the sea glow and the star field entirely
  // outside the frustum, which is why the backdrop read as flat murk.
  const backdrop = new THREE.Mesh(backdropGeo, backdropMat);
  backdrop.frustumCulled = false;
  backdrop.renderOrder = -100;
  scene.add(backdrop);

  const BACKDROP_DISTANCE = 30;
  const camForward = new THREE.Vector3();

  const lockBackdropToCamera = (camera: THREE.PerspectiveCamera) => {
    camera.getWorldDirection(camForward);
    backdrop.position.copy(camera.position).addScaledVector(camForward, BACKDROP_DISTANCE);
    backdrop.quaternion.copy(camera.quaternion);
    const height = 2 * BACKDROP_DISTANCE * Math.tan((camera.fov * Math.PI) / 360) * 1.08;
    backdrop.scale.set(height * camera.aspect, height, 1);
  };

  /* -------------------------------------------------- landmarks */
  const textureLoader = new THREE.TextureLoader();
  const maxAniso = renderer.capabilities.getMaxAnisotropy();

  // One prototype material: every clone hits the same compiled program, so the
  // seven silhouettes cost one shader compile instead of seven.
  const landmarkProto = new THREE.ShaderMaterial({
    vertexShader: landmarkVertexShader,
    fragmentShader: landmarkFragmentShader,
    uniforms: {
      uTexture: { value: null },
      uMouse: { value: new THREE.Vector2(0, 0) },
      uTime: { value: 0 },
      uParallax: { value: 0.4 },
      uPresence: { value: 1 },
      uTorch: { value: 0 },
      uTorchPos: { value: new THREE.Vector2(0, 0) },
      uKeepOut: { value: new THREE.Vector3(0, 0.62, LOGO_WIDTH * 0.62) },
      uRest: { value: REST_LEVEL },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  track(landmarkProto);

  const landmarkMats: THREE.ShaderMaterial[] = [];
  const landmarkMeshes: { mesh: THREE.Mesh; initialY: number; driftPhase: number }[] = [];

  // The landmark drawings declare an intrinsic size well above their viewBox
  // so their hairline hatching survives on a retina desktop. A phone renders
  // the same piece into a few hundred pixels and gains nothing from that
  // headroom, so on low-power devices we rasterise the SVG ourselves at a
  // fraction of its declared size rather than uploading it at full width.
  const RASTER_SCALE = quality.lowPower ? 0.55 : 1;

  const loadLandmarkTexture = (file: string) => {
    if (RASTER_SCALE === 1) return textureLoader.load(file);
    const texture = new THREE.Texture();
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(img.width * RASTER_SCALE));
      canvas.height = Math.max(1, Math.round(img.height * RASTER_SCALE));
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      texture.image = canvas;
      texture.needsUpdate = true;
    };
    img.src = file;
    return texture;
  };

  // Textures are shared between repeated pieces, so the acacias and the ridge
  // cost one upload each however many times they appear.
  const textureCache = new Map<string, THREE.Texture>();
  const chosen = quality.lowPower ? LANDMARKS.slice(0, LOW_POWER_LANDMARKS) : LANDMARKS;

  for (const item of chosen) {
    let tex = textureCache.get(item.file);
    if (!tex) {
      tex = track(loadLandmarkTexture(item.file));
      textureCache.set(item.file, tex);
    }
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.anisotropy = Math.min(4, maxAniso);
    tex.generateMipmaps = true;

    const mat = landmarkProto.clone();
    mat.uniforms.uTexture.value = tex;
    mat.uniforms.uParallax.value = item.parallax;
    mat.uniforms.uPresence.value = item.presence;
    track(mat);
    landmarkMats.push(mat);

    const geo = track(new THREE.PlaneGeometry(item.size[0], item.size[1]));
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(...item.pos);
    mesh.renderOrder = -5;
    world.add(mesh);
    landmarkMeshes.push({ mesh, initialY: item.pos[1], driftPhase: item.driftPhase });
  }

  /* -------------------------------------------------- fireworks */
  const fireworksUniforms = { uTime: { value: 0 }, uMouse: { value: new THREE.Vector2(0, 0) } };
  const fireworksMat = track(
    new THREE.ShaderMaterial({
      vertexShader: fireworksVertexShader,
      fragmentShader: fireworksFragmentShader,
      uniforms: fireworksUniforms,
      defines: lowDefines,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  // A flat quad needs one quad, not 768 triangles.
  const fireworksGeo = track(new THREE.PlaneGeometry(16, 12));
  const fireworks = new THREE.Mesh(fireworksGeo, fireworksMat);
  fireworks.position.set(0, 0.4, -0.6);
  fireworks.renderOrder = -2;
  world.add(fireworks);

  /* -------------------------------------------------- crown halo */
  // The logo is composited after post-processing, so it never blooms on its
  // own. This halo sits behind it inside the bloom pass and supplies the glow.
  const haloUniforms = { uTime: { value: 0 }, uFade: { value: 1 } };
  const haloMat = track(
    new THREE.ShaderMaterial({
      uniforms: haloUniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        precision mediump float;
        varying vec2 vUv;
        uniform float uTime;
        uniform float uFade;
        void main() {
          vec2 d = (vUv - 0.5) * vec2(1.0, 1.42);
          float r = length(d);
          float breathe = 0.94 + 0.06 * sin(uTime * 0.55);
          // Tight, warm, and low — it exists to give the wordmark a bloom
          // seat in the atmosphere pass, not to light the whole frame.
          /* Tightened from 2.2. A broad, soft aura diffuses the mark's edges
             into the background — the mark stops looking cut and starts
             looking printed on fog. A steeper falloff keeps the glow as a
             seat under the wordmark instead of a cloud around it. */
          float core = pow(smoothstep(0.44, 0.0, r), 3.4) * breathe;
          vec3 gold = vec3(0.46, 0.31, 0.11);
          vec3 emerald = vec3(0.07, 0.24, 0.16);
          vec3 col = mix(emerald, gold, smoothstep(0.30, 0.0, r));
          gl_FragColor = vec4(col * core * 0.34 * uFade, core * 0.34 * uFade);
        }
      `,
    }),
  );
  const haloGeo = track(new THREE.PlaneGeometry(LOGO_WIDTH * 1.35, (LOGO_WIDTH / LOGO_ASPECT) * 1.9));
  const halo = new THREE.Mesh(haloGeo, haloMat);
  halo.position.set(0, 0.1, -0.35);
  halo.renderOrder = -1;

  /* -------------------------------------------------- logo */
  // The wordmark is NOT part of `world`: its position and scale are driven by
  // a DOM anchor in the hero column, so type and mark can never collide no
  // matter the viewport. The atmosphere group keeps its own aspect fitting.
  const logoGroup = new THREE.Group();
  logoGroup.position.set(0, 0.62, 0);
  logoGroup.add(halo);

  const logoSourceLight = new THREE.PointLight(0xffc66a, BUGLASAN_HERO_LIGHTING.sourceIntensity, 12, 1.5);
  logoSourceLight.name = 'Buglasan Hero Upper Left Source';
  logoSourceLight.position.set(...BUGLASAN_HERO_LIGHTING.sourcePosition);
  logoSourceLight.layers.set(LAYER_OVERLAY);
  logoGroup.add(logoSourceLight);
  const logoAnchor = { x: 0, y: 0.62, scale: 1 };
  const parallax = { amount: 1 };

  const logoMaterials = new Set<THREE.Material>();
  const logoMaterialState = new Map<THREE.Material, { transparent: boolean; depthWrite: boolean; opacity: number }>();
  let logoModel: THREE.Group | null = null;
  let logoModelScale = 1;
  let quietMode = false;
  let disposed = false;
  const logoTextureAnisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());

  const disposeModelResources = (object: THREE.Object3D) => {
    const textures = new Set<THREE.Texture>();
    object.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh) return;

      mesh.geometry.dispose();
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const material of materials) {
        for (const value of Object.values(material)) {
          if (value instanceof THREE.Texture) textures.add(value);
        }
        material.dispose();
      }
    });
    for (const texture of textures) texture.dispose();
  };

  const logoReady = new Promise<boolean>((resolve) => {
    new GLTFLoader().load(
      BUGLASAN_HERO_MODEL_SRC,
      (gltf) => {
        if (disposed) {
          disposeModelResources(gltf.scene);
          resolve(false);
          return;
        }

        try {
          // GLTFLoader can omit Blender node names from optimized exports. The
          // supplied file keeps the intended logo as its first root node, with
          // the older backup meshes following it.
          const source = gltf.scene.getObjectByName('Buglasan Logo 3D') ?? gltf.scene.children[0];
          if (!source) throw new Error('Buglasan Logo 3D node is missing');

          gltf.scene.updateMatrixWorld(true);
          for (const child of gltf.scene.children) {
            if (child !== source) disposeModelResources(child);
          }
          source.parent?.remove(source);

          const bounds = new THREE.Box3().setFromObject(source);
          const center = bounds.getCenter(new THREE.Vector3());
          const size = bounds.getSize(new THREE.Vector3());

          const model = new THREE.Group();
          model.name = 'Buglasan Hero 3D';
          model.position.set(0, 0.1, 0.12);
          logoModelScale = LOGO_WIDTH / Math.max(size.x, 0.001);
          model.scale.setScalar(logoModelScale);
          model.layers.set(LAYER_OVERLAY);

          // Center the imported root with a wrapper. This keeps the GLB node's
          // authored transform intact while fitting the unchanged source into
          // the hero slot.
          const centeredSource = new THREE.Group();
          centeredSource.name = 'Buglasan Hero 3D Content';
          centeredSource.position.copy(center).multiplyScalar(-1);
          centeredSource.add(source);
          model.add(centeredSource);
          model.traverse((child) => {
            const mesh = child as THREE.Mesh;
            if (!mesh.isMesh) return;
            mesh.layers.set(LAYER_OVERLAY);
            mesh.castShadow = false;
            mesh.receiveShadow = false;
            const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            for (const material of materials) {
              logoMaterialState.set(material, {
                transparent: material.transparent,
                depthWrite: material.depthWrite,
                opacity: material.opacity,
              });

              const standardMaterial = material as THREE.MeshStandardMaterial;
              if (standardMaterial.map && standardMaterial.map.anisotropy < logoTextureAnisotropy) {
                standardMaterial.map.anisotropy = logoTextureAnisotropy;
                standardMaterial.map.needsUpdate = true;
              }
              if (standardMaterial.isMeshStandardMaterial) {
                standardMaterial.envMap = logoEnvMap;
                standardMaterial.envMapIntensity = BUGLASAN_HERO_FINISH.envMapIntensity;
                standardMaterial.roughness = BUGLASAN_HERO_FINISH.roughness;
                /* Metalness is the actual plastic/chrome switch, and it is a
                   fork in the shading model rather than a slider on one: a
                   dielectric keeps a diffuse layer and reflects white, which
                   is the definition of plastic, while a metal has no diffuse
                   at all and tints its reflections with the base colour.
                   Pushing it up turns the mark's own rainbow into the tint of
                   what it reflects — coloured chrome rather than a shiny
                   coloured object. Held just under 1 so a little diffuse
                   survives and the letterforms never go black where the
                   studio has nothing to give them. */
                standardMaterial.metalness = BUGLASAN_HERO_FINISH.metalness;

                // Clearcoat is the glass half: a second, smoother specular
                // lobe sitting over the metal, the way lacquer sits over
                // paint. MeshStandardMaterial has no such layer, so the
                // material is rebuilt as physical, carrying its maps across.
                const physical = new THREE.MeshPhysicalMaterial();
                /* Copy through the *standard* prototype, not the physical one.
                   MeshPhysicalMaterial.copy reads fields only a physical
                   material has — clearcoatNormalScale, sheenColor,
                   attenuationColor — and a MeshStandardMaterial source has
                   none of them, so it throws on the first Vector2 and the
                   whole model fails to load. The standard subset carries the
                   maps, colour, roughness and metalness across; the physical
                   extras keep their constructed defaults. */
                THREE.MeshStandardMaterial.prototype.copy.call(physical, standardMaterial);
                physical.clearcoat = BUGLASAN_HERO_FINISH.clearcoat;
                physical.clearcoatRoughness = BUGLASAN_HERO_FINISH.clearcoatRoughness;
                physical.needsUpdate = true;
                track(physical);

                logoMaterialState.set(physical, {
                  transparent: physical.transparent,
                  depthWrite: physical.depthWrite,
                  opacity: physical.opacity,
                });
                addSheen(physical);
                logoMaterials.add(physical);

                if (Array.isArray(mesh.material)) {
                  const idx = mesh.material.indexOf(material);
                  if (idx >= 0) mesh.material[idx] = physical;
                } else {
                  mesh.material = physical;
                }
                continue;
              }
              addSheen(material);

              logoMaterials.add(material);
            }
          });

          logoModel = model;
          logoGroup.add(model);
          resolve(true);
        } catch (error) {
          console.warn('Unable to prepare the Buglasan hero model.', error);
          disposeModelResources(gltf.scene);
          resolve(false);
        }
      },
      (event) => {
        // Progress is only honest when the server sends a length; otherwise
        // report indeterminate rather than inventing a number.
        if (event.lengthComputable && event.total > 0) {
          quality.onLogoProgress?.(Math.min(1, event.loaded / event.total));
        }
      },
      (error) => {
        console.warn('Unable to load the Buglasan hero model.', error);
        resolve(false);
      },
    );
  });

  /* An environment for the wordmark to reflect.
     
     This is the main reason the mark read as dull: the GLB ships physical
     materials, and a physical material with nothing to reflect resolves to
     flat diffuse shading no matter how many lights you point at it. A tiny
     procedural sky — warm above, forest below, one bright quadrant where the
     key light sits — costs one 64x32 texture and gives every curved surface
     something to pick up. */
  const buildLogoEnvironment = () => {
    /* A small studio, not a gradient.
       
       Authored in linear float rather than 8-bit so the softboxes can sit
       well above 1.0 — that headroom is what makes a reflection read as a
       light source rather than a pale patch. Three features do the work:
       a hard horizon, a few bright vertical strips to streak across the
       curves, and a dark floor for them to sit against. */
    const w = 256;
    const h = 128;
    const data = new Float32Array(w * h * 4);

    // Warm key, neutral fill, cool kicker. Uneven spacing and width, or the
    // reflections repeat and read as a pattern.
    const boxes = [
      { u: 0.13, halfW: 0.055, top: 0.06, bot: 0.46, rgb: [9.0, 7.4, 5.2] },
      { u: 0.42, halfW: 0.028, top: 0.12, bot: 0.40, rgb: [6.2, 6.4, 6.8] },
      { u: 0.71, halfW: 0.042, top: 0.04, bot: 0.34, rgb: [4.4, 6.0, 9.5] },
      { u: 0.93, halfW: 0.018, top: 0.16, bot: 0.30, rgb: [7.0, 5.4, 3.0] },
    ];

    for (let y = 0; y < h; y++) {
      const v = y / (h - 1);
      for (let x = 0; x < w; x++) {
        const u = x / (w - 1);
        let r: number;
        let g: number;
        let b: number;

        if (v < 0.5) {
          // Sky: brightening toward the horizon, warm one side, cool the other.
          const t = v / 0.5;
          const lift = 0.18 + t * 0.5;
          r = lift * (0.9 + 0.35 * (1 - u));
          g = lift * 0.96;
          b = lift * (0.9 + 0.4 * u);
        } else {
          // Floor: dark, with a short bounce just under the horizon.
          const t = (v - 0.5) / 0.5;
          const bounce = Math.exp(-t * 9) * 0.5;
          const base = 0.028 + bounce;
          r = base * 1.0;
          g = base * 1.12;
          b = base * 0.92;
        }

        // The horizon itself — a hard bright line. This single edge is the
        // most recognisable chrome cue there is; without it a mirror surface
        // has nothing to sweep across it as the object turns.
        const horizon = Math.exp(-Math.pow((v - 0.5) * 150, 2));
        r += horizon * 2.4;
        g += horizon * 2.5;
        b += horizon * 2.6;

        for (const box of boxes) {
          // Wrap the azimuth so a box near u=1 does not get clipped.
          let du = Math.abs(u - box.u);
          du = Math.min(du, 1 - du);
          const across = Math.exp(-Math.pow(du / box.halfW, 6));
          const down =
            Math.min(1, Math.max(0, (v - box.top) / 0.03)) *
            Math.min(1, Math.max(0, (box.bot - v) / 0.06));
          const k = across * down;
          r += box.rgb[0] * k;
          g += box.rgb[1] * k;
          b += box.rgb[2] * k;
        }

        const i = (y * w + x) * 4;
        data[i] = r;
        data[i + 1] = g;
        data[i + 2] = b;
        data[i + 3] = 1;
      }
    }

    const equirect = new THREE.DataTexture(data, w, h, THREE.RGBAFormat, THREE.FloatType);
    equirect.mapping = THREE.EquirectangularReflectionMapping;
    equirect.needsUpdate = true;

    const pmrem = new THREE.PMREMGenerator(renderer);
    const target = pmrem.fromEquirectangular(equirect);
    pmrem.dispose();
    equirect.dispose();
    track(target.texture);
    return target.texture;
  };

  const logoEnvMap = buildLogoEnvironment();

  /* Shared uniforms for the sheen injected into every logo material. One
     object, so the whole mark sweeps as a single surface rather than each
     mesh running its own highlight. */
  const sheenUniforms = {
    uSheenTime: { value: 0 as number },
    uSheenDir: { value: new THREE.Vector2(-0.6, 0.8) },
    uSheenPos: { value: 0 as number },
    uSheenAmt: { value: BUGLASAN_HERO_SHEEN.sheen as number },
    uSheenGlint: { value: BUGLASAN_HERO_SHEEN.glint as number },
    uSheenRim: { value: BUGLASAN_HERO_SHEEN.rim as number },
  };

  /**
   * Add a travelling specular band and a fresnel rim on top of the model's
   * own shading.
   *
   * Done through onBeforeCompile rather than by swapping in a custom
   * ShaderMaterial: the GLB carries its own base-colour and normal maps, and
   * replacing the material wholesale would throw that artwork away. This
   * keeps all of it and adds gloss to the result.
   */
  const addSheen = (material: THREE.Material) => {
    material.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, sheenUniforms);
      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>
           uniform float uSheenTime;
           uniform vec2  uSheenDir;
           uniform float uSheenPos;
           uniform float uSheenAmt;
           uniform float uSheenGlint;
           uniform float uSheenRim;`,
        )
        .replace(
          '#include <opaque_fragment>',
          `{
             vec3 sn = normalize(vNormal);
             vec3 sv = normalize(vViewPosition);
             float ndv = clamp(dot(sn, sv), 0.0, 1.0);

             // Rim confined to the actual silhouette. A low exponent spreads
             // it into an all-over haze, which flattens the form instead of
             // describing it.
             float rim = pow(1.0 - ndv, 5.0);

             float axis = dot(sn.xy, normalize(uSheenDir));
             float d = axis - uSheenPos;

             // Two specular orders, the way a polished surface actually
             // behaves: a broad soft sheen with a tight bright glint riding
             // inside it. One wide band on its own reads as a wash.
             float sheen = exp(-d * d * ${BUGLASAN_HERO_SHEEN.sheenFalloff.toFixed(1)});
             float glint = exp(-d * d * ${BUGLASAN_HERO_SHEEN.glintFalloff.toFixed(1)});

             // Tint the highlight with the surface's own colour.
             //
             // This is the whole difference between metal and plastic, and it
             // is a physical one: a dielectric reflects white regardless of
             // what colour it is, which is why a white highlight sitting on
             // top of colour reads as cheap moulded plastic every time.
             // Metals and lacquers tint their reflections. Carrying the
             // albedo into the specular keeps the brush colours saturated
             // through the highlight instead of bleaching them out.
             vec3 warm = vec3(1.00, 0.95, 0.86);
             vec3 cool = vec3(0.88, 0.93, 1.00);
             vec3 spec = mix(warm, cool, clamp(d * 1.6 + 0.5, 0.0, 1.0));
             spec = mix(spec, spec * diffuseColor.rgb * 1.8, ${BUGLASAN_HERO_SHEEN.tint.toFixed(2)});

             vec3 add = spec * (sheen * uSheenAmt + glint * uSheenGlint)
                      + spec * rim * uSheenRim;

             // Roll off rather than clip. Adding straight into outgoingLight
             // drives the bright strokes past 1.0, where every hue lands on
             // the same flat white and the mark loses its own colour exactly
             // where it is meant to look richest.
             outgoingLight += add / (1.0 + add);
           }
           #include <opaque_fragment>`,
        );
    };
    material.needsUpdate = true;
  };

  const logoAmbientLight = new THREE.HemisphereLight(0xd8ffe7, 0x04100a, BUGLASAN_HERO_LIGHTING.ambientIntensity);
  logoAmbientLight.layers.set(LAYER_OVERLAY);
  const logoKeyLight = new THREE.DirectionalLight(0xffc15f, BUGLASAN_HERO_LIGHTING.keyIntensity);
  logoKeyLight.position.set(-3.8, 5.4, 6.0);
  logoKeyLight.target.position.set(0, 0, 0);
  logoKeyLight.layers.set(LAYER_OVERLAY);
  logoKeyLight.target.layers.set(LAYER_OVERLAY);
  const logoFrontLight = new THREE.SpotLight(0xfff0c1, BUGLASAN_HERO_LIGHTING.frontIntensity, 20, Math.PI / 3, 0.8, 1.25);
  logoFrontLight.position.set(0.3, 2.5, 6.5);
  logoFrontLight.target.position.set(0, 0.1, 0);
  logoFrontLight.layers.set(LAYER_OVERLAY);
  logoFrontLight.target.layers.set(LAYER_OVERLAY);
  const logoRimLight = new THREE.PointLight(0x66bfff, BUGLASAN_HERO_LIGHTING.rimIntensity, 18, 2);
  logoRimLight.position.set(3.7, -1.2, 4.0);
  logoRimLight.layers.set(LAYER_OVERLAY);
  scene.add(logoAmbientLight, logoKeyLight, logoKeyLight.target, logoFrontLight, logoFrontLight.target, logoRimLight);
  scene.add(logoGroup);

  /* -------------------------------------------------- floating orbs */
  const orbCount = quality.lowPower ? 22 : 90;
  const orbPositions = new Float32Array(orbCount * 3);
  const orbScales = new Float32Array(orbCount);
  const orbPhases = new Float32Array(orbCount);

  for (let i = 0; i < orbCount; i += 1) {
    const radius = 2 + Math.random() * 6.5;
    const theta = Math.random() * Math.PI * 2;
    const phi = (Math.random() - 0.5) * Math.PI * 0.85;
    orbPositions[i * 3] = radius * Math.cos(theta) * Math.cos(phi);
    orbPositions[i * 3 + 1] = radius * Math.sin(phi);
    orbPositions[i * 3 + 2] = radius * Math.sin(theta) * Math.cos(phi) - 0.5;
    orbScales[i] = 2.8 + Math.random() * 4.2;
    orbPhases[i] = Math.random() * Math.PI * 2;
  }

  const orbGeometry = track(new THREE.BufferGeometry());
  orbGeometry.setAttribute('position', new THREE.BufferAttribute(orbPositions, 3));
  orbGeometry.setAttribute('aScale', new THREE.BufferAttribute(orbScales, 1));
  orbGeometry.setAttribute('aPhase', new THREE.BufferAttribute(orbPhases, 1));

  const orbUniforms = {
    uTime: { value: 0 },
    uMouse: { value: new THREE.Vector2(0, 0) },
    uPixelRatio: { value: 1 },
  };
  const orbMaterial = track(
    new THREE.ShaderMaterial({
      vertexShader: floatingOrbVertexShader,
      fragmentShader: floatingOrbFragmentShader,
      uniforms: orbUniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  const orbParticles = new THREE.Points(orbGeometry, orbMaterial);
  world.add(orbParticles);

  /* -------------------------------------------------- anchored sparkles */
  const sparkleLayout = quality.lowPower
    ? BUGLASAN_SPARKLE_LAYOUT.filter((_, index) => index % 2 === 0)
    : BUGLASAN_SPARKLE_LAYOUT;
  const particleCount = sparkleLayout.length;
  const positions = new Float32Array(particleCount * 3);
  const scales = new Float32Array(particleCount);
  const phases = new Float32Array(particleCount);

  for (let i = 0; i < particleCount; i += 1) {
    const sparkle = sparkleLayout[i];
    positions[i * 3] = sparkle.position[0];
    positions[i * 3 + 1] = sparkle.position[1];
    positions[i * 3 + 2] = sparkle.position[2];
    scales[i] = sparkle.scale;
    phases[i] = sparkle.phase;
  }

  const particleGeometry = track(new THREE.BufferGeometry());
  particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  particleGeometry.setAttribute('aScale', new THREE.BufferAttribute(scales, 1));
  particleGeometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));

  const particleUniforms = {
    uTime: { value: 0 },
    uPixelRatio: { value: 1 },
  };
  const particleMaterial = track(
    new THREE.ShaderMaterial({
      vertexShader: particleVertexShader,
      fragmentShader: particleFragmentShader,
      uniforms: particleUniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  const sparkles = new THREE.Points(particleGeometry, particleMaterial);
  world.add(sparkles);

  /* -------------------------------------------------- intro */
  // The wordmark's resting state is its default. The entrance only ever runs
  // when the document is actually being painted: GSAP's ticker is driven by
  // rAF, so starting the mark at scale 0.001 and tweening up would leave it
  // invisible for anything rendering a hidden document (background tab,
  // prerender, headless capture).
  let introTimeline: gsap.core.Timeline | null = null;

  const playIntro = () => {
    if (quality.reducedMotion || introTimeline || !logoModel) return;

    logoModel.scale.setScalar(logoModelScale * 0.001);
    logoModel.position.set(0, -0.8, -2.5);
    logoModel.rotation.set(0.25, 0.35, -0.1);
    halo.scale.set(0.4, 0.4, 0.4);

    introTimeline = gsap
      .timeline({ delay: 0.12 })
      .to(logoModel.scale, { x: logoModelScale, y: logoModelScale, z: logoModelScale, duration: 1.2, ease: 'back.out(1.6)' }, 0)
      .to(logoModel.position, { x: 0, y: 0.1, z: 0.12, duration: 1.3, ease: 'power3.out' }, 0)
      .to(logoModel.rotation, { x: 0, y: 0, z: 0, duration: 1.3, ease: 'power2.out' }, 0)
      .to(halo.scale, { x: 1, y: 1, z: 1, duration: 1.6, ease: 'power2.out' }, 0.1);
  };

  logoReady.then((loaded) => {
    if (loaded && typeof document !== 'undefined' && document.visibilityState === 'visible') playIntro();
  });

  const onVisible = () => {
    if (document.visibilityState !== 'visible') return;
    document.removeEventListener('visibilitychange', onVisible);
    playIntro();
  };

  if (typeof document !== 'undefined') {
    if (document.visibilityState === 'visible') playIntro();
    else document.addEventListener('visibilitychange', onVisible);
  }

  /**
   * Drive the hero-to-header flight.
   *
   * `dock` is 0 in the hero and 1 once the mark has landed in the header
   * slot. `handoff` is how much of the mark the DOM copy has taken over —
   * the canvas sits behind the opaque chapters, so the last stretch of the
   * flight cross-fades to a real <img> that can layer above them.
   */
  const setWordmarkDock = (dock: number, handoff: number) => {
    const opacity = Math.min(1, Math.max(0, 1 - handoff));
    for (const material of logoMaterials) {
      const authored = logoMaterialState.get(material);
      if (!authored) continue;

      // Leave the source render state untouched in the hero. Only switch to
      // a transparent pass while the canvas mark is actually fading to the
      // DOM fallback during the existing handoff.
      const isFading = opacity < 0.999999;
      const transparent = isFading || authored.transparent;
      const depthWrite = isFading ? false : authored.depthWrite;
      if (material.transparent !== transparent || material.depthWrite !== depthWrite) {
        material.transparent = transparent;
        material.depthWrite = depthWrite;
        material.needsUpdate = true;
      }
      material.opacity = authored.opacity * opacity;
    }
    logoGroup.visible = !quietMode && opacity > 0.01;
    // A halo sized for the hero would swamp a 130px header mark.
    haloMat.uniforms.uFade.value = Math.max(0, 1 - dock * 1.6);
    parallax.amount = 1 - dock;
  };

  /** Seat the wordmark on a world-space rect measured from the hero rect. */
  const placeWordmark = (x: number, y: number, worldWidth: number) => {
    logoAnchor.x = x;
    logoAnchor.y = y;
    logoAnchor.scale = Math.max(0.05, worldWidth / LOGO_WIDTH);
    logoGroup.scale.setScalar(logoAnchor.scale);
  };

  const triggerBurst = () => {
    if (quality.reducedMotion || !logoModel) return;
    gsap.fromTo(
      logoModel.scale,
      { x: logoModelScale * 1.05, y: logoModelScale * 1.05, z: logoModelScale * 1.05 },
      { x: logoModelScale, y: logoModelScale, z: logoModelScale, duration: 0.6, ease: 'back.out(2)', overwrite: 'auto' },
    );
  };

  const torchPos = new THREE.Vector2();

  const update = (
    elapsed: number,
    mouse: THREE.Vector2,
    pixelRatio: number,
    torch = 0,
    quiet = false,
    /** 0..1, eased — the pointer is over the wordmark itself. */
    markHover = 0,
  ) => {
    quietMode = quiet;
    backdropUniforms.uTime.value = elapsed;
    backdropUniforms.uMouse.value.copy(mouse);

    const showDecorativeAtmosphere = !quiet;
    fireworks.visible = showDecorativeAtmosphere;
    for (const item of landmarkMeshes) item.mesh.visible = showDecorativeAtmosphere;
    logoGroup.visible = !quiet;

    // The landmarks live inside `world`, which fitWorld() scales and lifts to
    // suit the viewport. Put the torch through the same transform or the pool
    // of light sits off the cursor on every aspect but one.
    torchPos.set(mouse.x * 9.5 * world.scale.x, mouse.y * 5.0 * world.scale.y + world.position.y);

    if (showDecorativeAtmosphere) {
      for (const mat of landmarkMats) {
        mat.uniforms.uTime.value = elapsed;
        mat.uniforms.uMouse.value.copy(mouse);
        mat.uniforms.uTorch.value = torch;
        mat.uniforms.uTorchPos.value.copy(torchPos);
        // The mark moves with the pointer and the dock, so the keep-out
        // tracks it rather than sitting at a fixed point.
        mat.uniforms.uKeepOut.value.set(
          logoGroup.position.x,
          logoGroup.position.y,
          LOGO_WIDTH * 0.62 * logoAnchor.scale,
        );
      }
      for (const item of landmarkMeshes) {
        item.mesh.position.y = item.initialY + Math.sin(elapsed * 0.7 + item.driftPhase) * 0.06;
      }
    }

    if (showDecorativeAtmosphere) {
      fireworksUniforms.uTime.value = elapsed;
      fireworksUniforms.uMouse.value.copy(mouse);
    }
    haloUniforms.uTime.value = elapsed;

    /* ---------------------------------------------------- hero lighting
       Where there is a cursor, the light is the cursor: the key, rim and
       source lamps swing across the mark so highlights actually travel over
       the letterforms instead of sitting in one baked position.

       Where there is no cursor — every tablet and phone — the same rig
       orbits on its own, so the mark still turns in the light rather than
       going static. That is the whole difference between a 3D object and a
       picture of one. Reduced-motion holds it at a flattering angle and
       stops it moving. */
    const autoLight = !canHover || quality.reducedMotion;
    let lightX: number;
    let lightY: number;

    if (autoLight) {
      if (quality.reducedMotion) {
        lightX = -0.45;
        lightY = 0.4;
      } else {
        const a = elapsed * BUGLASAN_HERO_SHEEN.autoOrbit;
        // A wide, slow ellipse — wider than tall, because the mark is wide.
        lightX = Math.cos(a);
        lightY = 0.45 * Math.sin(a * 1.3);
      }
    } else {
      lightX = mouse.x;
      lightY = mouse.y;
    }

    const travel = BUGLASAN_HERO_SHEEN.lightTravel;
    logoKeyLight.position.set(-3.8 + lightX * travel, 5.4 + lightY * travel * 0.42, 6.0);
    logoRimLight.position.set(3.7 - lightX * travel * 0.8, -1.2 + lightY * travel * 0.5, 4.0);
    logoSourceLight.position.set(
      BUGLASAN_HERO_LIGHTING.sourcePosition[0] + lightX * travel * 0.5,
      BUGLASAN_HERO_LIGHTING.sourcePosition[1] + lightY * travel * 0.35,
      BUGLASAN_HERO_LIGHTING.sourcePosition[2],
    );

    logoFrontLight.position.x = lightX * 0.55;
    logoFrontLight.position.y = 2.2 + lightY * 0.28;
    logoFrontLight.target.position.x = lightX * 0.18;

    // The shader band rides the same axis as the lamps, so the painted
    // highlight and the lit geometry agree instead of crossing each other.
    sheenUniforms.uSheenTime.value = elapsed;
    sheenUniforms.uSheenDir.value.set(lightX || 0.001, lightY + 0.55);
    sheenUniforms.uSheenPos.value = autoLight && !quality.reducedMotion
      ? Math.sin(elapsed * BUGLASAN_HERO_SHEEN.autoOrbit * 1.6) * 0.85
      : lightX * 0.85;
    // Quiet mode is the docked header mark; gloss there is just noise.
    /* Hovering the mark itself is a second, closer register than the
       page-wide tilt: the light gathers, the edge picks out, and the mark
       leans in a little. Kept multiplicative on the same three values so the
       hover state can never look like a different material — it is the same
       surface catching more of the same light. */
    const lean = 1 + markHover;
    sheenUniforms.uSheenAmt.value = quiet ? 0 : BUGLASAN_HERO_SHEEN.sheen * lean;
    sheenUniforms.uSheenGlint.value = quiet ? 0 : BUGLASAN_HERO_SHEEN.glint * (1 + markHover * 1.5);
    sheenUniforms.uSheenRim.value = quiet ? 0 : BUGLASAN_HERO_SHEEN.rim * (1 + markHover * 1.35);

    orbUniforms.uTime.value = elapsed;
    orbUniforms.uMouse.value.copy(mouse);
    orbUniforms.uPixelRatio.value = pixelRatio;
    particleUniforms.uTime.value = elapsed;
    particleUniforms.uPixelRatio.value = pixelRatio;

    const tilt = 1 + markHover * 0.42;
    logoGroup.rotation.y = (mouse.x * 0.36 * tilt + Math.sin(elapsed * 0.4) * 0.03) * parallax.amount;
    logoGroup.rotation.x = (-mouse.y * 0.26 * tilt + Math.cos(elapsed * 0.3) * 0.02) * parallax.amount;
    logoGroup.scale.setScalar(logoAnchor.scale * (1 + markHover * 0.021));
    // Pointer drift belongs to the hero; a docked header mark must sit still.
    const drift = parallax.amount * logoAnchor.scale;
    logoGroup.position.x = logoAnchor.x + mouse.x * 0.34 * drift;
    logoGroup.position.y = logoAnchor.y + mouse.y * 0.1 * drift;
    logoGroup.position.z = Math.sin(elapsed * 1.2) * 0.08 * parallax.amount;

    orbParticles.rotation.y = elapsed * 0.06;

  };

  const dispose = () => {
    disposed = true;
    document.removeEventListener('visibilitychange', onVisible);
    introTimeline?.kill();
    if (logoModel) {
      gsap.killTweensOf([logoModel.scale, logoModel.position, logoModel.rotation]);
      disposeModelResources(logoModel);
    }
    gsap.killTweensOf([halo.scale, world.scale, world.position]);
    scene.remove(
      logoAmbientLight,
      logoKeyLight,
      logoKeyLight.target,
      logoFrontLight,
      logoFrontLight.target,
      logoRimLight,
      logoGroup,
    );
    for (const item of disposables) item.dispose();
  };

  return { world, logoGroup, logoReady, update, triggerBurst, placeWordmark, setWordmarkDock, lockBackdropToCamera, dispose };
}
