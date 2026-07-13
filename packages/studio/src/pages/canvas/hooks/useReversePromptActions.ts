import { useCallback, type Dispatch, type MutableRefObject, type SetStateAction } from "react";

import {
	resolveClassifierImageAssetInput,
	resolvePortableImageAssetInput,
} from "../appAssetRuntime";
import {
	extractChatCompletionText,
	extractReversePromptTextValue,
	resolveReversePromptRoute,
	unwrapKakaAlignedResponse,
} from "../appResponseParsing";
import {
	IDEOGRAM_DESCRIBE_MODEL,
	MIDJOURNEY_DESCRIBE_MODEL,
	REVERSE_PROMPT_CLASSIFIER_MAX_SIDE,
	REVERSE_PROMPT_VLM_MODEL,
} from "../appUiConfig";
import { createConnection } from "../canvasConnectionActions";
import { createCanvasNode, getDefaultNodeSize } from "../canvasNodeActions";
import { requestKakaChatCompletion, requestKakaImageGeneration, type KakaApiConfig } from "../kakaApi";
import { createStyleRef } from "../styleLibrary";
import type { CanvasNode, ComposerPreset, NodeType } from "../canvas-types";
import type { NodeConnection } from "./useConnectionInteractionHelpers";
import { DEFAULT_KAKA_API_BASE_URL } from "./useKakaApiModels";
import { isLocalKakaApiBaseUrl } from "../kakaApi";
import type { RuntimeNotice } from "./useRuntimeNotices";

type PushRuntimeNotice = (
	message: string,
	tone?: RuntimeNotice["tone"],
	dedupeKey?: string,
) => void;

type UseReversePromptActionsArgs = {
	latestNodesRef: MutableRefObject<CanvasNode[]>;
	textComposer: ComposerPreset;
	kakaApiBaseUrl: string;
	kakaApiKey: string;
	kakaApiTimeoutMs: number;
	reversePromptGeneratingNodeId: string | null;
	setReversePromptGeneratingNodeId: Dispatch<SetStateAction<string | null>>;
	setCropEditingNodeId: Dispatch<SetStateAction<string | null>>;
	setRedrawEditingNodeId: Dispatch<SetStateAction<string | null>>;
	setPerspectiveEditNodeId: Dispatch<SetStateAction<string | null>>;
	setNodes: Dispatch<SetStateAction<CanvasNode[]>>;
	setConnections: Dispatch<SetStateAction<NodeConnection[]>>;
	setComposerByType: Dispatch<SetStateAction<Record<NodeType, ComposerPreset>>>;
	setSelectedIds: Dispatch<SetStateAction<string[]>>;
	setActiveTool: Dispatch<SetStateAction<NodeType>>;
	pushRuntimeNotice: PushRuntimeNotice;
	pushUndoSnapshot: () => void;
};

function createReversePromptConfig({
	kakaApiBaseUrl,
	kakaApiKey,
	kakaApiTimeoutMs,
}: Pick<
	UseReversePromptActionsArgs,
	"kakaApiBaseUrl" | "kakaApiKey" | "kakaApiTimeoutMs"
>): KakaApiConfig {
	return {
		baseUrl: kakaApiBaseUrl.trim() || DEFAULT_KAKA_API_BASE_URL,
		apiKey: kakaApiKey.trim(),
		timeoutMs: kakaApiTimeoutMs,
	};
}

function hasReversePromptAccess(config: KakaApiConfig) {
	return Boolean(config.apiKey || isLocalKakaApiBaseUrl(config.baseUrl));
}

export function useReversePromptActions({
	latestNodesRef,
	textComposer,
	kakaApiBaseUrl,
	kakaApiKey,
	kakaApiTimeoutMs,
	reversePromptGeneratingNodeId,
	setReversePromptGeneratingNodeId,
	setCropEditingNodeId,
	setRedrawEditingNodeId,
	setPerspectiveEditNodeId,
	setNodes,
	setConnections,
	setComposerByType,
	setSelectedIds,
	setActiveTool,
	pushRuntimeNotice,
	pushUndoSnapshot,
}: UseReversePromptActionsArgs) {
	return useCallback(
		(nodeId: string) => {
			if (reversePromptGeneratingNodeId) {
				pushRuntimeNotice("图片反推中，请稍候。", "info", "reverse-prompt-in-progress");
				return;
			}

			const node = latestNodesRef.current.find((entry) => entry.id === nodeId);
			if (!node || node.type !== "image" || !node.asset?.url) {
				pushRuntimeNotice("请先选择一张已有图片，再进行反推。", "warning", "reverse-prompt-missing-image");
				return;
			}

			const config = createReversePromptConfig({ kakaApiBaseUrl, kakaApiKey, kakaApiTimeoutMs });
			if (!hasReversePromptAccess(config)) {
				pushRuntimeNotice("请先在设置页填写后台生成的 sk-kaka API 令牌。", "warning", "reverse-prompt-missing-key");
				return;
			}

			const sourceAsset = node.asset;
			setReversePromptGeneratingNodeId(nodeId);
			setSelectedIds([nodeId]);
			setCropEditingNodeId(null);
			setRedrawEditingNodeId(null);
			setPerspectiveEditNodeId(null);
			pushRuntimeNotice("正在识别图片类型，并自动选择 MJ 或 Ideogram 反推。", "info", "reverse-prompt-routing");

			void (async () => {
				try {
					const sourceImage = await resolvePortableImageAssetInput(sourceAsset);
					const classifierImage = await resolveClassifierImageAssetInput(
						sourceAsset,
						REVERSE_PROMPT_CLASSIFIER_MAX_SIDE,
					);
					const classificationResult = await requestKakaChatCompletion(config, {
						model: REVERSE_PROMPT_VLM_MODEL,
						stream: false,
						messages: [
							{
								role: "system",
								content:
									"You route image reverse-prompt requests. Reply with exactly one word: mj or ideogram.",
							},
							{
								role: "user",
								content: [
									{
										type: "text",
										text:
											"Classify this image for reverse prompting. Choose mj for illustration, concept art, cinematic images, cover atmosphere, artistic lighting, texture, composition, or mood. Choose ideogram for poster, logo, typography, text layout, commercial design, brand graphics, or design-heavy images. Reply only: mj or ideogram.",
									},
									{ type: "image_url", image_url: { url: classifierImage } },
								],
							},
						],
					});
					const route = resolveReversePromptRoute(
						extractChatCompletionText(classificationResult.data) ?? "mj",
					);
					const isIdeogramRoute = route === "ideogram";
					const describeResult = await requestKakaImageGeneration(config, {
						model: isIdeogramRoute ? IDEOGRAM_DESCRIBE_MODEL : MIDJOURNEY_DESCRIBE_MODEL,
						prompt: isIdeogramRoute
							? "反推这张图片，重点描述文字、Logo、版式、商业设计和海报元素。"
							: "反推这张图片，重点描述艺术风格、光影、质感、构图和氛围。",
						image: sourceImage,
						image_url: sourceImage,
						options: isIdeogramRoute
							? {
								ideogram_action: "describe",
								image: sourceImage,
								reference_images: [sourceImage],
							}
							: {
								midjourney_route: true,
								midjourney_action: "describe",
								action: "describe",
								botType: "MID_JOURNEY",
								image: sourceImage,
								reference_images: [sourceImage],
								base64Array: [sourceImage],
							},
					});
					const promptText = extractReversePromptTextValue(
						unwrapKakaAlignedResponse(describeResult.data),
					);
					if (!promptText) {
						throw new Error("反推完成，但接口没有返回可写入的提示词文本。");
					}
					const textSize = getDefaultNodeSize("text");
					const promptNode = createCanvasNode(
						"text",
						{ x: node.x + node.width + 42, y: node.y + Math.max(0, (node.height - textSize.height) / 2) },
						{
							...textComposer,
							prompt: promptText,
						},
						textSize,
						undefined,
						node.style ?? createStyleRef(),
					);
					pushUndoSnapshot();
					setNodes((current) => [...current, promptNode]);
					setConnections((current) => [
						...current,
						createConnection({ nodeId, side: "right" }, { nodeId: promptNode.id, side: "left" }),
					]);
					setComposerByType((current) => ({
						...current,
						text: { ...current.text, prompt: promptText },
					}));
					setSelectedIds([promptNode.id]);
					setActiveTool("text");
					pushRuntimeNotice(
						`${isIdeogramRoute ? "Ideogram" : "MJ"} 反推完成，提示词已写入右侧对话节点。`,
						"info",
						"reverse-prompt-success",
					);
				} catch (error) {
					console.error("[reverse-prompt] Request failed.", error);
					pushRuntimeNotice(
						error instanceof Error ? error.message : "图片反推失败，请检查 kaka-api 设置。",
						"warning",
						"reverse-prompt-failed",
					);
				} finally {
					setReversePromptGeneratingNodeId(null);
				}
			})();
		},
		[
			kakaApiBaseUrl,
			kakaApiKey,
			kakaApiTimeoutMs,
			latestNodesRef,
			pushRuntimeNotice,
			pushUndoSnapshot,
			reversePromptGeneratingNodeId,
			setActiveTool,
			setComposerByType,
			setConnections,
			setCropEditingNodeId,
			setNodes,
			setPerspectiveEditNodeId,
			setRedrawEditingNodeId,
			setReversePromptGeneratingNodeId,
			setSelectedIds,
			textComposer,
		],
	);
}
