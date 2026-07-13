// Live2DCanvas.tsx
// ---------------------------------------------------------------------------
// React component that renders a Live2D model on a PIXI.js canvas.
//
// Uses CDN-loaded PIXI + pixi-live2d-display (no npm install needed).
// The component creates a PIXI Application, attaches it to a div container,
// and scales the model to fit within the given dimensions.
//
// Props:
//   modelUrl — URL/path to the .model3.json file
//   emotion  — current emotion (drives expression + motion)
//   className — optional CSS class for the container
//   onReady  — callback when model is loaded and displayed
//   onError  — callback when loading fails
// ---------------------------------------------------------------------------

import { useEffect, useRef, useState, useCallback, type JSX } from "react";
import { ensureLive2DLoaded } from "../lib/live2d-loader.js";
import { applyEmotion, toLive2DEmotion, type Live2DEmotion } from "../lib/live2d-emotions.js";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface Live2DCanvasProps {
  /** URL or path to the .model3.json file. Null = show placeholder. */
  modelUrl: string | null;
  /** Current emotion to apply to the model. */
  emotion?: Live2DEmotion | string;
  /** Additional CSS class for the container div. */
  className?: string;
  /** Callback when model finishes loading. */
  onReady?: () => void;
  /** Callback when model loading fails. */
  onError?: (error: string) => void;
}

// ---------------------------------------------------------------------------
// WebGL context limit guard
// ---------------------------------------------------------------------------
// Browsers limit simultaneous WebGL contexts (typically 16). Each Live2DCanvas
// creates one PIXI Application = one WebGL context. If too many are open,
// older contexts are lost and their canvases go black. This counter prevents
// exceeding the safe limit by refusing to create new instances.

const MAX_WEBGL_CONTEXTS = 8; // conservative limit (browsers allow ~16)
let activeContextCount = 0;

/** Try to acquire a WebGL context slot. Returns false if at capacity. */
function acquireContext(): boolean {
  if (activeContextCount >= MAX_WEBGL_CONTEXTS) return false;
  activeContextCount++;
  return true;
}

/** Release a previously acquired WebGL context slot. */
function releaseContext(): void {
  if (activeContextCount > 0) activeContextCount--;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

type LoadState = "idle" | "loading" | "ready" | "error";

export default function Live2DCanvas({
  modelUrl,
  emotion,
  className = "",
  onReady,
  onError,
}: Live2DCanvasProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<PIXIApplication | null>(null);
  const modelRef = useRef<Live2DModel | null>(null);
  // Store the mousemove + WebGL cleanup function in a ref.
  const cleanupRef = useRef<(() => void) | null>(null);

  // --- Callback refs: always point to latest onReady/onError/emotion ---
  // This avoids stale closure issues when the effect deps are [modelUrl]
  // but the parent passes new callback/emotion values on each render.
  const onReadyRef = useRef(onReady);
  const onErrorRef = useRef(onError);
  const emotionRef = useRef(emotion);
  onReadyRef.current = onReady;
  onErrorRef.current = onError;
  emotionRef.current = emotion;

  const [state, setState] = useState<LoadState>("idle");
  const [errorMsg, setErrorMsg] = useState<string>("");

  // --- Create PIXI Application + load model ---
  useEffect(() => {
    if (!modelUrl || !containerRef.current) {
      setState("idle");
      return;
    }

    // Guard: refuse to create more PIXI Applications if at WebGL capacity.
    if (!acquireContext()) {
      const msg = `WebGL 上下文数量已达上限 (${MAX_WEBGL_CONTEXTS})，无法创建更多 Live2D 实例`;
      setErrorMsg(msg);
      setState("error");
      onErrorRef.current?.(msg);
      return;
    }

    let cancelled = false;
    setState("loading");

    (async () => {
      try {
        // 1. Ensure CDN libraries loaded
        await ensureLive2DLoaded();

        if (cancelled || !containerRef.current) return;

        // 2. Get PIXI global
        const pixi = (window as unknown as { PIXI: PIXI & { Live2DModel?: Live2DModelStatic } }).PIXI;
        if (!pixi) throw new Error("PIXI not available");

        // 3. Create PIXI Application
        const { width, height } = containerRef.current.getBoundingClientRect();
        const app = new pixi.Application({
          width: width || 300,
          height: height || 400,
          backgroundAlpha: 0,
          antialias: true,
          autoStart: true,
        });

        if (cancelled) {
          app.destroy();
          return;
        }

        containerRef.current.appendChild(app.view);
        app.view.style.width = "100%";
        app.view.style.height = "100%";
        appRef.current = app;

        // 4. Load Live2D model
        if (!pixi.Live2DModel) throw new Error("Live2DModel not registered");
        const model = await pixi.Live2DModel.from(modelUrl);

        if (cancelled) {
          model.destroy();
          app.destroy();
          return;
        }

        // 5. Add model to stage and scale to fit
        app.stage.addChild(model);
        modelRef.current = model;

        // --- Safe scaling: guard against model.width/height being 0 ---
        const modelW = model.width || 300;
        const modelH = model.height || 400;
        const containerW = width || 300;
        const containerH = height || 400;
        const scale = Math.min(containerW / modelW, containerH / modelH);
        const safeScale = Number.isFinite(scale) && scale > 0 ? scale * 0.9 : 0.9;
        model.scale.x = safeScale;
        model.scale.y = safeScale;
        model.anchor.x = 0.5;
        model.anchor.y = 0.5;
        model.position.x = containerW / 2;
        model.position.y = containerH / 2;

        // 6. Auto-focus toward cursor
        const handleMove = (e: MouseEvent): void => {
          const rect = containerRef.current?.getBoundingClientRect();
          if (!rect) return;
          const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
          const y = ((e.clientY - rect.top) / rect.height) * 2 - 1;
          model.focus(x, y);
        };
        window.addEventListener("mousemove", handleMove);

        // 7. WebGL context loss / restoration
        const canvas = app.view;
        const handleContextLoss = (e: Event): void => {
          console.warn("[Live2DCanvas] WebGL context lost");
          e.preventDefault();
        };
        const handleContextRestored = (): void => {
          console.log("[Live2DCanvas] WebGL context restored");
        };
        canvas.addEventListener("webglcontextlost", handleContextLoss);
        canvas.addEventListener("webglcontextrestored", handleContextRestored);

        // Store all cleanup in ref
        cleanupRef.current = () => {
          window.removeEventListener("mousemove", handleMove);
          canvas.removeEventListener("webglcontextlost", handleContextLoss);
          canvas.removeEventListener("webglcontextrestored", handleContextRestored);
        };

        setState("ready");
        // Apply current emotion to the freshly loaded model.
        // Uses emotionRef (not the closure variable) to ensure we always
        // apply the latest emotion, even if it changed during loading.
        const currentEmotion = emotionRef.current;
        if (currentEmotion) {
          applyEmotion(model, toLive2DEmotion(String(currentEmotion)));
        }
        // Call latest onReady via ref
        onReadyRef.current?.();
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : String(err);
        console.error("[Live2DCanvas] Load failed:", msg);
        setErrorMsg(msg);
        setState("error");
        // Call latest onError via ref
        onErrorRef.current?.(msg);
      }
    })();

    return () => {
      cancelled = true;
      // Cleanup mousemove + WebGL listeners via ref
      cleanupRef.current?.();
      cleanupRef.current = null;
      // Destroy model
      if (modelRef.current) {
        modelRef.current.destroy();
        modelRef.current = null;
      }
      // Destroy PIXI app
      if (appRef.current) {
        appRef.current.destroy();
        appRef.current = null;
      }
      // Remove canvas from DOM
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
      // Release WebGL context slot
      releaseContext();
    };
  }, [modelUrl]);

  // --- Apply emotion changes ---
  useEffect(() => {
    const model = modelRef.current;
    if (!model || !emotion) return;
    applyEmotion(model, toLive2DEmotion(String(emotion)));
  }, [emotion]);

  // --- Handle resize ---
  const handleResize = useCallback((): void => {
    const app = appRef.current;
    const model = modelRef.current;
    const container = containerRef.current;
    if (!app || !model || !container) return;

    const { width, height } = container.getBoundingClientRect();
    app.renderer.resize(width, height);

    // Guard against model.width/height being 0
    const modelW = model.width || 300;
    const modelH = model.height || 400;
    const scale = Math.min(width / modelW, height / modelH);
    const safeScale = Number.isFinite(scale) && scale > 0 ? scale * 0.9 : 0.9;
    model.scale.x = safeScale;
    model.scale.y = safeScale;
    model.position.x = width / 2;
    model.position.y = height / 2;
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(() => handleResize());
    observer.observe(container);
    return () => observer.disconnect();
  }, [handleResize]);

  // --- Render ---
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      {/* PIXI canvas container */}
      <div ref={containerRef} className="h-full w-full" />

      {/* Loading state */}
      {state === "loading" && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div
              className="h-8 w-8 animate-spin rounded-full border-2 border-[#C9A86C]/20 border-t-[#C9A86C]"
            />
            <span className="text-xs text-[#888]">加载 Live2D 模型…</span>
          </div>
        </div>
      )}

      {/* Error state */}
      {state === "error" && (
        <div className="absolute inset-0 flex items-center justify-center p-4">
          <div className="text-center">
            <div className="mb-2 text-2xl opacity-40">⚠</div>
            <p className="text-xs text-[#C9685A]">Live2D 加载失败</p>
            <p className="mt-1 max-w-[200px] text-[10px] text-[#666]">{errorMsg}</p>
          </div>
        </div>
      )}

      {/* Idle / no model */}
      {state === "idle" && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="mb-2 text-3xl opacity-20">🎭</div>
            <p className="text-xs text-[#666]">未绑定 Live2D 模型</p>
          </div>
        </div>
      )}
    </div>
  );
}
