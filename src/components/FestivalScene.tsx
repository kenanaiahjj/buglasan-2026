import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import * as THREE from 'three';
import gsap from 'gsap';
import { BUGLASAN_HERO_LOGO } from '../data/pageant';
import { interpolateCamera, type CameraStop } from '../scene/landingSceneMath';
import { buildFestivalWorld, LAYER_ATMOSPHERE, LAYER_OVERLAY } from '../scene/festivalWorld';
import { PostPipeline } from '../scene/postPipeline';
import {
  getRenderPixelRatios,
  TIER_SCENE_SCALE,
  type RenderQualityTier,
} from '../scene/renderQuality';

const CAMERA_STOPS: CameraStop[] = [
  { position: [0, 0.4, 8.4], target: [0, 0.0, 0], fov: 38 },
  { position: [0, -1.2, 9.8], target: [0, -0.6, -1.0], fov: 40 },
  { position: [0, -2.5, 11.2], target: [0, -1.2, -2.0], fov: 42 },
];

type Tier = RenderQualityTier;
const TIER_ORDER: Tier[] = ['low', 'medium', 'high'];

/** MSAA applies to the final framebuffer where the crisp GLB overlay is drawn. */
export const FESTIVAL_RENDERER_OPTIONS = {
  alpha: false,
  antialias: true,
  powerPreference: 'high-performance' as const,
  stencil: false,
} as const;

/** Frame budget before the scene steps itself down a tier. */
const SLOW_FRAME_MS = 21;
const FAST_FRAME_MS = 11;

export function FestivalScene({ progressRef, quiet = false }: { progressRef: RefObject<number>; quiet?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const quietRef = useRef(quiet);
  const [sceneReady, setSceneReady] = useState(false);
  const [bootProgress, setBootProgress] = useState(0);
  quietRef.current = quiet;

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = hostRef.current;
    if (!canvas || !host) return undefined;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const finePointer = window.matchMedia('(pointer: fine)').matches;
    const lowPower = window.innerWidth < 780 || (navigator.hardwareConcurrency ?? 8) <= 4;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        ...FESTIVAL_RENDERER_OPTIONS,
        canvas,
      });
    } catch {
      return undefined;
    }

    // Grading happens in PostPipeline's composite step. The renderer only has
    // to encode the wordmark overlay, which is drawn after that.
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.setClearColor(0x000000, 1);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 120);

    const stage = buildFestivalWorld(scene, renderer, {
      lowPower,
      reducedMotion,
      onLogoProgress: setBootProgress,
    });
    const post = new PostPipeline(renderer);

    let tier: Tier = lowPower ? 'low' : 'high';
    post.setQuality(tier);

    let active = true;
    let animationFrame = 0;
    let visible = true;
    let heroInView = true;
    let smoothProgress = progressRef.current ?? 0;
    let currentPixelRatio = 1;
    let currentScenePixelRatio = 1;
    let viewWidth = 1;
    let viewHeight = 1;
    let logoLoaded = false;

    const pointerState = { x: 0, y: 0, torch: 0, mark: 0 };

    /* ---------------------------------------------- sizing */
    const applySize = () => {
      viewWidth = Math.max(1, host.clientWidth);
      viewHeight = Math.max(1, host.clientHeight);
      const ratios = getRenderPixelRatios(window.devicePixelRatio || 1, tier);
      currentPixelRatio = ratios.overlay;
      currentScenePixelRatio = ratios.scene;

      renderer.setPixelRatio(currentPixelRatio);
      renderer.setSize(viewWidth, viewHeight, false);
      post.setSize(viewWidth, viewHeight, currentScenePixelRatio, TIER_SCENE_SCALE[tier]);

      camera.aspect = viewWidth / viewHeight;
      camera.updateProjectionMatrix();
    };

    const fitWorld = () => {
      const aspect = viewWidth / viewHeight;
      let targetScale: number;
      let targetPosY: number;

      if (aspect < 0.7) {
        targetScale = Math.max(0.48, Math.min(0.62, aspect * 0.85));
        targetPosY = 0.75;
      } else if (aspect < 1.05) {
        targetScale = Math.max(0.62, Math.min(0.78, aspect * 0.75));
        targetPosY = 0.55;
      } else if (aspect < 1.45) {
        targetScale = Math.max(0.78, Math.min(0.92, aspect * 0.62));
        targetPosY = 0.42;
      } else {
        targetScale = Math.min(1.08, Math.max(0.92, aspect * 0.56));
        targetPosY = 0.35;
      }

      if (reducedMotion || document.visibilityState !== 'visible') {
        stage.world.scale.setScalar(targetScale);
        stage.world.position.y = targetPosY;
        return;
      }
      gsap.to(stage.world.scale, { x: targetScale, y: targetScale, z: targetScale, duration: 0.5, ease: 'power2.out', overwrite: 'auto' });
      gsap.to(stage.world.position, { y: targetPosY, duration: 0.5, ease: 'power2.out', overwrite: 'auto' });
    };

    /**
     * Seat the wordmark on the rect the hero column reserves for it.
     *
     * The mark lives in world space but the layout that must not collide with
     * it lives in the DOM, so the DOM is the source of truth: measure the
     * reserved box, unproject it onto the z=0 plane at the hero camera stop,
     * and hand the scene a position and width.
     */
    /**
     * The wordmark's flight path, in screen space.
     *
     * `[data-scene-anchor]` is the box the hero column holds open for it;
     * `[data-scene-dock]` is the header slot it flies into as the hero
     * scrolls away. Both are measured from the DOM so type and mark can never
     * collide, and the two rects are blended before a single unprojection —
     * blending on screen and projecting once gives a natural arc, and costs
     * three vector ops a frame.
     */
    // The landing layout is replaced by a subpage while this fixed scene
    // stays mounted. Resolve these elements during measurement so returning
    // to the landing page can attach to the new DOM nodes.
    let anchorEl: HTMLElement | null = null;
    let dockEl: HTMLElement | null = null;

    const MARK_ASPECT = BUGLASAN_HERO_LOGO.width / BUGLASAN_HERO_LOGO.height;
    type Box = { cx: number; cy: number; w: number; h: number };
    const heroBox: Box = { cx: 0, cy: 0, w: 0, h: 0 };
    const dockBox: Box = { cx: 0, cy: 0, w: 0, h: 0 };
    let haveBoxes = false;

    const readBox = (el: HTMLElement | null, into: Box) => {
      if (!el) return false;
      const rect = el.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) return false;
      into.cx = rect.left + rect.width / 2;
      into.cy = rect.top + rect.height / 2;
      into.w = rect.width;
      into.h = rect.height;
      return true;
    };

    const measureWordmarkBoxes = () => {
      anchorEl = document.querySelector<HTMLElement>('[data-scene-anchor]');
      dockEl = document.querySelector<HTMLElement>('[data-scene-dock]');
      // The hero box scrolls with the page; measure it at scroll 0 so the
      // flight is expressed against a stable frame.
      const heroOk = readBox(anchorEl, heroBox);
      if (heroOk) heroBox.cy += window.scrollY;
      haveBoxes = heroOk && readBox(dockEl, dockBox);
    };

    const origin = new THREE.Vector3();
    const hit = new THREE.Vector3();
    const centre = new THREE.Vector3();

    /** Where does the ray through this viewport point cross the z=0 plane? */
    const unprojectToStage = (clientX: number, clientY: number, out: THREE.Vector3) => {
      out.set((clientX / viewWidth) * 2 - 1, 1 - (clientY / viewHeight) * 2, 0.5).unproject(camera);
      out.sub(origin);
      out.multiplyScalar(-origin.z / out.z).add(origin);
      return out;
    };

    const layoutWordmark = (dock: number) => {
      if (!haveBoxes) return;

      const cx = heroBox.cx + (dockBox.cx - heroBox.cx) * dock;
      const cy = (heroBox.cy - window.scrollY) + (dockBox.cy - (heroBox.cy - window.scrollY)) * dock;
      const w = heroBox.w + (dockBox.w - heroBox.w) * dock;
      const h = heroBox.h + (dockBox.h - heroBox.h) * dock;

      origin.copy(camera.position);
      centre.copy(unprojectToStage(cx, cy, hit));
      const edge = unprojectToStage(cx + w / 2, cy, hit);
      const boxWidth = Math.abs(edge.x - centre.x) * 2;
      const top = unprojectToStage(cx, cy - h / 2, hit);
      const boxHeight = Math.abs(top.y - centre.y) * 2;

      // Fit inside the box on whichever axis binds first.
      stage.placeWordmark(centre.x, centre.y, Math.min(boxWidth, boxHeight * MARK_ASPECT));
    };

    const resize = () => {
      applySize();
      fitWorld();
      measureWordmarkBoxes();
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);
    resize();
    stage.logoReady.then((loaded) => {
      logoLoaded = loaded;
      if (loaded && active) setSceneReady(true);
    });

    /* ---------------------------------------------- pointer */
    const quickPointerX = gsap.quickTo(pointerState, 'x', { duration: 0.6, ease: 'power2.out' });
    const quickPointerY = gsap.quickTo(pointerState, 'y', { duration: 0.6, ease: 'power2.out' });

    /* The skyline starts dark and is lit only where the cursor is. `torch`
       ramps up on the first real pointer move and drops back when the pointer
       leaves the window or the tab loses focus, so an idle page never sits
       there showing the whole drawing. Coarse-pointer devices have no hover
       to give, so they keep the resting wash and never light the torch. */
    const quickTorch = gsap.quickTo(pointerState, 'torch', { duration: 0.55, ease: 'power2.out' });

    /* Is the pointer over the wordmark itself?
       
       Tested against the hero anchor box rather than by raycasting the model:
       the mark is placed from that box every frame, so the box is exactly
       where it is, and a rect test costs nothing next to a raycast through
       an 8MB mesh on every pointer move. Padded slightly so the reaction
       starts just before the cursor crosses the glyphs. */
    const quickMark = gsap.quickTo(pointerState, 'mark', { duration: 0.4, ease: 'power2.out' });
    const overWordmark = (clientX: number, clientY: number) => {
      if (!haveBoxes || lastHandoff > 0.35) return false;
      const cy = heroBox.cy - window.scrollY;
      return (
        Math.abs(clientX - heroBox.cx) < heroBox.w * 0.56 &&
        Math.abs(clientY - cy) < heroBox.h * 0.62
      );
    };

    const onPointerMove = (event: PointerEvent) => {
      quickPointerX((event.clientX / window.innerWidth - 0.5) * 2);
      quickPointerY(-(event.clientY / window.innerHeight - 0.5) * 2);
      if (event.pointerType !== 'touch') {
        quickTorch(1);
        quickMark(overWordmark(event.clientX, event.clientY) ? 1 : 0);
      }
    };
    const onPointerDown = () => stage.triggerBurst();
    const dimTorch = () => {
      quickTorch(0);
      quickMark(0);
    };
    // relatedTarget null means the pointer left the window rather than moving
    // between elements inside it.
    const onPointerOut = (event: PointerEvent) => {
      if (!event.relatedTarget) dimTorch();
    };
    const onVisibility = () => {
      if (document.visibilityState !== 'visible') gsap.set(pointerState, { torch: 0 });
    };

    if (finePointer && !reducedMotion) {
      window.addEventListener('pointermove', onPointerMove, { passive: true });
      window.addEventListener('pointerdown', onPointerDown, { passive: true });
      window.addEventListener('pointerout', onPointerOut, { passive: true });
      window.addEventListener('blur', dimTorch);
      document.addEventListener('visibilitychange', onVisibility);
    }

    /* ---------------------------------------------- adaptive quality */
    let sampleCount = 0;
    let sampleTotal = 0;
    let lastTierChange = 0;

    const considerTierChange = (now: number, frameMs: number) => {
      sampleTotal += frameMs;
      sampleCount += 1;
      if (sampleCount < 45) return;

      const average = sampleTotal / sampleCount;
      sampleCount = 0;
      sampleTotal = 0;

      // Give each change a second to settle before judging the next one.
      if (now - lastTierChange < 1000) return;

      const index = TIER_ORDER.indexOf(tier);
      if (average > SLOW_FRAME_MS && index > 0) {
        tier = TIER_ORDER[index - 1];
      } else if (average < FAST_FRAME_MS && index < TIER_ORDER.length - 1 && !lowPower) {
        tier = TIER_ORDER[index + 1];
      } else {
        return;
      }

      lastTierChange = now;
      post.setQuality(tier);
      applySize();
    };

    /* ---------------------------------------------- frame */
    const mouseVec = new THREE.Vector2(0, 0);
    let previousTime = 0;
    let lastDrawn = 0;
    let dockProgress = -1;
    let lastHandoff = -1;

    const renderFrame = (time: number) => {
      if (!active) return;
      animationFrame = window.requestAnimationFrame(renderFrame);
      if (!visible) return;

      // Once the hero has scrolled away the canvas is behind opaque chapters
      // and the wordmark has handed off to the DOM; keep the scene alive for
      // the scrub, but at a fraction of the frame rate.
      if (!heroInView && time - lastDrawn < 66) return;
      lastDrawn = time;

      const frameMs = previousTime ? time - previousTime : 16;
      previousTime = time;
      if (heroInView) considerTierChange(time, frameMs);

      const targetProgress = reducedMotion ? 0 : progressRef.current ?? 0;
      smoothProgress += (targetProgress - smoothProgress) * (reducedMotion ? 1 : 0.065);

      mouseVec.set(pointerState.x, pointerState.y);

      const rig = interpolateCamera(CAMERA_STOPS, smoothProgress);
      const tallFrame = Math.max(0, 1.15 - camera.aspect);

      camera.position.set(
        rig.position[0] + pointerState.x * 0.32,
        rig.position[1] + pointerState.y * 0.18 + tallFrame * 0.5,
        rig.position[2] + tallFrame * 3.4,
      );
      camera.fov = rig.fov + tallFrame * 4;
      camera.lookAt(
        rig.target[0] + pointerState.x * 0.1,
        rig.target[1] + pointerState.y * 0.06,
        rig.target[2],
      );
      camera.updateProjectionMatrix();

      stage.update(time * 0.001, mouseVec, currentPixelRatio, pointerState.torch, quietRef.current, pointerState.mark);
      stage.world.rotation.y = -smoothProgress * 0.02;
      stage.lockBackdropToCamera(camera);

      // The flight is driven by real scroll distance, not by scene progress:
      // it has to complete inside the first screen regardless of page length.
      const rawDock = Math.min(1, window.scrollY / Math.max(1, viewHeight * 0.55));
      if (dockProgress < 0) {
        // First frame: a page restored mid-scroll starts docked rather than
        // flying in from a hero the reader never saw.
        dockProgress = rawDock;
      } else {
        // Exponential damping keyed to elapsed time, so the flight lands at
        // the same rate on a 30 Hz panel as on 120 Hz — and converges at once
        // when frames are sparse instead of crawling.
        const k = reducedMotion ? 1 : 1 - Math.exp(-frameMs / 90);
        dockProgress += (rawDock - dockProgress) * k;
      }
      const eased = dockProgress * dockProgress * (3 - 2 * dockProgress);

      // The landing DOM is intentionally absent on detail pages. Re-measure
      // when it returns so the persistent scene can resume its docked flight
      // without recreating the WebGL world.
      if (!quietRef.current) {
        measureWordmarkBoxes();
        layoutWordmark(eased);
      }

      // Cross-fade to the DOM mark on the last stretch: the canvas renders
      // behind the opaque chapters, so the WebGL copy cannot stay visible
      // once the reader is past the hero.
      const handoff = THREE.MathUtils.smoothstep(eased, 0.86, 0.99);
      stage.setWordmarkDock(eased, handoff);
      if (dockEl && handoff !== lastHandoff) {
        lastHandoff = handoff;
        dockEl.style.opacity = String(handoff);
        dockEl.style.pointerEvents = handoff > 0.5 ? 'auto' : 'none';
      }

      // Pass 1 — atmosphere into the offscreen target, which may be smaller
      // than the canvas on lower tiers.
      camera.layers.set(LAYER_ATMOSPHERE);
      renderer.setRenderTarget(post.sceneTarget);
      renderer.clear();
      renderer.render(scene, camera);

      // Pass 2 — grade, bloom and composite to the canvas.
      post.render(renderer);

      // Pass 3 — the wordmark, drawn over the graded frame so the official
      // brand colours are never touched by tone mapping.
      camera.layers.set(LAYER_OVERLAY);
      renderer.setRenderTarget(null);
      renderer.autoClear = false;
      renderer.render(scene, camera);
      renderer.autoClear = true;
    };

    /* ---------------------------------------------- lifecycle */
    const onVisibilityChange = () => {
      visible = !document.hidden;
      previousTime = 0;
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    const hero = document.getElementById('festival');
    const heroObserver = hero
      ? new IntersectionObserver(
          ([entry]) => {
            heroInView = entry.isIntersecting;
            previousTime = 0;
          },
          { threshold: 0 },
        )
      : null;
    heroObserver?.observe(hero!);

    const onContextLost = (event: Event) => {
      event.preventDefault();
      setSceneReady(false);
    };
    const onContextRestored = () => {
      applySize();
      setSceneReady(logoLoaded);
    };
    canvas.addEventListener('webglcontextlost', onContextLost);
    canvas.addEventListener('webglcontextrestored', onContextRestored);

    animationFrame = window.requestAnimationFrame(renderFrame);

    return () => {
      active = false;
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointerout', onPointerOut);
      window.removeEventListener('blur', dimTorch);
      document.removeEventListener('visibilitychange', onVisibility);
      gsap.killTweensOf(pointerState);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      canvas.removeEventListener('webglcontextlost', onContextLost);
      canvas.removeEventListener('webglcontextrestored', onContextRestored);
      heroObserver?.disconnect();
      resizeObserver.disconnect();
      if (dockEl) {
        dockEl.style.removeProperty('opacity');
        dockEl.style.removeProperty('pointer-events');
      }
      stage.dispose();
      post.dispose();
      renderer.dispose();
    };
  }, [progressRef]);

  return (
    <div className={`festival-scene${sceneReady ? ' is-ready' : ''}${quiet ? ' is-quiet' : ''}`} data-scene-mode={quiet ? 'quiet' : 'full'} ref={hostRef}>
      <canvas className="festival-scene__canvas" ref={canvasRef} role="img" aria-label="Crown of Light festival scene" />
      {/* Held over the stage until the model resolves, so the wordmark is on
          screen from the first paint. If the GLB never loads, is-ready never
          fires and this simply stays — the mark is present either way. */}
      <div className="hero-boot" aria-hidden={sceneReady || quiet}>
        <img
          alt=""
          className="hero-boot__mark"
          decoding="async"
          fetchPriority="high"
          src={BUGLASAN_HERO_LOGO.src}
        />
        <div className="hero-boot__meter">
          <i style={{ width: `${Math.round(bootProgress * 100)}%` }} />
        </div>
        <p className="hero-boot__label">
          {bootProgress > 0 ? `Loading ${Math.round(bootProgress * 100)}%` : 'Loading'}
        </p>
      </div>

      <div className="festival-scene__vignette" aria-hidden="true" />
    </div>
  );
}
