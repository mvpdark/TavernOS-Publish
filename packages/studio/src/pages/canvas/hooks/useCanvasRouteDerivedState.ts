import { useMemo } from "react";

import {
	getKakaApiValidationTone,
} from "../appDisplayHelpers";
import {
	resolveGatewayModelForComposer,
	type UpstreamModelValueMap,
} from "../appGatewayModelResolution";
import { getStyleReferenceCounts } from "../styleNodeHelpers";
import type { CanvasNode, ComposerPreset, NodeType } from "../canvas-types";
import type { KakaApiValidationState } from "./useKakaApiModels";

type UseCanvasRouteDerivedStateArgs = {
	nodes: CanvasNode[];
	primaryType: NodeType;
	composer: ComposerPreset;
	requestType: NodeType;
	requestComposer: ComposerPreset;
	upstreamModelValueMap: UpstreamModelValueMap;
	resolvedComposerGatewayLabel: string;
	kakaApiValidation: KakaApiValidationState;
};

export function useCanvasRouteDerivedState({
	nodes,
	primaryType,
	composer,
	requestType,
	requestComposer,
	upstreamModelValueMap,
	resolvedComposerGatewayLabel,
	kakaApiValidation,
}: UseCanvasRouteDerivedStateArgs) {
	const resolvedGatewayModel = useMemo(
		() =>
			resolveGatewayModelForComposer({
				nodeType: primaryType,
				composer,
				upstreamModelValueMap,
				labelAliases: [resolvedComposerGatewayLabel],
			}),
		[
			composer,
			primaryType,
			resolvedComposerGatewayLabel,
			upstreamModelValueMap,
		],
	);
	const resolvedRequestGatewayModel = useMemo(
		() =>
			resolveGatewayModelForComposer({
				nodeType: requestType,
				composer: requestComposer,
				upstreamModelValueMap,
			}),
		[requestComposer, requestType, upstreamModelValueMap],
	);
	const styleReferenceCounts = useMemo(
		() => getStyleReferenceCounts(nodes),
		[nodes],
	);
	const kakaApiValidationTone = useMemo(
		() => getKakaApiValidationTone(kakaApiValidation),
		[kakaApiValidation],
	);

	return {
		resolvedGatewayModel,
		resolvedRequestGatewayModel,
		styleReferenceCounts,
		kakaApiValidationTone,
	};
}
