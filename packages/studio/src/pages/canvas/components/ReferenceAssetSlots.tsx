import {
	REFERENCE_IMAGE_SLOT_PREFIX,
	formatReferenceAssetSlotTitle,
	getReferenceAssetSlotKey,
} from "../referenceAssetSlotPresentation";
import type { ReferenceAssetSlotInputList } from "../canvas-types";

type ReferenceAssetSlotsProps = {
	labels: readonly string[];
	referenceAssets: ReferenceAssetSlotInputList;
	canAddReferenceAsset: boolean;
	titlePrefix?: string;
	onUploadReferenceAsset?: (slotIndex: number) => void;
};

export function ReferenceAssetSlots({
	labels,
	referenceAssets,
	canAddReferenceAsset,
	titlePrefix = REFERENCE_IMAGE_SLOT_PREFIX,
	onUploadReferenceAsset,
}: ReferenceAssetSlotsProps) {
	if (!labels.length) return null;

	return (
		<div
			className={`composer__media-tools ${canAddReferenceAsset ? "" : "composer__media-tools--limit-reached"}`.trim()}
		>
			{labels.map((label, index) => {
				const asset = referenceAssets[index];
				return (
					<div
						key={getReferenceAssetSlotKey(label, index, asset)}
						className={`composer-reference-slot ${asset ? "has-asset" : ""}`}
					>
						<span className="composer-reference-slot__label">{label}</span>
						{asset ? (
							<div
								className="composer-reference-thumb"
								title={formatReferenceAssetSlotTitle(titlePrefix, asset)}
							>
								<img src={asset.url} alt={asset.name} draggable={false} />
							</div>
						) : canAddReferenceAsset ? (
							<button
								className="tool-square"
								type="button"
								onPointerDown={(event) => event.stopPropagation()}
								onClick={(event) => {
									event.stopPropagation();
									onUploadReferenceAsset?.(index);
								}}
							>
								+
							</button>
						) : (
							<div className="composer-reference-slot__empty" />
						)}
					</div>
				);
			})}
		</div>
	);
}
