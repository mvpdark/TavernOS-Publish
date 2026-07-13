import { getModelDisplayLabel } from "../modelOptions";
import {
	formatImageAutoMetric,
	formatNodeMetric,
} from "../parameterPanelPresentation";
import type { PanelOption } from "../parameterPanelPresentation";
import type { CanvasInspectorMenuKey as MenuKey } from "../canvasInspectorTypes";
import {
	ModelSelectCard,
	RatioCard,
	renderSelectParamFields,
} from "./InspectorParamCards";
import type { SelectParamField } from "./InspectorParamCards";
import type { CanvasInspectorRenderState } from "./CanvasInspectorContentTypes";

export type CanvasInspectorPrimaryControlsProps = CanvasInspectorRenderState & {
	modelOptions: PanelOption[];
	primaryModeFields: Array<SelectParamField<MenuKey> | null | false | undefined>;
	onSwitchModel: (model: string) => void;
	isMidjourneyImageLayout: boolean;
	imageAspectRatioOptions: PanelOption[];
};

export function CanvasInspectorPrimaryControls({
	composer,
	modelOptions,
	primaryModeFields,
	openMenu,
	toggleMenu,
	closeMenu,
	selectAndClose,
	onSwitchModel,
	onUpdateImageOption,
	isMidjourneyImageLayout,
	imageAspectRatioOptions,
}: CanvasInspectorPrimaryControlsProps) {
	return (
		<>
			<ModelSelectCard
				value={formatNodeMetric(getModelDisplayLabel(composer.model))}
				selectedValue={composer.model}
				isOpen={openMenu === "model"}
				options={modelOptions}
				onToggle={() => toggleMenu("model")}
				onSelect={(value) => selectAndClose(() => onSwitchModel(value))}
			/>

			{renderSelectParamFields({
				fields: primaryModeFields,
				openMenu,
				onToggle: toggleMenu,
				onAfterSelect: closeMenu,
			})}

			{isMidjourneyImageLayout && imageAspectRatioOptions.length ? (
				<RatioCard
					value={formatImageAutoMetric(composer.aspectRatio)}
					selectedValue={composer.aspectRatio}
					isOpen={openMenu === "imageAspectRatio"}
					options={imageAspectRatioOptions}
					onToggle={() => toggleMenu("imageAspectRatio")}
					onSelect={(value) =>
						selectAndClose(() => onUpdateImageOption("aspectRatio", value))
					}
				/>
			) : null}
		</>
	);
}
