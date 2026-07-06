// ImageEditor — Canvas-based image editor for crop / annotation / mask.
//
// Uses three stacked canvases:
//   1. baseCanvas  (z-10, pointer-events:none) — original image
//   2. maskCanvas  (z-20, pointer-events:none) — mask preview (semi-transparent)
//   3. overlayCanvas (z-30, pointer-events:auto)  — annotations + mouse events
//
// Undo/redo operates on the overlay (annotation) canvas only.
// The mask has its own clear button and is exported separately.
//
// DPI scaling: canvas pixel dimensions = CSS size * devicePixelRatio.
// The context is scaled by dpr so all drawing uses CSS pixel coordinates.
// getImageData / putImageData always work in device pixels.

import { useCallback, useEffect, useRef, useState } from "react";
import type { JSX, MouseEvent, DragEvent, ChangeEvent } from "react";
import { proxyImageUrl } from "../../api/client.js";
import {
  IconUndo,
  IconRedo,
  IconTrash2,
  IconDownload,
  IconCopy,
  IconUpload,
  IconX,
  IconCheck,
} from "../../components/Icons.tsx";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Tool = "select" | "crop" | "brush" | "rect" | "arrow" | "text" | "mask";

interface CropRegion {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface ImageEditorProps {
  /** Initial image URL (optional). */
  imageUrl?: string;
  /** Callback when image is edited and exported. */
  onExport?: (editedImageUrl: string, maskImageUrl?: string) => void;
  /** Callback when editor is closed. */
  onClose?: () => void;
  /** Maximum canvas width (default 800). */
  maxWidth?: number;
  /** Maximum canvas height (default 600). */
  maxHeight?: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_HISTORY = 20;

const APPLE_FONT_STYLE = {
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
} as const;

const TOOLS: { tool: Tool; label: string; icon: string }[] = [
  { tool: "select", label: "选择", icon: "\u25A4" },
  { tool: "crop", label: "裁剪", icon: "\u2702" },
  { tool: "brush", label: "画笔", icon: "\u270E" },
  { tool: "rect", label: "矩形", icon: "\u25A1" },
  { tool: "arrow", label: "箭头", icon: "\u2192" },
  { tool: "text", label: "文字", icon: "T" },
  { tool: "mask", label: "蒙版", icon: "\u25D0" },
];

const COLOR_PRESETS = [
  "#FF3B30",
  "#FF9500",
  "#FFCC00",
  "#34C759",
  "#007AFF",
  "#5856D6",
  "#FF2D55",
  "#000000",
];

const TOOLBAR_BTN =
  "flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-sunken)] disabled:cursor-not-allowed disabled:opacity-40";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Calculate display size that fits within max dimensions, preserving aspect ratio. */
function fitSize(
  w: number,
  h: number,
  maxW: number,
  maxH: number,
): { w: number; h: number } {
  const ratio = Math.min(maxW / w, maxH / h, 1);
  return { w: Math.round(w * ratio), h: Math.round(h * ratio) };
}

/** Draw an arrow from (x1,y1) to (x2,y2). */
function drawArrow(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): void {
  const headLen = 14;
  const angle = Math.atan2(y2 - y1, x2 - x1);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  // Arrowhead
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(
    x2 - headLen * Math.cos(angle - Math.PI / 6),
    y2 - headLen * Math.sin(angle - Math.PI / 6),
  );
  ctx.moveTo(x2, y2);
  ctx.lineTo(
    x2 - headLen * Math.cos(angle + Math.PI / 6),
    y2 - headLen * Math.sin(angle + Math.PI / 6),
  );
  ctx.stroke();
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ImageEditor({
  imageUrl,
  onExport,
  onClose,
  maxWidth = 800,
  maxHeight = 600,
}: ImageEditorProps): JSX.Element {
  // --- State (visible) ---
  const [tool, setTool] = useState<Tool>("select");
  const [brushColor, setBrushColor] = useState(COLOR_PRESETS[0]!);
  const [brushSize, setBrushSize] = useState(4);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cropRegion, setCropRegion] = useState<CropRegion | null>(null);
  const [hasMask, setHasMask] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [exportFormat, setExportFormat] = useState<"png" | "jpeg">("png");
  const [statusMessage, setStatusMessage] = useState("");
  const [canvasDims, setCanvasDims] = useState({ w: 0, h: 0 });
  const [textInput, setTextInput] = useState<{
    x: number;
    y: number;
    value: string;
    visible: boolean;
  }>({ x: 0, y: 0, value: "", visible: false });

  // --- Refs ---
  const baseCanvasRef = useRef<HTMLCanvasElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textInputRef = useRef<HTMLInputElement>(null);

  const imageRef = useRef<HTMLImageElement | null>(null);
  const isDrawingRef = useRef(false);
  const startPointRef = useRef<{ x: number; y: number } | null>(null);
  const snapshotRef = useRef<ImageData | null>(null);
  const historyRef = useRef<ImageData[]>([]);
  const redoStackRef = useRef<ImageData[]>([]);
  const dprRef = useRef(1);
  const canvasSizeRef = useRef({ w: 0, h: 0 });
  const toolRef = useRef<Tool>("select");

  // Keep toolRef synced for use inside stable event handlers.
  useEffect(() => {
    toolRef.current = tool;
  }, [tool]);

  // --- Canvas setup ---
  const setupCanvases = useCallback(
    (img: HTMLImageElement) => {
      const dpr = window.devicePixelRatio || 1;
      dprRef.current = dpr;
      const { w, h } = fitSize(
        img.naturalWidth,
        img.naturalHeight,
        maxWidth,
        maxHeight,
      );
      canvasSizeRef.current = { w, h };

      const setupCanvas = (canvas: HTMLCanvasElement): CanvasRenderingContext2D => {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        canvas.style.width = `${w}px`;
        canvas.style.height = `${h}px`;
        const ctx = canvas.getContext("2d")!;
        ctx.scale(dpr, dpr);
        return ctx;
      };

      // Base — draw the image
      const baseCtx = setupCanvas(baseCanvasRef.current!);
      baseCtx.drawImage(img, 0, 0, w, h);

      // Overlay — transparent, for annotations
      setupCanvas(overlayCanvasRef.current!);

      // Mask — transparent, for mask brush
      setupCanvas(maskCanvasRef.current!);

      // Reset history & state
      historyRef.current = [];
      redoStackRef.current = [];
      setCanUndo(false);
      setCanRedo(false);
      setHasMask(false);
      setCropRegion(null);
      setCanvasDims({ w, h });
      setImageLoaded(true);
    },
    [maxWidth, maxHeight],
  );

  // --- Image loading ---
  const loadImageFromFile = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          imageRef.current = img;
          setupCanvases(img);
          setStatusMessage("");
        };
        img.onerror = () => setStatusMessage("图片加载失败");
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    },
    [setupCanvases],
  );

  const loadImageFromUrl = useCallback(
    (url: string) => {
      setLoading(true);
      setStatusMessage("");
      const img = new Image();
      if (!url.startsWith("data:")) {
        img.crossOrigin = "anonymous";
      }
      img.onload = () => {
        imageRef.current = img;
        setupCanvases(img);
        setLoading(false);
      };
      img.onerror = () => {
        setStatusMessage("图片加载失败，可能是跨域限制");
        setLoading(false);
      };
      img.src = proxyImageUrl(url);
    },
    [setupCanvases],
  );

  // Load initial image URL
  useEffect(() => {
    if (imageUrl) {
      loadImageFromUrl(imageUrl);
    }
  }, [imageUrl, loadImageFromUrl]);

  // --- Drag-and-drop ---
  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      const files = e.dataTransfer.files;
      if (files.length > 0 && files[0]!.type.startsWith("image/")) {
        loadImageFromFile(files[0]!);
      }
    },
    [loadImageFromFile],
  );

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
  }, []);

  const handleFileSelect = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) loadImageFromFile(file);
      e.target.value = "";
    },
    [loadImageFromFile],
  );

  // --- Paste ---
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        const item = items[i]!;
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            loadImageFromFile(file);
            break;
          }
        }
      }
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [loadImageFromFile]);

  // --- Coordinate helper ---
  const getPos = useCallback((e: MouseEvent): { x: number; y: number } => {
    const canvas = overlayCanvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }, []);

  // --- History (undo/redo for annotation layer) ---
  const saveHistory = useCallback(() => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    historyRef.current.push(imageData);
    if (historyRef.current.length > MAX_HISTORY) {
      historyRef.current.shift();
    }
    redoStackRef.current = [];
    setCanUndo(true);
    setCanRedo(false);
  }, []);

  const undo = useCallback(() => {
    if (historyRef.current.length === 0) return;
    const canvas = overlayCanvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const current = ctx.getImageData(0, 0, canvas.width, canvas.height);
    redoStackRef.current.push(current);
    const prev = historyRef.current.pop()!;
    ctx.putImageData(prev, 0, 0);
    setCanUndo(historyRef.current.length > 0);
    setCanRedo(true);
  }, []);

  const redo = useCallback(() => {
    if (redoStackRef.current.length === 0) return;
    const canvas = overlayCanvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const current = ctx.getImageData(0, 0, canvas.width, canvas.height);
    historyRef.current.push(current);
    const next = redoStackRef.current.pop()!;
    ctx.putImageData(next, 0, 0);
    setCanUndo(true);
    setCanRedo(redoStackRef.current.length > 0);
  }, []);

  // --- Mouse handlers ---
  const handleMouseDown = useCallback(
    (e: MouseEvent) => {
      if (!imageLoaded) return;
      const pos = getPos(e);
      const currentTool = toolRef.current;

      if (currentTool === "text") {
        setTextInput({ x: pos.x, y: pos.y, value: "", visible: true });
        setTimeout(() => textInputRef.current?.focus(), 0);
        return;
      }

      if (currentTool === "crop") {
        isDrawingRef.current = true;
        startPointRef.current = pos;
        setCropRegion({ x: pos.x, y: pos.y, w: 0, h: 0 });
        return;
      }

      if (
        currentTool === "brush" ||
        currentTool === "rect" ||
        currentTool === "arrow" ||
        currentTool === "mask"
      ) {
        isDrawingRef.current = true;
        startPointRef.current = pos;

        if (currentTool === "brush") {
          const ctx = overlayCanvasRef.current!.getContext("2d")!;
          ctx.beginPath();
          ctx.moveTo(pos.x, pos.y);
          ctx.strokeStyle = brushColor;
          ctx.lineWidth = brushSize;
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          // Draw a dot for single click
          ctx.lineTo(pos.x + 0.1, pos.y + 0.1);
          ctx.stroke();
        } else if (currentTool === "mask") {
          const ctx = maskCanvasRef.current!.getContext("2d")!;
          ctx.beginPath();
          ctx.moveTo(pos.x, pos.y);
          ctx.strokeStyle = "rgba(220, 80, 255, 0.7)";
          ctx.lineWidth = brushSize;
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.lineTo(pos.x + 0.1, pos.y + 0.1);
          ctx.stroke();
        } else {
          // rect, arrow: save snapshot for live preview
          const canvas = overlayCanvasRef.current!;
          const ctx = canvas.getContext("2d")!;
          snapshotRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height);
        }
      }
    },
    [imageLoaded, getPos, brushColor, brushSize],
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDrawingRef.current) return;
      const pos = getPos(e);
      const currentTool = toolRef.current;
      const start = startPointRef.current;
      if (!start) return;

      if (currentTool === "brush") {
        const ctx = overlayCanvasRef.current!.getContext("2d")!;
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
      } else if (currentTool === "mask") {
        const ctx = maskCanvasRef.current!.getContext("2d")!;
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
      } else if (currentTool === "crop") {
        const x = Math.min(start.x, pos.x);
        const y = Math.min(start.y, pos.y);
        const w = Math.abs(pos.x - start.x);
        const h = Math.abs(pos.y - start.y);
        setCropRegion({ x, y, w, h });
      } else if (currentTool === "rect" || currentTool === "arrow") {
        const canvas = overlayCanvasRef.current!;
        const ctx = canvas.getContext("2d")!;
        if (snapshotRef.current) {
          ctx.putImageData(snapshotRef.current, 0, 0);
        }
        ctx.strokeStyle = brushColor;
        ctx.lineWidth = brushSize;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        if (currentTool === "rect") {
          ctx.strokeRect(start.x, start.y, pos.x - start.x, pos.y - start.y);
        } else {
          drawArrow(ctx, start.x, start.y, pos.x, pos.y);
        }
      }
    },
    [getPos, brushColor, brushSize],
  );

  const handleMouseUp = useCallback(() => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    const currentTool = toolRef.current;
    startPointRef.current = null;

    if (currentTool === "brush" || currentTool === "rect" || currentTool === "arrow") {
      saveHistory();
    } else if (currentTool === "mask") {
      setHasMask(true);
    } else if (currentTool === "crop") {
      if (cropRegion && (cropRegion.w < 10 || cropRegion.h < 10)) {
        setCropRegion(null);
      }
    }
    snapshotRef.current = null;
  }, [saveHistory, cropRegion]);

  // --- Text commit ---
  const commitText = useCallback(() => {
    if (!textInput.value.trim()) {
      setTextInput((prev) => ({ ...prev, visible: false, value: "" }));
      return;
    }
    const ctx = overlayCanvasRef.current?.getContext("2d");
    if (!ctx) return;
    const fontSize = Math.max(14, brushSize * 4);
    ctx.font = `${fontSize}px -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif`;
    ctx.fillStyle = brushColor;
    ctx.textBaseline = "top";
    ctx.fillText(textInput.value, textInput.x, textInput.y);
    saveHistory();
    setTextInput((prev) => ({ ...prev, visible: false, value: "" }));
  }, [textInput, brushColor, brushSize, saveHistory]);

  // --- Crop ---
  const confirmCrop = useCallback(() => {
    if (!cropRegion || cropRegion.w < 10 || cropRegion.h < 10) return;
    const dpr = dprRef.current;
    const { x, y, w, h } = cropRegion;

    const baseCanvas = baseCanvasRef.current!;
    const sx = x * dpr;
    const sy = y * dpr;
    const sw = w * dpr;
    const sh = h * dpr;

    // Snapshot cropped region at device resolution
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = sw;
    tempCanvas.height = sh;
    const tempCtx = tempCanvas.getContext("2d")!;
    tempCtx.drawImage(baseCanvas, sx, sy, sw, sh, 0, 0, sw, sh);

    // Resize & redraw base
    const baseCtx = baseCanvas.getContext("2d")!;
    baseCanvas.width = sw;
    baseCanvas.height = sh;
    baseCanvas.style.width = `${w}px`;
    baseCanvas.style.height = `${h}px`;
    baseCtx.scale(dpr, dpr);
    baseCtx.drawImage(tempCanvas, 0, 0, w, h);

    // Resize overlay (clears content — annotations lost on crop)
    const overlayCanvas = overlayCanvasRef.current!;
    overlayCanvas.width = sw;
    overlayCanvas.height = sh;
    overlayCanvas.style.width = `${w}px`;
    overlayCanvas.style.height = `${h}px`;
    overlayCanvas.getContext("2d")!.scale(dpr, dpr);

    // Resize mask (clears content)
    const maskCanvas = maskCanvasRef.current!;
    maskCanvas.width = sw;
    maskCanvas.height = sh;
    maskCanvas.style.width = `${w}px`;
    maskCanvas.style.height = `${h}px`;
    maskCanvas.getContext("2d")!.scale(dpr, dpr);

    canvasSizeRef.current = { w, h };
    setCanvasDims({ w, h });
    historyRef.current = [];
    redoStackRef.current = [];
    setCanUndo(false);
    setCanRedo(false);
    setHasMask(false);
    setCropRegion(null);
    setTool("select");
    setStatusMessage(`已裁剪为 ${Math.round(w)} x ${Math.round(h)}`);
  }, [cropRegion]);

  const cancelCrop = useCallback(() => {
    setCropRegion(null);
  }, []);

  // --- Clear ---
  const clearAnnotations = useCallback(() => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
    historyRef.current = [];
    redoStackRef.current = [];
    setCanUndo(false);
    setCanRedo(false);
    setStatusMessage("标注已清除");
  }, []);

  const clearMask = useCallback(() => {
    const canvas = maskCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
    setHasMask(false);
    setStatusMessage("蒙版已清除");
  }, []);

  // --- Export ---
  const exportImage = useCallback((format: "png" | "jpeg"): string => {
    const baseCanvas = baseCanvasRef.current!;
    const overlayCanvas = overlayCanvasRef.current!;

    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = baseCanvas.width;
    tempCanvas.height = baseCanvas.height;
    const tempCtx = tempCanvas.getContext("2d")!;
    tempCtx.drawImage(baseCanvas, 0, 0);
    tempCtx.drawImage(overlayCanvas, 0, 0);

    const mimeType = format === "png" ? "image/png" : "image/jpeg";
    const quality = format === "jpeg" ? 0.92 : undefined;
    return tempCanvas.toDataURL(mimeType, quality);
  }, []);

  const exportMaskImage = useCallback((): string | null => {
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas) return null;

    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = maskCanvas.width;
    tempCanvas.height = maskCanvas.height;
    const tempCtx = tempCanvas.getContext("2d")!;

    // Black background
    tempCtx.fillStyle = "#000000";
    tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

    // Convert any non-transparent pixel to white
    const maskCtx = maskCanvas.getContext("2d")!;
    const imageData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] > 0) {
        data[i] = 255;
        data[i + 1] = 255;
        data[i + 2] = 255;
        data[i + 3] = 255;
      }
    }
    tempCtx.putImageData(imageData, 0, 0);
    return tempCanvas.toDataURL("image/png");
  }, []);

  const handleExport = useCallback(() => {
    if (!imageLoaded) return;
    try {
      const editedUrl = exportImage(exportFormat);
      const maskUrl = hasMask ? exportMaskImage() : undefined;
      onExport?.(editedUrl, maskUrl ?? undefined);
      setStatusMessage("已导出图片");
    } catch {
      setStatusMessage("导出失败，画布可能被跨域图片污染");
    }
  }, [imageLoaded, exportFormat, hasMask, onExport, exportImage, exportMaskImage]);

  const handleExportMask = useCallback(() => {
    if (!hasMask) return;
    const url = exportMaskImage();
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = "mask.png";
    a.click();
    setStatusMessage("蒙版已下载");
  }, [hasMask, exportMaskImage]);

  const copyToClipboard = useCallback(async () => {
    if (!imageLoaded) return;
    const baseCanvas = baseCanvasRef.current!;
    const overlayCanvas = overlayCanvasRef.current!;

    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = baseCanvas.width;
    tempCanvas.height = baseCanvas.height;
    const tempCtx = tempCanvas.getContext("2d")!;
    tempCtx.drawImage(baseCanvas, 0, 0);
    tempCtx.drawImage(overlayCanvas, 0, 0);

    tempCanvas.toBlob(async (blob) => {
      if (!blob) return;
      try {
        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": blob }),
        ]);
        setStatusMessage("已复制到剪贴板");
      } catch {
        setStatusMessage("复制失败，浏览器可能不支持");
      }
    }, "image/png");
  }, [imageLoaded]);

  // --- Keyboard shortcuts ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (textInput.visible) return;
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if ((e.ctrlKey || e.metaKey) && e.key === "y") {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undo, redo, textInput.visible]);

  // --- Cursor style ---
  const cursorStyle: string = (() => {
    switch (tool) {
      case "text":
        return "text";
      case "select":
        return "default";
      default:
        return "crosshair";
    }
  })();

  const showColorPicker = tool === "brush" || tool === "rect" || tool === "arrow" || tool === "text";
  const showBrushSize = tool === "brush" || tool === "rect" || tool === "arrow" || tool === "mask" || tool === "text";

  // --- Render ---
  return (
    <div
      style={APPLE_FONT_STYLE}
      className="flex h-full flex-col overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]"
    >
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-[var(--color-border)] px-3 py-2">
        {/* Upload */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className={TOOLBAR_BTN}
        >
          <IconUpload size={15} />
          上传
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileSelect}
        />

        <div className="mx-1 h-5 w-px bg-[var(--color-border)]" />

        {/* Tools */}
        {TOOLS.map(({ tool: t, label, icon }) => (
          <button
            key={t}
            type="button"
            onClick={() => {
              setTool(t);
              setCropRegion(null);
            }}
            className={
              tool === t
                ? "flex items-center gap-1 rounded-md bg-[var(--color-primary)] px-2.5 py-1 text-xs font-medium text-white transition-colors"
                : TOOLBAR_BTN
            }
          >
            <span>{icon}</span>
            {label}
          </button>
        ))}

        <div className="mx-1 h-5 w-px bg-[var(--color-border)]" />

        {/* Color picker */}
        {showColorPicker && (
          <div className="flex items-center gap-1">
            <span className="text-[11px] text-[var(--color-text-faint)]">颜色</span>
            <input
              type="color"
              value={brushColor}
              onChange={(e) => setBrushColor(e.target.value)}
              className="h-6 w-6 cursor-pointer rounded border border-[var(--color-border)] bg-transparent"
            />
            {COLOR_PRESETS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setBrushColor(c)}
                style={{ background: c }}
                className="h-5 w-5 rounded border border-[var(--color-border)] transition-transform hover:scale-110"
              />
            ))}
          </div>
        )}

        {/* Brush size */}
        {showBrushSize && (
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-[var(--color-text-faint)]">粗细</span>
            <input
              type="range"
              min={1}
              max={30}
              value={brushSize}
              onChange={(e) => setBrushSize(Number(e.target.value))}
              className="w-20 accent-[var(--color-primary)]"
            />
            <span className="w-5 text-[11px] text-[var(--color-text-faint)]">{brushSize}</span>
          </div>
        )}

        <div className="mx-1 h-5 w-px bg-[var(--color-border)]" />

        {/* Undo / Redo / Clear */}
        <button
          type="button"
          onClick={undo}
          disabled={!canUndo}
          className={TOOLBAR_BTN}
          title="撤销 (Ctrl+Z)"
        >
          <IconUndo size={15} />
        </button>
        <button
          type="button"
          onClick={redo}
          disabled={!canRedo}
          className={TOOLBAR_BTN}
          title="重做 (Ctrl+Shift+Z)"
        >
          <IconRedo size={15} />
        </button>
        <button
          type="button"
          onClick={clearAnnotations}
          className={TOOLBAR_BTN}
          title="清除所有标注"
        >
          <IconTrash2 size={15} />
          清除
        </button>
      </div>

      {/* Crop action bar */}
      {cropRegion && cropRegion.w > 5 && cropRegion.h > 5 && (
        <div className="flex items-center gap-2 border-b border-[var(--color-border)] bg-[var(--color-surface-sunken)] px-3 py-1.5">
          <span className="text-xs text-[var(--color-text-secondary)]">
            裁剪区域: {Math.round(cropRegion.w)} x {Math.round(cropRegion.h)} px
          </span>
          <div className="flex-1" />
          <button
            type="button"
            onClick={confirmCrop}
            className="flex items-center gap-1 rounded-md bg-green-600 px-3 py-1 text-xs font-medium text-white hover:bg-green-700"
          >
            <IconCheck size={13} />
            确认裁剪
          </button>
          <button
            type="button"
            onClick={cancelCrop}
            className="flex items-center gap-1 rounded-md border border-[var(--color-border)] px-3 py-1 text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)]"
          >
            <IconX size={13} />
            取消
          </button>
        </div>
      )}

      {/* Mask hint */}
      {tool === "mask" && imageLoaded && (
        <div className="border-b border-[var(--color-border)] bg-[rgba(220,80,255,0.08)] px-3 py-1 text-[11px] text-[var(--color-text-secondary)]">
          蒙版模式: 涂抹区域 = 保留(白色), 未涂抹 = 移除(黑色). 导出时蒙版将作为独立图片输出.
        </div>
      )}

      {/* Canvas area */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className="relative flex flex-1 items-center justify-center overflow-auto bg-[var(--color-surface-sunken)] p-4"
      >
        {imageLoaded ? (
          <div
            className="relative"
            style={{ width: canvasDims.w, height: canvasDims.h }}
          >
            {/* Base canvas — image */}
            <canvas
              ref={baseCanvasRef}
              className="absolute inset-0"
              style={{ pointerEvents: "none" }}
            />
            {/* Mask canvas — semi-transparent mask preview */}
            <canvas
              ref={maskCanvasRef}
              className="absolute inset-0"
              style={{ pointerEvents: "none" }}
            />
            {/* Overlay canvas — annotations, receives all mouse events */}
            <canvas
              ref={overlayCanvasRef}
              className="absolute inset-0"
              style={{ cursor: cursorStyle }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            />

            {/* Crop overlay (CSS-based, no canvas drawing) */}
            {cropRegion && cropRegion.w > 5 && cropRegion.h > 5 && (
              <div
                className="pointer-events-none absolute"
                style={{
                  left: cropRegion.x,
                  top: cropRegion.y,
                  width: cropRegion.w,
                  height: cropRegion.h,
                  border: "2px dashed #fff",
                  boxShadow: "0 0 0 9999px rgba(0,0,0,0.5)",
                }}
              />
            )}

            {/* Text input overlay */}
            {textInput.visible && (
              <input
                ref={textInputRef}
                type="text"
                value={textInput.value}
                onChange={(e) =>
                  setTextInput((prev) => ({ ...prev, value: e.target.value }))
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    commitText();
                  } else if (e.key === "Escape") {
                    setTextInput((prev) => ({ ...prev, visible: false }));
                  }
                }}
                onBlur={() => {
                  if (textInput.value.trim()) commitText();
                  else setTextInput((prev) => ({ ...prev, visible: false }));
                }}
                placeholder="输入文字..."
                style={{
                  position: "absolute",
                  left: textInput.x,
                  top: textInput.y,
                  zIndex: 40,
                  background: "rgba(0,0,0,0.7)",
                  color: brushColor,
                  border: `1px solid ${brushColor}`,
                  borderRadius: "3px",
                  padding: "2px 6px",
                  fontSize: `${Math.max(14, brushSize * 4)}px`,
                  fontFamily:
                    '-apple-system, "PingFang SC", "Microsoft YaHei", sans-serif',
                  outline: "none",
                  minWidth: "80px",
                }}
              />
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <IconUpload
              size={48}
              className="text-[var(--color-text-faint)]"
            />
            <p className="text-sm text-[var(--color-text-faint)]">
              {loading
                ? "图片加载中..."
                : "拖拽图片到此处, 粘贴 (Ctrl+V), 或点击上传"}
            </p>
            {!loading && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-sunken)]"
              >
                选择图片
              </button>
            )}
          </div>
        )}
      </div>

      {/* Status message */}
      {statusMessage && (
        <div className="border-t border-[var(--color-border)] px-3 py-1 text-xs text-[var(--color-text-secondary)]">
          {statusMessage}
        </div>
      )}

      {/* Bottom action bar */}
      <div className="flex flex-wrap items-center gap-2 border-t border-[var(--color-border)] px-3 py-2">
        {/* Export format selector */}
        <select
          value={exportFormat}
          onChange={(e) => setExportFormat(e.target.value as "png" | "jpeg")}
          className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-xs text-[var(--color-text)]"
        >
          <option value="png">PNG</option>
          <option value="jpeg">JPEG</option>
        </select>

        <button
          type="button"
          onClick={handleExport}
          disabled={!imageLoaded}
          className="flex items-center gap-1 rounded-lg bg-[var(--color-primary)] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[var(--color-primary-hover)] disabled:opacity-40"
        >
          <IconDownload size={14} />
          导出图片
        </button>

        <button
          type="button"
          onClick={handleExportMask}
          disabled={!hasMask}
          className="flex items-center gap-1 rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-sunken)] disabled:opacity-40"
        >
          导出蒙版
        </button>

        {hasMask && (
          <button
            type="button"
            onClick={clearMask}
            className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-sunken)]"
          >
            清除蒙版
          </button>
        )}

        <div className="flex-1" />

        <button
          type="button"
          onClick={copyToClipboard}
          disabled={!imageLoaded}
          className="flex items-center gap-1 rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-sunken)] disabled:opacity-40"
        >
          <IconCopy size={14} />
          复制
        </button>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-sunken)]"
          >
            关闭
          </button>
        )}
      </div>
    </div>
  );
}
