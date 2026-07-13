import type { Dispatch, SetStateAction } from "react";

import { buildGeneratedAssetNodeUpdate } from "../appGeneratedAssetActions";
import { createStyleRef } from "../styleLibrary";
import type { CanvasNode, ComposerPreset, NodeType, StyleLibraryState } from "../canvas-types";
import type { KakaApiSendSuccessPayload } from "./useKakaApiSend";
import type { RuntimeNotice } from "./useRuntimeNotices";

type PushRuntimeNotice = (
	message: string,
	tone?: RuntimeNotice["tone"],
	dedupeKey?: string,
) => void;

type ApplyKakaApiSendSuccessArgs = {
	payload: KakaApiSendSuccessPayload;
	requestNode: CanvasNode | null;
	requestType: NodeType;
	requestComposer: ComposerPreset;
	resolvedRequestGatewayModel: string;
	composerByType: Record<NodeType, ComposerPreset>;
	globalStylePresetId: string;
	styleLibrary: StyleLibraryState;
	setNodes: Dispatch<SetStateAction<CanvasNode[]>>;
	setSelectedIds: Dispatch<SetStateAction<string[]>>;
	pushRuntimeNotice: PushRuntimeNotice;
};

export async function applyKakaApiSendSuccess({
	payload,
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
}: ApplyKakaApiSendSuccessArgs) {
	if (!requestNode) return;
	if (requestType === "text") {
		const nextText = payload.text?.trim();
		if (!nextText) return;
		setNodes((current) =>
			current.map((node) =>
				node.id === requestNode.id
					? {
							...node,
							composer: {
								...(node.composer ?? composerByType.text),
								prompt: nextText,
							},
						}
					: node,
			),
		);
		return;
	}

	const assetUrl = payload.assetUrl;
	if (!assetUrl) return;
	const {
		asset: nextAsset,
		generatedImageNodeSize,
		splitNodes,
		persistFailed,
		splitFailed,
	} = await buildGeneratedAssetNodeUpdate({
		payload: { ...payload, assetUrl },
		requestType,
		requestComposer,
		gatewayModel: resolvedRequestGatewayModel,
		requestNode,
		imageComposerFallback: composerByType.image,
		splitNodeStyle:
			requestNode.style ??
			createStyleRef(globalStylePresetId || undefined, "manual", styleLibrary),
	});
	if (persistFailed) {
		pushRuntimeNotice(
			"生成资产同步到 CloudDrive 失败，当前先保留原始结果链接。",
			"warning",
			"generated-asset-upload-failed",
		);
	}
	if (splitFailed) {
		pushRuntimeNotice(
			"MJ 原图已生成，但四宫格自动切分失败，请稍后重试。",
			"warning",
			"midjourney-grid-split-failed",
		);
	}
	setNodes((current) =>
		current
			.map((node) =>
				node.id === requestNode.id
					? {
							...node,
							...(generatedImageNodeSize
								? {
										width: generatedImageNodeSize.width,
										height: generatedImageNodeSize.height,
									}
								: {}),
							asset: nextAsset,
						}
					: node,
			)
			.concat(splitNodes),
	);
	if (splitNodes.length) {
		setSelectedIds(splitNodes.map((node) => node.id));
		pushRuntimeNotice(
			"MJ 四宫格已自动切分为 4 张独立图片。",
			"info",
			"midjourney-grid-split-success",
		);
	} else {
		setSelectedIds([requestNode.id]);
	}
}
