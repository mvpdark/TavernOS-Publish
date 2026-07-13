import { useCallback, type Dispatch, type SetStateAction } from "react";

import { getFilledReferenceAssets } from "../referenceAssetUtils";
import type {
	CanvasNode,
	ComposerPreset,
	NodeType,
	ReferenceAssetSlotInputList,
	StyleLibraryState,
} from "../canvas-types";
import { DEFAULT_KAKA_API_BASE_URL } from "./useKakaApiModels";
import { useKakaApiResultActions } from "./useKakaApiResultActions";
import { useKakaApiSend } from "./useKakaApiSend";
import type { NodeConnection } from "./useConnectionInteractionHelpers";
import type { RuntimeNotice } from "./useRuntimeNotices";
import { useScreenshotActions } from "./useScreenshotActions";
import { useTextVideoActions } from "./useTextVideoActions";

type PushRuntimeNotice = (
	message: string,
	tone?: RuntimeNotice["tone"],
	dedupeKey?: string,
) => void;

type GeneratedUploadResult = { cloudPath: string; url: string };

type UseCanvasPrimaryComposerSendArgs = {
	kakaApiBaseUrl: string;
	kakaApiKey: string;
	kakaApiTimeoutMs: number;
	primaryNode: CanvasNode | null;
	requestNode: CanvasNode | null;
	requestType: NodeType;
	requestComposer: ComposerPreset;
	primaryComposerPrompt: string;
	resolvedGatewayModel: string;
	resolvedRequestGatewayModel: string;
	promptPrefix: string;
	requestReferenceAssets: ReferenceAssetSlotInputList;
	composerByType: Record<NodeType, ComposerPreset>;
	globalStylePresetId: string;
	styleLibrary: StyleLibraryState;
	latestNodesRef: { current: CanvasNode[] };
	latestConnectionsRef: { current: NodeConnection[] };
	setNodes: Dispatch<SetStateAction<CanvasNode[]>>;
	setConnections: Dispatch<SetStateAction<NodeConnection[]>>;
	setSelectedIds: Dispatch<SetStateAction<string[]>>;
	pushRuntimeNotice: PushRuntimeNotice;
	pushUndoSnapshot: () => void;
	withTimeout: <T>(
		promise: Promise<T>,
		timeoutMs: number,
		message: string,
	) => Promise<T>;
	uploadGeneratedAssetToCloudDrive: (
		file: File,
		category: "video" | "audio" | "music" | "image",
	) => Promise<GeneratedUploadResult>;
};

export function useCanvasPrimaryComposerSend({
	kakaApiBaseUrl,
	kakaApiKey,
	kakaApiTimeoutMs,
	primaryNode,
	requestNode,
	requestType,
	requestComposer,
	primaryComposerPrompt,
	resolvedGatewayModel,
	resolvedRequestGatewayModel,
	promptPrefix,
	requestReferenceAssets,
	composerByType,
	globalStylePresetId,
	styleLibrary,
	latestNodesRef,
	latestConnectionsRef,
	setNodes,
	setConnections,
	setSelectedIds,
	pushRuntimeNotice,
	pushUndoSnapshot,
	withTimeout,
	uploadGeneratedAssetToCloudDrive,
}: UseCanvasPrimaryComposerSendArgs) {
	const {
		generatingNodeIds,
		setGeneratingNodeIds,
		handleKakaApiRequestStart,
		handleKakaApiRequestSettled,
		handleKakaApiSendSuccess,
	} = useKakaApiResultActions({
		requestNode,
		requestType,
		requestComposer,
		resolvedRequestGatewayModel,
		composerByType,
		globalStylePresetId,
		styleLibrary,
		setNodes,
		setSelectedIds,
		pushRuntimeNotice,
	});
	const { isSending: isSendingKakaRequest, send: handleComposerSend } =
		useKakaApiSend({
			baseUrl: kakaApiBaseUrl,
			defaultBaseUrl: DEFAULT_KAKA_API_BASE_URL,
			apiKey: kakaApiKey,
			timeoutMs: kakaApiTimeoutMs,
			nodeType: requestType,
			model: resolvedRequestGatewayModel,
			prompt: requestComposer.prompt,
			promptPrefix,
			composer: requestComposer,
			referenceAssets: getFilledReferenceAssets(requestReferenceAssets),
			sourceAsset: requestNode?.asset ?? null,
			requestScopeId: requestNode?.id ?? null,
			onNotice: pushRuntimeNotice,
			onRequestStart: handleKakaApiRequestStart,
			onRequestSettled: handleKakaApiRequestSettled,
			onSuccess: handleKakaApiSendSuccess,
		});
	const { handleVideoScreenshotFromText } = useScreenshotActions({
		primaryNode,
		promptPrefix,
		composerPrompt: primaryComposerPrompt,
		imageComposer: composerByType.image,
		globalStylePresetId,
		styleLibrary,
		latestNodesRef,
		latestConnectionsRef,
		pushRuntimeNotice,
		pushUndoSnapshot,
		setGeneratingNodeIds,
		setNodes,
		setConnections,
		setSelectedIds,
		withTimeout,
		uploadGeneratedAssetToCloudDrive,
	});
	const { handleTextWithConnectedVideo } = useTextVideoActions({
		primaryNode,
		promptPrefix,
		composerPrompt: primaryComposerPrompt,
		textComposer: composerByType.text,
		kakaApiBaseUrl,
		kakaApiKey,
		kakaApiTimeoutMs,
		resolvedGatewayModel,
		latestNodesRef,
		latestConnectionsRef,
		pushRuntimeNotice,
		setGeneratingNodeIds,
		setNodes,
	});
	const handlePrimaryComposerSend = useCallback(async () => {
		if (await handleVideoScreenshotFromText()) return;
		if (await handleTextWithConnectedVideo()) return;
		await handleComposerSend();
	}, [handleComposerSend, handleTextWithConnectedVideo, handleVideoScreenshotFromText]);
	const isPrimaryNodeSending = primaryNode
		? generatingNodeIds.has(primaryNode.id) ||
			(requestNode ? generatingNodeIds.has(requestNode.id) : false)
		: isSendingKakaRequest;

	return {
		generatingNodeIds,
		setGeneratingNodeIds,
		handlePrimaryComposerSend,
		isPrimaryNodeSending,
	};
}
