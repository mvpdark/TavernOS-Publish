import type { KakaApiConfig } from "./kakaApi";
import {
	getKakaApiConfigPreflightNotice,
	getKakaSendPreflightNotice,
	resolveKakaSendRouteContext,
	type KakaSendNotice,
	type KakaSendRouteContext,
} from "./kakaSendRouting";
import {
	getReferenceAssetsWithUrls,
	type ReferenceAssetWithUrl,
} from "./referenceAssetUtils";
import type { ComposerPreset, NodeType, ReferenceAsset } from "./canvas-types";

export type KakaApiSendPreflightParams = {
	baseUrl: string;
	defaultBaseUrl: string;
	apiKey: string;
	timeoutMs: number;
	nodeType: NodeType;
	model: string;
	prompt: string;
	promptPrefix: string;
	composer: ComposerPreset;
	referenceAssets: ReferenceAsset[];
	sourceAsset?: ReferenceAsset | null;
};

export type KakaApiSendRequestPlan = {
	config: KakaApiConfig;
	routeContext: KakaSendRouteContext;
	referenceAssets: ReferenceAssetWithUrl[];
};

export type KakaApiSendPreflightResult =
	| { kind: "notice"; notice: KakaSendNotice }
	| { kind: "ready"; plan: KakaApiSendRequestPlan };

export function buildKakaApiSendConfig({
	baseUrl,
	defaultBaseUrl,
	apiKey,
	timeoutMs,
}: Pick<KakaApiSendPreflightParams, "baseUrl" | "defaultBaseUrl" | "apiKey" | "timeoutMs">): KakaApiConfig {
	return {
		baseUrl: baseUrl.trim() || defaultBaseUrl,
		apiKey: apiKey.trim(),
		timeoutMs,
	};
}

export function resolveKakaApiSendPreflight({
	baseUrl,
	defaultBaseUrl,
	apiKey,
	timeoutMs,
	nodeType,
	model,
	prompt,
	promptPrefix,
	composer,
	referenceAssets,
	sourceAsset = null,
}: KakaApiSendPreflightParams): KakaApiSendPreflightResult {
	const requestReferenceAssets = getReferenceAssetsWithUrls(referenceAssets);
	const routeContext = resolveKakaSendRouteContext({
		nodeType,
		model,
		prompt,
		promptPrefix,
		composer,
		referenceAssets: requestReferenceAssets,
		sourceAsset,
	});
	const routeNotice = getKakaSendPreflightNotice({
		nodeType,
		model,
		referenceAssets: requestReferenceAssets,
		routeContext,
	});
	if (routeNotice) return { kind: "notice", notice: routeNotice };

	const config = buildKakaApiSendConfig({
		baseUrl,
		defaultBaseUrl,
		apiKey,
		timeoutMs,
	});
	const configNotice = getKakaApiConfigPreflightNotice(config);
	if (configNotice) return { kind: "notice", notice: configNotice };

	return {
		kind: "ready",
		plan: {
			config,
			routeContext,
			referenceAssets: requestReferenceAssets,
		},
	};
}
