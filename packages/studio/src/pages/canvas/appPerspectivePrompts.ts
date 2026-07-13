import type { PerspectiveEditSettings } from "./components/CanvasNodeView";

export function getPerspectivePresetText(preset: PerspectiveEditSettings["preset"]) {
	if (preset === "custom") return "apply the custom camera adjustment requested by the controls";
	if (preset === "left") return "turn the camera to the subject's left side view";
	if (preset === "right") return "turn the camera to the subject's right side view";
	if (preset === "top") return "shift to a higher top-down camera angle";
	if (preset === "low") return "shift to a lower upward-looking camera angle";
	if (preset === "close") return "move the camera closer while keeping composition natural";
	return "turn the camera to a cinematic three-quarter perspective";
}

export function getPerspectiveYawPrompt(yaw: number) {
	const absYaw = Math.abs(yaw);
	const side = yaw > 0 ? "right" : "left";
	if (absYaw < 8) return "keep the subject facing the original front view";
	if (absYaw < 35) return `slightly rotate the camera toward the subject's ${side}, creating a subtle ${side} three-quarter view`;
	if (absYaw < 75) return `rotate the camera toward the subject's ${side}, creating a clear ${side} three-quarter view`;
	if (absYaw < 115) return `rotate the camera to a ${side} side profile view, showing the side surfaces naturally`;
	if (absYaw < 165) return `rotate the camera past the side into a rear ${side} three-quarter view, revealing believable back and side surfaces`;
	return "rotate the camera to a back view of the same subject, reconstructing the rear surfaces consistently";
}

export function getPerspectivePitchPrompt(pitch: number) {
	const absPitch = Math.abs(pitch);
	if (absPitch < 8) return "keep the camera at eye level";
	if (pitch < 0) {
		if (absPitch < 45) return "use a slightly high camera angle looking down at the subject";
		if (absPitch < 90) return "use a strong high-angle view looking down at the subject";
		if (absPitch < 135) return "use an overhead top-down camera angle while preserving the subject identity";
		return "use an extreme bird's-eye top-down view, reconstructing the visible top surfaces naturally";
	}
	if (absPitch < 45) return "use a slightly low camera angle looking up at the subject";
	if (absPitch < 90) return "use a strong low-angle view looking up at the subject";
	if (absPitch < 135) return "use a dramatic worm's-eye view from below while preserving the subject identity";
	return "use an extreme upward view from below, reconstructing underside surfaces naturally";
}

export function getPerspectiveZoomPrompt(zoom: number) {
	if (Math.abs(zoom) < 2) return "keep the current framing distance";
	if (zoom > 0) {
		const subjectPercent = zoom > 16 ? "about 120%-135%" : "about 108%-120%";
		return `perform a real camera zoom-in / dolly-in edit. The subject must occupy ${subjectPercent} of the original apparent size in the final frame. Crop closer around the same subject while preserving identity and details. This is not a super-resolution task.`;
	}
	const subjectPercent = zoom < -16 ? "about 65%-75%" : "about 78%-92%";
	return `perform a real camera zoom-out / dolly-out edit. The subject must become visibly smaller, occupying ${subjectPercent} of the original apparent size in the final frame. Reveal more surrounding background, clothing, hair accessories, shoulders, sleeves, and scene context by naturally outpainting/reconstructing the environment. The composition must clearly change from the source image; do not keep the same close-up framing.`;
}

export function getPerspectiveLensPrompt(lens: number) {
	if (lens <= 24) {
		return "use a wide-angle 20mm lens look with expanded spatial perspective and more environment in frame, while avoiding warped faces or distorted anatomy";
	}
	return `use a natural ${lens}mm lens look with realistic perspective compression`;
}

export function buildPerspectiveNegativePrompt(settings: PerspectiveEditSettings) {
	return [
		Math.abs(settings.zoom) >= 2 ? "unchanged framing" : "",
		Math.abs(settings.zoom) >= 2 ? "same composition" : "",
		Math.abs(settings.zoom) >= 2 ? "no zoom change" : "",
		"duplicate subject",
		"extra limbs",
		"warped anatomy",
		"distorted face",
		"picture-in-picture",
		"inset image",
		"small image centered on blurred background",
		"blurred padding",
		"letterbox padding",
		"photo frame inside the image",
		"border around the original image",
		"changed identity",
		"changed clothing",
		"changed colors",
		"text artifacts",
		"watermark",
		settings.lens <= 24 ? "fisheye distortion, extreme barrel distortion" : "",
	].filter(Boolean).join(", ");
}

export function buildPerspectiveEditPrompt(settings: PerspectiveEditSettings, assetName?: string) {
	const rollText = settings.roll === 0 ? "no roll" : `${Math.abs(settings.roll)} degree ${settings.roll > 0 ? "clockwise" : "counter-clockwise"} roll`;
	const zoomInstruction = settings.zoom < -2
		? "Use GPT Image 2 image editing to create a wider camera distance. The subject must become smaller in frame while the surrounding scene is naturally reconstructed. Do not create a small pasted copy, border, blur padding, or picture-in-picture layout."
		: settings.zoom > 2
			? "Use GPT Image 2 image editing to create a closer camera distance and tighter framing while preserving the same subject identity and image style."
			: "";
	return [
		"你是 GPT Image 2 图像编辑模型。请把输入图片作为唯一参考图进行编辑，目标是生成同一主体在新相机角度下的自然画面，不要生成不同人物或不同场景。",
		"Edit according to the camera perspective, lens, and camera distance controls.",
		getPerspectivePresetText(settings.preset),
		getPerspectiveYawPrompt(settings.yaw),
		getPerspectivePitchPrompt(settings.pitch),
		getPerspectiveZoomPrompt(settings.zoom),
		getPerspectiveLensPrompt(settings.lens),
		`Exact control values: yaw ${settings.yaw} degrees, pitch ${settings.pitch} degrees, ${rollText}, zoom ${settings.zoom} percent, lens ${settings.lens}mm.`,
		zoomInstruction,
		Math.abs(settings.zoom) >= 2
			? `缩放必须明显生效：zoom=${settings.zoom}。如果是负数，最终人物必须保持比输入图更小的尺寸，并露出更多环境；如果是正数，最终人物必须明显更近。不要输出与原图几乎相同的构图。`
			: "",
		"保持同一主体身份、脸、发型、服装、配饰、材质、颜色、背景连续性、光照风格和整体画质。",
		"根据新视角自然补全侧面、背面、顶部或底部会露出的结构；允许合理重建不可见区域，但不要改变角色设计。",
		"避免多出人物、重复身体、额外肢体、畸形手脚、扭曲脸、文字、水印、边框、画中画、贴图感或模糊填充。",
		"Always output one seamless full-frame image. The result should look like the same camera moved around the subject, with a believable single scene and no UI artifacts.",
		assetName ? `Reference asset: ${assetName}.` : "",
	].filter(Boolean).join(" ");
}

export function buildPerspectiveZoomOutReframePrompt(settings: PerspectiveEditSettings, assetName?: string) {
	const subjectScale = settings.zoom <= -25
		? "65%-72%"
		: settings.zoom <= -15
			? "72%-82%"
			: "82%-92%";
	return [
		"使用 GPT Image 2 对这张图片做 reframe / zoom out / outpaint，而不是生成相似图片。",
		`缩放值 zoom=${settings.zoom}，最终人物主体必须明显变小，约为原图主体视觉尺寸的 ${subjectScale}。`,
		"保持同一个人物、五官、发饰、服装、粉色汉服、光影、色调和原图质感。",
		"向画面四周自然扩展，露出更多发饰、肩部、袖子、身体比例和周围窗户/室内背景。",
		"最终必须是一张完整自然的照片/插画，不允许出现画中画、小图贴在背景上、虚化 padding、边框、拼接缝、重复脸或重复身体。",
		"不要把人物重新放大回近景，不要保持原来的 close-up 构图。",
		Math.abs(settings.yaw) >= 8 ? getPerspectiveYawPrompt(settings.yaw) : "",
		Math.abs(settings.pitch) >= 8 ? getPerspectivePitchPrompt(settings.pitch) : "",
		settings.lens <= 24 ? "使用自然广角构图，但避免脸部畸变。" : "",
		assetName ? `参考图：${assetName}` : "",
	].filter(Boolean).join(" ");
}
