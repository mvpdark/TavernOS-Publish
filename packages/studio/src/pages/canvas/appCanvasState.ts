import type { CanvasWorkspaceSnapshot } from "./appWorkspaceSnapshot";
import type {
	NodePort,
	PortSide,
} from "./hooks/useConnectionInteractionHelpers";
import type { VideoFusionPlan } from "./mediaFusionPlanning";
import type { CanvasNode, NodeType } from "./canvas-types";
import type {
	ImageUpscaleSettings,
	VideoEnhanceSettings,
} from "./components/CanvasNodeView";

export type UploadIntent = {
	nodeId?: string;
	type?: Extract<NodeType, "image" | "video" | "audio" | "music" | "editor">;
	referenceSlot?: number;
	worldX?: number;
	worldY?: number;
} | null;

export type NodeSize = { width: number; height: number };
export type NodeAsset = NonNullable<CanvasNode["asset"]>;

export type MagnetPortState = {
	nodeId: string;
	side: PortSide;
	x: number;
	y: number;
} | null;

export type CanvasWorkspaceStorage = {
	workspaces?: Record<string, CanvasWorkspaceSnapshot>;
	version?: number;
};

export type VideoPreviewState = { nodeId: string; url: string } | null;
export type ImagePreviewState = {
	nodeId: string;
	url: string;
	name: string;
	isThreeDDirector?: boolean;
	providerMetadata?: unknown;
} | null;
export type FfmpegInstallPanelTarget =
	| "video-enhance"
	| "video-extend"
	| "image-upscale";

export type FfmpegInstallPromptState = {
	nodeId: string;
	message: string;
	panelToOpen?: FfmpegInstallPanelTarget;
} | null;

export type VideoFusionPromptState = {
	sourceNodeId: string;
	targetNodeId: string;
} | null;

export type VideoFusionAnalysisState = {
	loading: boolean;
	result: string | null;
	error: string | null;
	sourceBlob: Blob | null;
	targetBlob: Blob | null;
	targetResolution: { width: number; height: number } | null;
	plan: VideoFusionPlan | null;
} | null;

export type AddNodeMenuState =
	| { mode: "blank"; x: number; y: number; worldX: number; worldY: number }
	| {
			mode: "reference";
			x: number;
			y: number;
			worldX: number;
			worldY: number;
			from: NodePort;
	  };

export type PointerState =
	| { mode: "idle" }
	| {
			mode: "node-pointer-down";
			startX: number;
			startY: number;
			origin: Array<{ id: string; x: number; y: number }>;
	  }
	| {
			mode: "dragging-nodes";
			startX: number;
			startY: number;
			origin: Array<{ id: string; x: number; y: number }>;
	  }
	| {
			mode: "panning";
			startX: number;
			startY: number;
			originX: number;
			originY: number;
	  }
	| {
			mode: "selecting";
			startX: number;
			startY: number;
			currentX: number;
			currentY: number;
	  };

export const SIMPLE_VIDEO_FUSION_MODE = false;
export const DEFAULT_VIDEO_ENHANCE_SETTINGS: VideoEnhanceSettings = {
	fps: "60",
	scale: "2",
	accelerator: "cpu",
};
export const DEFAULT_IMAGE_UPSCALE_SETTINGS: ImageUpscaleSettings = {
	scale: "2",
};

export const ZOOM_MIN = 0.25;
export const ZOOM_MAX = 2.1;
