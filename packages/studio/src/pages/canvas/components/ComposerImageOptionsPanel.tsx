import {
	IMAGE_REFERENCE_BEHAVIOR_HINT,
} from "../parameterPanelPresentation";
import type {
	ImageNumericPairSection,
	ImageSelectOptionSection,
	ImageSingleNumericSection,
} from "../imageOptionSections";
import {
	ImageHintBlock,
	ImageNumericOptionSection,
	ImageOptionSectionList,
	ImageSingleNumericOptionSection,
} from "./ComposerOptionSections";

export type ComposerImageOptionsPanelProps = {
	imageSummary: string;
	imagePrimaryHints: string[];
	imageSelectOptionSections: ImageSelectOptionSection[];
	imageCustomDimensionSection: ImageNumericPairSection | null;
	imageFormatAndControlSections: ImageSelectOptionSection[];
	imageNumericSections: ImageSingleNumericSection[];
	imageModeSections: ImageSelectOptionSection[];
};

export function ComposerImageOptionsPanel({
	imageSummary,
	imagePrimaryHints,
	imageSelectOptionSections,
	imageCustomDimensionSection,
	imageFormatAndControlSections,
	imageNumericSections,
	imageModeSections,
}: ComposerImageOptionsPanelProps) {
	return (
		<>
			<div className="image-options-panel__summary">
				<span className="image-options-panel__eyebrow">图像参数</span>
				<strong>{imageSummary}</strong>
				{imagePrimaryHints.length ? <p>{imagePrimaryHints[0]}</p> : null}
			</div>
			<ImageOptionSectionList sections={imageSelectOptionSections} />

			{imageCustomDimensionSection ? (
				<ImageNumericOptionSection
					label={imageCustomDimensionSection.label}
					firstLabel={imageCustomDimensionSection.firstLabel}
					firstValue={imageCustomDimensionSection.firstValue}
					secondLabel={imageCustomDimensionSection.secondLabel}
					secondValue={imageCustomDimensionSection.secondValue}
					onFirstChange={imageCustomDimensionSection.onFirstChange}
					onSecondChange={imageCustomDimensionSection.onSecondChange}
				/>
			) : null}

			<ImageOptionSectionList sections={imageFormatAndControlSections} />

			{imageNumericSections.map((section) => (
				<ImageSingleNumericOptionSection
					key={section.label}
					label={section.label}
					fieldLabel={section.fieldLabel}
					value={section.value}
					onChange={section.onChange}
				/>
			))}

			<ImageOptionSectionList sections={imageModeSections} />
			{imageModeSections.length ? (
				<ImageHintBlock>{IMAGE_REFERENCE_BEHAVIOR_HINT}</ImageHintBlock>
			) : null}
		</>
	);
}
