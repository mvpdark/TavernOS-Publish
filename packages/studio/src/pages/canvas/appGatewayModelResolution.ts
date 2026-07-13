import type { KakaUpstreamModelType } from "./kakaApi";
import { getModelDisplayLabel, getStoredModelValue } from "./modelOptions";
import { resolveTextModelForRequest } from "./textProviderRouting";
import type { ComposerPreset, NodeType } from "./canvas-types";

export type UpstreamModelValueMap = Record<
	KakaUpstreamModelType,
	Record<string, string>
>;

const UPSTREAM_MODEL_NODE_TYPES = new Set<NodeType>([
	"text",
	"image",
	"video",
	"audio",
	"music",
]);

function isUpstreamModelNodeType(type: NodeType): type is KakaUpstreamModelType {
	return UPSTREAM_MODEL_NODE_TYPES.has(type);
}

function uniqueNonEmpty(values: string[]) {
	return values.map((value) => value.trim()).filter(Boolean).filter(
		(value, index, list) => list.indexOf(value) === index,
	);
}

export function resolveGatewayModelForComposer({
	nodeType,
	composer,
	upstreamModelValueMap,
	labelAliases = [],
}: {
	nodeType: NodeType;
	composer: ComposerPreset;
	upstreamModelValueMap: UpstreamModelValueMap;
	labelAliases?: string[];
}) {
	if (
		nodeType === "editor" ||
		nodeType === "shot" ||
		nodeType === "character" ||
		nodeType === "scene"
	) {
		return composer.model;
	}
	if (!isUpstreamModelNodeType(nodeType)) {
		return composer.model;
	}

	const displayName = getModelDisplayLabel(composer.model).trim();
	const lookupKeys = uniqueNonEmpty([
		composer.model,
		...labelAliases,
		displayName,
	]);

	if (nodeType === "text") {
		const resolvedTextModel = resolveTextModelForRequest(composer.model, composer);
		if (resolvedTextModel) return resolvedTextModel;
	}

	const upstreamMatch = lookupKeys
		.map((key) => upstreamModelValueMap[nodeType]?.[key])
		.find(Boolean);
	if (upstreamMatch) return upstreamMatch;

	const storedMatch = lookupKeys
		.map((key) => getStoredModelValue(nodeType, key))
		.find(Boolean);
	return storedMatch ?? composer.model;
}
