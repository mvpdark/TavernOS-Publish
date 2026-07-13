import { useEffect, useMemo, type Dispatch, type SetStateAction } from "react";

import { NODE_MODELS } from "../appNodeModelConfig";
import { buildModelOptionCatalog } from "../modelOptions";

type UseWorkshopTextModelOptionsArgs = {
	upstreamTextModels: string[];
	workshopTextModel: string;
	setWorkshopTextModel: Dispatch<SetStateAction<string>>;
};

export function useWorkshopTextModelOptions({
	upstreamTextModels,
	workshopTextModel,
	setWorkshopTextModel,
}: UseWorkshopTextModelOptionsArgs) {
	const workshopTextModelCatalog = useMemo(
		() =>
			buildModelOptionCatalog("text", [
				...upstreamTextModels,
				...NODE_MODELS.text,
				workshopTextModel,
			]),
		[upstreamTextModels, workshopTextModel],
	);
	const workshopTextModelOptions = workshopTextModelCatalog.modelNames;

	useEffect(() => {
		if (!workshopTextModelOptions.length) return;
		if (!workshopTextModelOptions.includes(workshopTextModel)) {
			setWorkshopTextModel(workshopTextModelOptions[0]);
		}
	}, [setWorkshopTextModel, workshopTextModel, workshopTextModelOptions]);

	return {
		workshopTextModelCatalog,
		workshopTextModelOptions,
	};
}
