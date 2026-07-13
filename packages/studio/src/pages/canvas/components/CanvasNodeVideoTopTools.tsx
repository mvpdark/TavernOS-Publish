import type { PointerEvent } from "react";

type CanvasNodeVideoTopToolsProps = {
	nodeId: string;
	uploadLabel: string;
	isVideoEnhanceButtonActive: boolean;
	isVideoEnhanceButtonDisabled: boolean;
	isVideoExtendButtonActive: boolean;
	isVideoExtendButtonDisabled: boolean;
	videoEnhanceButtonLabel: string;
	videoExtendButtonLabel: string;
	showGrokExtendButton: boolean;
	grokExtendButtonLabel: string;
	grokExtendButtonDisabled: boolean;
	stopNodeControlPointerDown: (event: PointerEvent<HTMLElement>) => void;
	onOpenVideoEnhancePanel: (nodeId: string) => void;
	onOpenVideoUpload: (nodeId: string) => void;
	onOpenVideoExtendPanel: (nodeId: string) => void;
	onExtendGrokVideo: (nodeId: string) => void;
};

export function CanvasNodeVideoTopTools({
	nodeId,
	uploadLabel,
	isVideoEnhanceButtonActive,
	isVideoEnhanceButtonDisabled,
	isVideoExtendButtonActive,
	isVideoExtendButtonDisabled,
	videoEnhanceButtonLabel,
	videoExtendButtonLabel,
	showGrokExtendButton,
	grokExtendButtonLabel,
	grokExtendButtonDisabled,
	stopNodeControlPointerDown,
	onOpenVideoEnhancePanel,
	onOpenVideoUpload,
	onOpenVideoExtendPanel,
	onExtendGrokVideo,
}: CanvasNodeVideoTopToolsProps) {
	return (
		<div className="video-node-top-tools">
			<button
				className={`upload-pill upload-pill--enhance ${isVideoEnhanceButtonActive ? "is-active" : ""}`}
				type="button"
				disabled={isVideoEnhanceButtonDisabled}
				onPointerDown={stopNodeControlPointerDown}
				onClick={(event) => {
					event.stopPropagation();
					onOpenVideoEnhancePanel(nodeId);
				}}
			>
				{videoEnhanceButtonLabel}
			</button>
			<button
				className="upload-pill"
				type="button"
				onPointerDown={stopNodeControlPointerDown}
				onClick={(event) => {
					event.stopPropagation();
					onOpenVideoUpload(nodeId);
				}}
			>
				{uploadLabel}
			</button>
			<button
				className={`upload-pill upload-pill--extend ${isVideoExtendButtonActive ? "is-active" : ""}`}
				type="button"
				disabled={isVideoExtendButtonDisabled}
				onPointerDown={stopNodeControlPointerDown}
				onClick={(event) => {
					event.stopPropagation();
					onOpenVideoExtendPanel(nodeId);
				}}
			>
				{videoExtendButtonLabel}
			</button>
			{showGrokExtendButton ? (
				<button
					className="upload-pill upload-pill--grok-extend"
					type="button"
					disabled={grokExtendButtonDisabled}
					onPointerDown={stopNodeControlPointerDown}
					onClick={(event) => {
						event.stopPropagation();
						onExtendGrokVideo(nodeId);
					}}
				>
					{grokExtendButtonLabel}
				</button>
			) : null}
		</div>
	);
}
