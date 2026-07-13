import type { CanvasInspectorMenuKey as MenuKey } from "../canvasInspectorTypes";
import type {
	CanvasInspectorRenderState,
	InspectorParameterFieldBundle,
} from "./CanvasInspectorContentTypes";
import { InspectorParameterGroupList } from "./InspectorParamCards";
import type { InspectorParameterGroupRenderConfig } from "./InspectorParamCards";

export type CanvasInspectorParameterSectionsProps = CanvasInspectorRenderState & {
	isImageLikeNode: boolean;
	isVideoNode: boolean;
	isMusicNode: boolean;
	isShotNode: boolean;
	imageParameterFields: InspectorParameterFieldBundle;
	videoParameterFields: InspectorParameterFieldBundle;
	shotParameterFields: InspectorParameterFieldBundle;
	musicParameterFields: InspectorParameterFieldBundle;
};

export function CanvasInspectorParameterSections({
	openMenu,
	toggleMenu,
	closeMenu,
	isImageLikeNode,
	isVideoNode,
	isMusicNode,
	isShotNode,
	imageParameterFields,
	videoParameterFields,
	shotParameterFields,
	musicParameterFields,
}: CanvasInspectorParameterSectionsProps) {
	const parameterGroupSections: Array<InspectorParameterGroupRenderConfig<MenuKey>> = [
		{ id: "music", shouldRender: isMusicNode, fields: musicParameterFields },
		{ id: "image", shouldRender: isImageLikeNode, fields: imageParameterFields },
		{ id: "video", shouldRender: isVideoNode, fields: videoParameterFields },
		{ id: "shot", shouldRender: isShotNode, fields: shotParameterFields },
	];

	return (
		<InspectorParameterGroupList
			groups={parameterGroupSections}
			openMenu={openMenu}
			onToggle={toggleMenu}
			onAfterSelect={closeMenu}
		/>
	);
}
