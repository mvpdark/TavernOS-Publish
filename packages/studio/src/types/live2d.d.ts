// live2d.d.ts
// ---------------------------------------------------------------------------
// Ambient type declarations for CDN-loaded Live2D runtime libraries.
// Since PIXI.js, pixi-live2d-display, and Cubism Core are loaded from CDN
// (not npm), TypeScript needs these declarations to compile without errors.
// ---------------------------------------------------------------------------

/** Minimal PIXI.js v7 Application type (only what we use). */
interface PIXIApplication {
  view: HTMLCanvasElement;
  stage: PIXIContainer;
  renderer: { resize: (w: number, h: number) => void; destroy: () => void };
  destroy: () => void;
}

interface PIXIContainer {
  addChild: (child: unknown) => void;
  destroy: () => void;
}

/** PIXI global (loaded from CDN). */
interface PIXI {
  Application: new (opts: {
    width?: number;
    height?: number;
    backgroundAlpha?: number;
    antialias?: boolean;
    autoStart?: boolean;
  }) => PIXIApplication;
  Container: new () => PIXIContainer;
  /** pixi-live2d-display UMD build registers here. */
  live2d?: Record<string, unknown>;
  /** Aliased from live2d.Live2DModel by ensureLive2DModelAlias(). */
  Live2DModel?: Live2DModelStatic;
}

/** Live2D model instance (from pixi-live2d-display). */
interface Live2DModel {
  // Motion / expression control
  motion: (group: string, index?: number) => Promise<unknown>;
  expression: (name: string | number) => Promise<unknown>;
  // Focus point (eye tracking)
  focus: (x: number, y: number) => void;
  // Transform
  anchor: { x: number; y: number };
  scale: { x: number; y: number };
  position: { x: number; y: number };
  // Sizing
  width: number;
  height: number;
  internalModel: {
    settings: {
      expressions?: Array<{ name: string; file: string }>;
      motions?: Record<string, Array<unknown>>;
    };
    coreModel: unknown;
  };
  destroy: () => void;
}

/** Live2DModel static (constructor + factory). */
interface Live2DModelStatic {
  from: (source: string, options?: Record<string, unknown>) => Promise<Live2DModel>;
  registerTicker: (ticker: unknown) => void;
}

/** Cubism Core global (loaded from Live2D CDN). */
interface Live2DCubismCore {
  /** Version is a function in the actual SDK, not a string. */
  Version: () => string;
}

// Extend window with CDN-loaded globals
interface Window {
  PIXI?: PIXI;
  Live2DCubismCore?: Live2DCubismCore;
}
