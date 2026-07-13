import type { ImageComposerOptionKey } from "../appComposerOptionUpdates";
import type { CanvasInspectorMenuKey as MenuKey } from "../canvasInspectorTypes";
import type { InspectorVoiceCatalogState } from "../canvasInspectorVoiceCatalog";
import type { PanelOption } from "../parameterPanelPresentation";
import type {
	ComposerPreset,
	NodeStyleRef,
	StyleCategory,
	StylePreset,
} from "../canvas-types";
import type {
	InspectorParameterFieldBundle as BaseInspectorParameterFieldBundle,
	SelectParamField,
} from "./InspectorParamCards";

export type { InspectorVoiceCatalogState } from "../canvasInspectorVoiceCatalog";

export type InspectorParameterFieldBundle =
	BaseInspectorParameterFieldBundle<MenuKey>;

export type InspectorMenuControls = {
	openMenu: MenuKey | null;
	toggleMenu: (menuKey: MenuKey) => void;
	closeMenu: () => void;
	selectAndClose: (action: () => void) => void;
};

export type CanvasInspectorRenderState = InspectorMenuControls & {
	composer: ComposerPreset;
	selectedStyle?: NodeStyleRef | null;
	onUpdateImageOption: (
		key: ImageComposerOptionKey,
		value: string | boolean,
	) => void;
};

export type InspectorStyleRenderState = {
	styleLabel: string;
	styleCategories: StyleCategory[];
	activeStyleCategoryId: string | null;
	activeStylePresets: StylePreset[];
	previewPreset: StylePreset | null;
	setActiveStyleCategoryId: (categoryId: string) => void;
	setHoveredStylePresetId: (presetId: string) => void;
};

export type CanvasInspectorContentProps = CanvasInspectorRenderState &
	InspectorStyleRenderState & {
		projectTitle: string;
		modeLabel: string;
		modelOptions: PanelOption[];
		onSwitchModel: (model: string) => void;
		onChangeStyle: (presetId: string) => void;
		isImageLikeNode: boolean;
		isVideoNode: boolean;
		isAudioNode: boolean;
		isMusicNode: boolean;
		isShotNode: boolean;
		isMidjourneyImageLayout: boolean;
		imageAspectRatioOptions: PanelOption[];
		primaryModeFields: Array<SelectParamField<MenuKey> | null | false | undefined>;
		imageParameterFields: InspectorParameterFieldBundle;
		videoParameterFields: InspectorParameterFieldBundle;
		shotParameterFields: InspectorParameterFieldBundle;
		musicParameterFields: InspectorParameterFieldBundle;
		voiceCatalogState: InspectorVoiceCatalogState;
		isVoiceCatalogLoading?: boolean;
		voiceAliasDraft: string;
		setVoiceAliasDraft: (value: string) => void;
		voiceIdDraft: string;
		setVoiceIdDraft: (value: string) => void;
		voiceAliasSaveId: string;
		onRefreshVoiceCatalog?: () => void;
		onSelectVoice?: (voiceId: string, displayName: string) => void;
		onSaveVoiceAlias?: (voiceId: string, displayName: string) => void;
	};
