import { useCallback, type Dispatch, type SetStateAction } from "react";

import { findConnectedVideoNodeForText } from "../canvasConnectionActions";
import { fetchLocalMediaAssetBlob, resolveReadableLocalMediaAsset } from "../appLocalMediaActions";
import {
	isLocalKakaApiBaseUrl,
	requestKakaChatCompletion,
	type KakaApiConfig,
} from "../kakaApi";
import {
	buildConnectedVideoContentParts,
	createConnectedVideoFrameTimes,
} from "../textVideoActions";
import type { CanvasNode, ComposerPreset } from "../canvas-types";
import {
	extractVideoKeyFramesFromBlob,
	getVideoBlobInfo,
} from "../videoFrameHelpers";
import { DEFAULT_KAKA_API_BASE_URL } from "./useKakaApiModels";
import type { NodeConnection } from "./useConnectionInteractionHelpers";
import type { RuntimeNotice } from "./useRuntimeNotices";

type UseTextVideoActionsArgs = {
	primaryNode: CanvasNode | null;
	promptPrefix: string;
	composerPrompt: string;
	textComposer: ComposerPreset;
	kakaApiBaseUrl: string;
	kakaApiKey: string;
	kakaApiTimeoutMs: number;
	resolvedGatewayModel: string;
	latestNodesRef: { current: CanvasNode[] };
	latestConnectionsRef: { current: NodeConnection[] };
	pushRuntimeNotice: (
		message: string,
		tone?: RuntimeNotice["tone"],
		dedupeKey?: string,
	) => void;
	setGeneratingNodeIds: Dispatch<SetStateAction<Set<string>>>;
	setNodes: Dispatch<SetStateAction<CanvasNode[]>>;
};

export function useTextVideoActions({
	primaryNode,
	promptPrefix,
	composerPrompt,
	textComposer,
	kakaApiBaseUrl,
	kakaApiKey,
	kakaApiTimeoutMs,
	resolvedGatewayModel,
	latestNodesRef,
	latestConnectionsRef,
	pushRuntimeNotice,
	setGeneratingNodeIds,
	setNodes,
}: UseTextVideoActionsArgs) {
	const handleTextWithConnectedVideo = useCallback(async () => {
		if (!primaryNode || primaryNode.type !== "text") return false;
		const textNode =
			latestNodesRef.current.find((node) => node.id === primaryNode.id) ??
			primaryNode;
		const videoNode = findConnectedVideoNodeForText(
			textNode.id,
			latestNodesRef.current,
			latestConnectionsRef.current,
		);
		const videoAsset = videoNode?.asset;
		const readableVideoAsset = resolveReadableLocalMediaAsset(videoAsset);
		if (!videoAsset || !readableVideoAsset) return false;
		const prompt =
			`${promptPrefix}${textNode.composer?.prompt ?? composerPrompt ?? ""}`.trim();
		if (!prompt) return false;

		const config: KakaApiConfig = {
			baseUrl: kakaApiBaseUrl.trim() || DEFAULT_KAKA_API_BASE_URL,
			apiKey: kakaApiKey.trim(),
			timeoutMs: kakaApiTimeoutMs,
		};
		const useLocalProxy = isLocalKakaApiBaseUrl(config.baseUrl);
		if (!config.apiKey && !useLocalProxy) {
			pushRuntimeNotice(
				"请先在设置页填写 kaka-api 令牌后，再发送文本节点请求。",
				"warning",
				"text-video-missing-kaka-key",
			);
			return true;
		}

		setGeneratingNodeIds((current) => {
			const next = new Set(current);
			next.add(textNode.id);
			return next;
		});
		try {
			pushRuntimeNotice(
				"检测到视频已连接到文本节点，正在抽取视频关键帧并随提示词一起发送给模型。",
				"info",
				`text-video-frames-start-${textNode.id}`,
			);
			const videoBlob = await fetchLocalMediaAssetBlob(readableVideoAsset, "视频素材");
			const videoInfo = await getVideoBlobInfo(videoBlob).catch(() => null);
			const frames = await extractVideoKeyFramesFromBlob(
				videoBlob,
				createConnectedVideoFrameTimes(videoInfo?.duration ?? 0),
			);
			const contentParts = buildConnectedVideoContentParts({
				prompt,
				assetName: videoAsset.name,
				videoInfo,
				frames,
			});
			const chatResult = await requestKakaChatCompletion(config, {
				model: resolvedGatewayModel,
				messages: [{ role: "user", content: contentParts }],
				stream: false,
			});
			const rawContent = chatResult.data.choices?.[0]?.message?.content;
			const content = typeof rawContent === "string" ? rawContent.trim() : "";
			if (!content) throw new Error("模型没有返回文本内容。");
			setNodes((current) =>
				current.map((node) =>
					node.id === textNode.id
						? {
								...node,
								composer: {
									...(node.composer ?? textComposer),
									prompt: content,
								},
							}
						: node,
				),
			);
			pushRuntimeNotice(
				"已把连接视频的关键帧发送给文本模型，并更新文本节点。",
				"info",
				`text-video-frames-success-${textNode.id}`,
			);
		} catch (error) {
			console.error("Failed to send connected video frames to text model.", error);
			pushRuntimeNotice(
				`发送连接视频给文本模型失败：${
					error instanceof Error ? error.message : "未知错误"
				}`,
				"warning",
				`text-video-frames-failed-${textNode.id}-${Date.now()}`,
			);
		} finally {
			setGeneratingNodeIds((current) => {
				if (!current.has(textNode.id)) return current;
				const next = new Set(current);
				next.delete(textNode.id);
				return next;
			});
		}
		return true;
	}, [
		composerPrompt,
		kakaApiBaseUrl,
		kakaApiKey,
		kakaApiTimeoutMs,
		latestConnectionsRef,
		latestNodesRef,
		primaryNode,
		promptPrefix,
		pushRuntimeNotice,
		resolvedGatewayModel,
		setGeneratingNodeIds,
		setNodes,
		textComposer,
	]);

	return { handleTextWithConnectedVideo };
}
