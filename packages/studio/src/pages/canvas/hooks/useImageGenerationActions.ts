import { useCallback, type Dispatch, type MutableRefObject, type SetStateAction } from "react";

import { getBaseNameWithoutExtension, resolvePortableImageAssetInput } from "../appAssetRuntime";
import { getImageNodeSize, measureImageIntrinsicSize } from "../appCanvasMediaHelpers";
import type { NodeAsset } from "../appCanvasState";
import { persistGeneratedAsset } from "../appGeneratedAssetActions";
import {
	buildPerspectiveEditPrompt,
	buildPerspectiveNegativePrompt,
} from "../appPerspectivePrompts";
import {
	buildThreeDDirectorImageRequest,
	createThreeDDirectorCanvasNode,
	createThreeDDirectorMetadata,
	createThreeDDirectorProviderContext,
	createThreeDDirectorResultAsset,
	resolveThreeDDirectorAssetUrl,
} from "../appThreeDDirector";
import { createCanvasNode } from "../canvasNodeActions";
import type { PerspectiveEditSettings } from "../components/CanvasNodeView";
import {
	extractFirstAssetUrl,
	unwrapKakaAlignedResponse,
} from "../appResponseParsing";
import { createStyleRef } from "../styleLibrary";
import type { CanvasNode, ComposerPreset, NodeType } from "../canvas-types";
import {
	type KakaApiConfig,
	isLocalKakaApiBaseUrl,
	requestKakaImageGeneration,
} from "../kakaApi";
import {
	DEFAULT_KAKA_API_BASE_URL,
} from "./useKakaApiModels";
import type { RuntimeNotice } from "./useRuntimeNotices";
import {
	IDEOGRAM_INPAINT_MODEL,
	PERSPECTIVE_EDIT_MODEL,
} from "../appUiConfig";

type PushRuntimeNotice = (
	message: string,
	tone?: RuntimeNotice["tone"],
	dedupeKey?: string,
) => void;

type UseImageGenerationActionsArgs = {
	latestNodesRef: MutableRefObject<CanvasNode[]>;
	primaryComposer: ComposerPreset;
	imageComposer: ComposerPreset;
	kakaApiBaseUrl: string;
	kakaApiKey: string;
	kakaApiTimeoutMs: number;
	redrawGeneratingNodeId: string | null;
	perspectiveGeneratingNodeId: string | null;
	threeDDirectorGeneratingNodeId: string | null;
	perspectiveEditSettings: PerspectiveEditSettings;
	setRedrawGeneratingNodeId: Dispatch<SetStateAction<string | null>>;
	setPerspectiveGeneratingNodeId: Dispatch<SetStateAction<string | null>>;
	setThreeDDirectorGeneratingNodeId: Dispatch<SetStateAction<string | null>>;
	setRedrawEditingNodeId: Dispatch<SetStateAction<string | null>>;
	setPerspectiveEditNodeId: Dispatch<SetStateAction<string | null>>;
	setNodes: Dispatch<SetStateAction<CanvasNode[]>>;
	setSelectedIds: Dispatch<SetStateAction<string[]>>;
	setActiveTool: Dispatch<SetStateAction<NodeType>>;
	pushRuntimeNotice: PushRuntimeNotice;
	pushUndoSnapshot: () => void;
};

function createKakaGenerationConfig({
	kakaApiBaseUrl,
	kakaApiKey,
	kakaApiTimeoutMs,
}: Pick<
	UseImageGenerationActionsArgs,
	"kakaApiBaseUrl" | "kakaApiKey" | "kakaApiTimeoutMs"
>): KakaApiConfig {
	return {
		baseUrl: kakaApiBaseUrl.trim() || DEFAULT_KAKA_API_BASE_URL,
		apiKey: kakaApiKey.trim(),
		timeoutMs: kakaApiTimeoutMs,
	};
}

function hasKakaGenerationAccess(config: KakaApiConfig) {
	return Boolean(config.apiKey || isLocalKakaApiBaseUrl(config.baseUrl));
}

async function persistImageResultAsset(
	assetUrl: string,
	nextAsset: NodeAsset,
	providerContext: Pick<NodeAsset, "provider" | "providerModel" | "providerMetadata">,
) {
	return {
		...(await persistGeneratedAsset(
			assetUrl,
			{ assetName: nextAsset.name, assetMime: nextAsset.mime },
			"image",
		)),
		...providerContext,
	};
}

export function useImageGenerationActions({
	latestNodesRef,
	primaryComposer,
	imageComposer,
	kakaApiBaseUrl,
	kakaApiKey,
	kakaApiTimeoutMs,
	redrawGeneratingNodeId,
	perspectiveGeneratingNodeId,
	threeDDirectorGeneratingNodeId,
	perspectiveEditSettings,
	setRedrawGeneratingNodeId,
	setPerspectiveGeneratingNodeId,
	setThreeDDirectorGeneratingNodeId,
	setRedrawEditingNodeId,
	setPerspectiveEditNodeId,
	setNodes,
	setSelectedIds,
	setActiveTool,
	pushRuntimeNotice,
	pushUndoSnapshot,
}: UseImageGenerationActionsArgs) {
	const handleRedrawGenerate = useCallback(
		(nodeId: string, maskDataUrl: string) => {
			if (redrawGeneratingNodeId) {
				pushRuntimeNotice("局部重绘生成中，请稍候。", "info", "redraw-edit-in-progress");
				return;
			}

			const node = latestNodesRef.current.find((entry) => entry.id === nodeId);
			if (!node || node.type !== "image" || !node.asset?.url) {
				pushRuntimeNotice("请先选择一张已有图片，再进行局部重绘。", "warning", "redraw-edit-missing-image");
				return;
			}
			const prompt = (primaryComposer.prompt || node.composer?.prompt || "").trim();
			if (!prompt) {
				pushRuntimeNotice("请先在输入框描述想把涂抹区域改成什么。", "warning", "redraw-edit-missing-prompt");
				return;
			}

			const config = createKakaGenerationConfig({ kakaApiBaseUrl, kakaApiKey, kakaApiTimeoutMs });
			if (!hasKakaGenerationAccess(config)) {
				pushRuntimeNotice("请先在设置页填写后台生成的 sk-kaka API 令牌。", "warning", "redraw-edit-missing-key");
				return;
			}

			const sourceAsset = node.asset;
			setRedrawGeneratingNodeId(nodeId);
			setSelectedIds([nodeId]);

			void (async () => {
				try {
					const sourceImage = await resolvePortableImageAssetInput(sourceAsset);
					const result = await requestKakaImageGeneration(config, {
						model: IDEOGRAM_INPAINT_MODEL,
						prompt,
						image: sourceImage,
						image_url: sourceImage,
						options: {
							ideogram_action: "edit",
							image: sourceImage,
							reference_images: [sourceImage],
							mask: maskDataUrl,
							mask_url: maskDataUrl,
							magic_prompt: primaryComposer.promptExtend === "false" ? "OFF" : "AUTO",
							style_type: "AUTO",
						},
					});
					const assetUrl = extractFirstAssetUrl(unwrapKakaAlignedResponse(result.data));
					if (!assetUrl) {
						throw new Error("Ideogram 局部重绘成功，但未返回可用图片 URL。");
					}
					const providerContext = {
						provider: "ideogram",
						providerModel: IDEOGRAM_INPAINT_MODEL,
					} satisfies Pick<NodeAsset, "provider" | "providerModel">;
					let nextAsset: NodeAsset = {
						name: `${getBaseNameWithoutExtension(sourceAsset.name || "ideogram-redraw")}-重绘.png`,
						url: assetUrl,
						mime: "image/png",
						...providerContext,
					};
					try {
						nextAsset = await persistImageResultAsset(assetUrl, nextAsset, providerContext);
					} catch (error) {
						console.warn("Failed to persist Ideogram redraw asset.", error);
						pushRuntimeNotice(
							"局部重绘结果同步到 CloudDrive 失败，当前先保留原始结果链接。",
							"warning",
							"redraw-edit-upload-failed",
						);
					}
					const generatedNode = createCanvasNode(
						"image",
						{ x: node.x + node.width + 34, y: node.y },
						{ ...(node.composer ?? imageComposer), model: "Ideogram", version: "局部重绘", prompt },
						{ width: node.width, height: node.height },
						nextAsset,
						node.style ?? createStyleRef(),
					);
					pushUndoSnapshot();
					setNodes((current) => [...current, generatedNode]);
					setSelectedIds([generatedNode.id]);
					setActiveTool("image");
					setRedrawEditingNodeId(null);
					pushRuntimeNotice("Ideogram 局部重绘完成，并放在当前图片右侧。", "info", "redraw-edit-success");
				} catch (error) {
					console.error("[redraw-edit] Request failed.", error);
					pushRuntimeNotice(
						error instanceof Error ? error.message : "Ideogram 局部重绘失败，请检查 kaka-api 设置。",
						"warning",
						"redraw-edit-failed",
					);
				} finally {
					setRedrawGeneratingNodeId(null);
				}
			})();
		},
		[
			imageComposer,
			kakaApiBaseUrl,
			kakaApiKey,
			kakaApiTimeoutMs,
			latestNodesRef,
			primaryComposer.prompt,
			primaryComposer.promptExtend,
			pushRuntimeNotice,
			pushUndoSnapshot,
			redrawGeneratingNodeId,
			setActiveTool,
			setNodes,
			setRedrawEditingNodeId,
			setRedrawGeneratingNodeId,
			setSelectedIds,
		],
	);

	const handlePerspectiveEditGenerate = useCallback(
		(nodeId: string) => {
			if (perspectiveGeneratingNodeId) {
				pushRuntimeNotice("视角资产生成中，请稍候。", "info", "perspective-edit-in-progress");
				return;
			}

			const node = latestNodesRef.current.find((entry) => entry.id === nodeId);
			if (!node || node.type !== "image" || !node.asset?.url) {
				pushRuntimeNotice("请先选择一张已有图片，再生成视角资产。", "warning", "perspective-edit-missing-image");
				return;
			}

			const config = createKakaGenerationConfig({ kakaApiBaseUrl, kakaApiKey, kakaApiTimeoutMs });
			if (!hasKakaGenerationAccess(config)) {
				pushRuntimeNotice("请先在设置页填写后台生成的 sk-kaka API 令牌。", "warning", "perspective-edit-missing-key");
				return;
			}

			const sourceAsset = node.asset;
			setPerspectiveGeneratingNodeId(nodeId);
			setSelectedIds([nodeId]);

			void (async () => {
				try {
					const sourceImage = await resolvePortableImageAssetInput(sourceAsset);
					const prompt = buildPerspectiveEditPrompt(
						perspectiveEditSettings,
						sourceAsset.name,
					);
					const negativePrompt = buildPerspectiveNegativePrompt(perspectiveEditSettings);
					const zoomScale = Number((1 + perspectiveEditSettings.zoom / 100).toFixed(2));
					const result = await requestKakaImageGeneration(config, {
						model: PERSPECTIVE_EDIT_MODEL,
						prompt,
						negative_prompt: negativePrompt,
						image: sourceImage,
						image_url: sourceImage,
						options: {
							gpt_image_route: true,
							gpt_image_mode: "高级",
							gpt_image_has_references: true,
							image: sourceImage,
							image_url: sourceImage,
							source_image: sourceImage,
							reference_images: [sourceImage],
							images: [sourceImage],
							negative_prompt: negativePrompt,
							size: "auto",
							quality: "auto",
							output_format: "png",
							format: "png",
							background: "auto",
							n: 1,
							edit_mode: "perspective",
							camera_yaw: perspectiveEditSettings.yaw,
							camera_pitch: perspectiveEditSettings.pitch,
							camera_roll: perspectiveEditSettings.roll,
							zoom: perspectiveEditSettings.zoom,
							zoom_percent: perspectiveEditSettings.zoom,
							scale: zoomScale,
							framing: perspectiveEditSettings.zoom > 0 ? "closer" : "unchanged",
							lens_mm: perspectiveEditSettings.lens,
							perspective_preset: perspectiveEditSettings.preset,
						},
					});
					const assetUrl = extractFirstAssetUrl(unwrapKakaAlignedResponse(result.data));
					if (!assetUrl) {
						throw new Error("kaka-api 视角编辑成功，但未返回可用图片 URL。");
					}
					const providerContext = {
						provider: "gpt-image-2",
						providerModel: PERSPECTIVE_EDIT_MODEL,
					} satisfies Pick<NodeAsset, "provider" | "providerModel">;
					let nextAsset: NodeAsset = {
						name: `${getBaseNameWithoutExtension(sourceAsset.name || "perspective-edit")}-视角.png`,
						url: assetUrl,
						mime: "image/png",
						...providerContext,
					};
					try {
						nextAsset = await persistImageResultAsset(assetUrl, nextAsset, providerContext);
					} catch (error) {
						console.warn("Failed to persist perspective edit asset.", error);
						pushRuntimeNotice(
							"视角资产同步到 CloudDrive 失败，当前先保留原始结果链接。",
							"warning",
							"perspective-edit-upload-failed",
						);
					}
					const generatedNode = createCanvasNode(
						"image",
						{ x: node.x + node.width + 34, y: node.y },
						{ ...(node.composer ?? imageComposer), prompt },
						{ width: node.width, height: node.height },
						nextAsset,
						node.style ?? createStyleRef(),
					);
					pushUndoSnapshot();
					setNodes((current) => [...current, generatedNode]);
					setSelectedIds([generatedNode.id]);
					setActiveTool("image");
					setPerspectiveEditNodeId(null);
					pushRuntimeNotice("视角资产已生成，并放在当前图片后方。", "info", "perspective-edit-success");
				} catch (error) {
					console.error("[perspective-edit] Request failed.", error);
					pushRuntimeNotice(
						error instanceof Error ? error.message : "视角资产生成失败，请检查 kaka-api 设置。",
						"warning",
						"perspective-edit-failed",
					);
				} finally {
					setPerspectiveGeneratingNodeId(null);
				}
			})();
		},
		[
			imageComposer,
			kakaApiBaseUrl,
			kakaApiKey,
			kakaApiTimeoutMs,
			latestNodesRef,
			perspectiveEditSettings,
			perspectiveGeneratingNodeId,
			pushRuntimeNotice,
			pushUndoSnapshot,
			setActiveTool,
			setNodes,
			setPerspectiveEditNodeId,
			setPerspectiveGeneratingNodeId,
			setSelectedIds,
		],
	);

	const handleThreeDDirectorGenerate = useCallback(
		(nodeId: string) => {
			if (threeDDirectorGeneratingNodeId) {
				pushRuntimeNotice("3D导演台生成中，请稍候。", "info", "three-d-director-in-progress");
				return;
			}

			const node = latestNodesRef.current.find((entry) => entry.id === nodeId);
			if (!node || node.type !== "image") {
				pushRuntimeNotice("请先选择一张已有图片，再使用 3D导演台。", "warning", "three-d-director-missing-image");
				return;
			}
			const sourceAsset = node.asset;
			const sourceAssetUrl = resolveThreeDDirectorAssetUrl(sourceAsset);
			if (!sourceAsset || !sourceAssetUrl) {
				pushRuntimeNotice("请先选择一张已有图片，再使用 3D导演台。", "warning", "three-d-director-missing-image");
				return;
			}

			const config = createKakaGenerationConfig({ kakaApiBaseUrl, kakaApiKey, kakaApiTimeoutMs });
			if (!hasKakaGenerationAccess(config)) {
				pushRuntimeNotice("请先在设置页填写后台生成的 sk-kaka API 令牌。", "warning", "three-d-director-missing-key");
				return;
			}

			setThreeDDirectorGeneratingNodeId(nodeId);
			setSelectedIds([nodeId]);

			void (async () => {
				try {
					const sourceImage = await resolvePortableImageAssetInput(sourceAsset);
					const sourceIntrinsicSize =
						(await measureImageIntrinsicSize(sourceAssetUrl)) ??
						(sourceImage.startsWith("data:image/")
							? await measureImageIntrinsicSize(sourceImage)
							: null);
					const directorNodeSize = sourceIntrinsicSize
						? getImageNodeSize(sourceIntrinsicSize.width, sourceIntrinsicSize.height)
						: { width: node.width, height: node.height };
					const result = await requestKakaImageGeneration(
						config,
						buildThreeDDirectorImageRequest(sourceImage),
					);
					const assetUrl = extractFirstAssetUrl(unwrapKakaAlignedResponse(result.data));
					if (!assetUrl) {
						throw new Error("GPT Image 2 已完成请求，但未返回可用图片 URL。");
					}
					const directorMetadata = createThreeDDirectorMetadata({
						sourceWidth: sourceIntrinsicSize?.width ?? node.width,
						sourceHeight: sourceIntrinsicSize?.height ?? node.height,
					});
					const providerContext = createThreeDDirectorProviderContext(directorMetadata);
					let nextAsset: NodeAsset = createThreeDDirectorResultAsset({
						sourceName: getBaseNameWithoutExtension(sourceAsset.name || "3d-director"),
						resultUrl: assetUrl,
						metadata: directorMetadata,
					});
					try {
						nextAsset = await persistImageResultAsset(assetUrl, nextAsset, providerContext);
					} catch (error) {
						console.warn("Failed to persist 3D director asset.", error);
						pushRuntimeNotice(
							"3D导演台结果同步到 CloudDrive 失败，当前先保留原始结果链接。",
							"warning",
							"three-d-director-upload-failed",
						);
					}
					const generatedNode = createThreeDDirectorCanvasNode({
						sourceNode: node,
						baseComposer: imageComposer,
						directorNodeSize,
						resultAsset: nextAsset,
					});
					generatedNode.title = "3D导演台";
					pushUndoSnapshot();
					setNodes((current) => [...current, generatedNode]);
					setSelectedIds([generatedNode.id]);
					setActiveTool("image");
					pushRuntimeNotice(
						"3D导演台已调用 GPT Image 2 生成 720° 全景图，并放在当前图片右侧。",
						"info",
						"three-d-director-success",
					);
				} catch (error) {
					console.error("[three-d-director] Request failed.", error);
					pushRuntimeNotice(
						error instanceof Error ? error.message : "3D导演台生成失败，请检查 kaka-api 设置。",
						"warning",
						"three-d-director-failed",
					);
				} finally {
					setThreeDDirectorGeneratingNodeId(null);
				}
			})();
		},
		[
			imageComposer,
			kakaApiBaseUrl,
			kakaApiKey,
			kakaApiTimeoutMs,
			latestNodesRef,
			pushRuntimeNotice,
			pushUndoSnapshot,
			setActiveTool,
			setNodes,
			setSelectedIds,
			setThreeDDirectorGeneratingNodeId,
			threeDDirectorGeneratingNodeId,
		],
	);

	return {
		handleRedrawGenerate,
		handlePerspectiveEditGenerate,
		handleThreeDDirectorGenerate,
	};
}
