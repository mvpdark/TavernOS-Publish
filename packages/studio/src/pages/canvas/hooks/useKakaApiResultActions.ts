import {
	useCallback,
	useState,
	type Dispatch,
	type SetStateAction,
} from "react";

import type {
	CanvasNode,
	ComposerPreset,
	NodeType,
	StyleLibraryState,
} from "../canvas-types";
import type { KakaApiSendSuccessPayload } from "./useKakaApiSend";
import { applyKakaApiSendSuccess } from "./useKakaApiSendSuccess";
import type { RuntimeNotice } from "./useRuntimeNotices";

type PushRuntimeNotice = (
	message: string,
	tone?: RuntimeNotice["tone"],
	dedupeKey?: string,
) => void;

type UseKakaApiResultActionsArgs = {
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

export function useKakaApiResultActions({
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
}: UseKakaApiResultActionsArgs) {
	const [generatingNodeIds, setGeneratingNodeIds] = useState<Set<string>>(
		() => new Set(),
	);

	const handleKakaApiRequestStart = useCallback((nodeId: string) => {
		setGeneratingNodeIds((current) => {
			const next = new Set(current);
			next.add(nodeId);
			return next;
		});
	}, []);

	const handleKakaApiRequestSettled = useCallback((nodeId: string) => {
		setGeneratingNodeIds((current) => {
			if (!current.has(nodeId)) return current;
			const next = new Set(current);
			next.delete(nodeId);
			return next;
		});
	}, []);

	const handleKakaApiSendSuccess = useCallback(
		(payload: KakaApiSendSuccessPayload) => {
			void applyKakaApiSendSuccess({
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
			});
		},
		[
			composerByType,
			globalStylePresetId,
			pushRuntimeNotice,
			requestComposer,
			requestNode,
			requestType,
			resolvedRequestGatewayModel,
			setNodes,
			setSelectedIds,
			styleLibrary,
		],
	);

	return {
		generatingNodeIds,
		setGeneratingNodeIds,
		handleKakaApiRequestStart,
		handleKakaApiRequestSettled,
		handleKakaApiSendSuccess,
	};
}
