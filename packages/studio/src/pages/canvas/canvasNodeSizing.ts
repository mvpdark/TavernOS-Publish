export type CanvasNodeSize = { width: number; height: number };

function clamp(value: number, min: number, max: number) {
	return Math.max(min, Math.min(max, value));
}

export function getVideoNodeSize(videoWidth: number, videoHeight: number): CanvasNodeSize {
	const aspect = videoWidth > 0 && videoHeight > 0 ? videoWidth / videoHeight : 16 / 9;
	const maxLongSide = 440;
	const minShortSide = 220;
	let width = aspect >= 1 ? maxLongSide : maxLongSide * aspect;
	let height = aspect >= 1 ? maxLongSide / aspect : maxLongSide;
	if (Math.min(width, height) < minShortSide) {
		const scale = minShortSide / Math.min(width, height);
		width *= scale;
		height *= scale;
	}
	return {
		width: Math.round(clamp(width, minShortSide, 520)),
		height: Math.round(clamp(height, minShortSide, 520)),
	};
}
