export type ImageSplitRect = {
	x: number;
	y: number;
	width: number;
	height: number;
};

export function getImageGridSplitRects(
	width: number,
	height: number,
	columns = 2,
	rows = 2,
): ImageSplitRect[] {
	const safeWidth = Math.max(0, Math.floor(width));
	const safeHeight = Math.max(0, Math.floor(height));
	const safeColumns = Math.max(1, Math.floor(columns));
	const safeRows = Math.max(1, Math.floor(rows));
	const rects: ImageSplitRect[] = [];

	for (let row = 0; row < safeRows; row += 1) {
		const y0 = Math.floor((row * safeHeight) / safeRows);
		const y1 = Math.floor(((row + 1) * safeHeight) / safeRows);
		for (let column = 0; column < safeColumns; column += 1) {
			const x0 = Math.floor((column * safeWidth) / safeColumns);
			const x1 = Math.floor(((column + 1) * safeWidth) / safeColumns);
			rects.push({
				x: x0,
				y: y0,
				width: x1 - x0,
				height: y1 - y0,
			});
		}
	}

	return rects;
}
