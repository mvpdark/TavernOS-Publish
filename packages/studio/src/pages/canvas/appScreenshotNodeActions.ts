import { createConnection } from "./canvasConnectionActions";
import { createCanvasNode, getDefaultNodeSize } from "./canvasNodeActions";
import { createStyleRef } from "./styleLibrary";
import type { NodeConnection } from "./hooks/useConnectionInteractionHelpers";
import type {
	CanvasNode,
	ComposerPreset,
	StyleLibraryState,
} from "./canvas-types";

type ScreenshotSize = { width: number; height: number } | null;
type UploadedAsset = { cloudPath: string; url: string };

export function buildVideoScreenshotPrompt({
	promptPrefix,
	nodePrompt,
	composerPrompt,
}: {
	promptPrefix: string;
	nodePrompt?: string;
	composerPrompt?: string;
}) {
	return `${promptPrefix}${nodePrompt ?? composerPrompt ?? ""}`.trim();
}

export function createScreenshotImageNode({
	textNode,
	imageComposer,
	screenshotFile,
	localUrl,
	screenshotSize,
	globalStylePresetId,
	styleLibrary,
}: {
	textNode: CanvasNode;
	imageComposer: ComposerPreset;
	screenshotFile: File;
	localUrl: string;
	screenshotSize: ScreenshotSize;
	globalStylePresetId: string;
	styleLibrary: StyleLibraryState;
}) {
	return createCanvasNode(
		"image",
		{
			x: textNode.x + textNode.width + 120,
			y: textNode.y,
		},
		imageComposer,
		screenshotSize ?? getDefaultNodeSize("image"),
		{
			name: screenshotFile.name,
			url: localUrl,
			mime: "image/png",
		},
		textNode.style ??
			createStyleRef(globalStylePresetId || undefined, "manual", styleLibrary),
	);
}

export function createScreenshotConnection(
	textNodeId: string,
	imageNodeId: string,
): NodeConnection {
	return createConnection(
		{ nodeId: textNodeId, side: "right" },
		{ nodeId: imageNodeId, side: "left" },
	);
}

export function applyUploadedScreenshotAsset({
	nodes,
	imageNodeId,
	screenshotFile,
	localUrl,
	uploaded,
}: {
	nodes: CanvasNode[];
	imageNodeId: string;
	screenshotFile: File;
	localUrl: string;
	uploaded: UploadedAsset;
}) {
	return nodes.map((node) =>
		node.id === imageNodeId
			? {
					...node,
					asset: {
						...(node.asset ?? {
							name: screenshotFile.name,
							mime: "image/png",
							url: localUrl,
						}),
						url: uploaded.url,
						cloudPath: uploaded.cloudPath,
					},
				}
			: node,
	);
}
