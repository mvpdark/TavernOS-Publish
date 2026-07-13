import type { ReactNode, ChangeEvent, RefObject } from "react";

export function AppRuntimeShell({
	children,
	appView,
	themeTone,
	uploadInputRef,
	uploadAccept,
	onUploadChange,
}: {
	children: ReactNode;
	appView: string;
	themeTone: string;
	uploadInputRef: RefObject<HTMLInputElement | null>;
	uploadAccept: string;
	onUploadChange: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
	return (
		<main className={`kakashow-shell theme-${themeTone} view-${appView}`}>
			<input
				ref={uploadInputRef}
				className="hidden-upload-input"
				type="file"
				accept={uploadAccept}
				onChange={onUploadChange}
			/>

			<div className="canvas-grid" />

			{children}
		</main>
	);
}
