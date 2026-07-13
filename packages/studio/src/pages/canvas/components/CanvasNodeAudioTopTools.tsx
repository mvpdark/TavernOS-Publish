import type { PointerEvent } from "react";

type AudioVoiceMode = "tts" | "clone" | "design";

type CanvasNodeAudioTopToolsProps = {
	nodeId: string;
	voiceMode?: AudioVoiceMode;
	uploadLabel: string;
	stopNodeControlPointerDown: (event: PointerEvent<HTMLElement>) => void;
	onAudioVoiceModeChange?: (nodeId: string, mode: Extract<AudioVoiceMode, "clone" | "design">) => void;
	onOpenAudioUpload: (nodeId: string) => void;
};

export function CanvasNodeAudioTopTools({
	nodeId,
	voiceMode,
	uploadLabel,
	stopNodeControlPointerDown,
	onAudioVoiceModeChange,
	onOpenAudioUpload,
}: CanvasNodeAudioTopToolsProps) {
	return (
		<div className="audio-node-top-tools">
			<button
				className={`upload-pill upload-pill--voice ${voiceMode === "clone" ? "is-active" : ""}`}
				type="button"
				onPointerDown={stopNodeControlPointerDown}
				onClick={(event) => {
					event.stopPropagation();
					onAudioVoiceModeChange?.(nodeId, "clone");
				}}
			>
				克隆
			</button>
			<button
				className="upload-pill"
				type="button"
				onPointerDown={stopNodeControlPointerDown}
				onClick={(event) => {
					event.stopPropagation();
					onOpenAudioUpload(nodeId);
				}}
			>
				{uploadLabel}
			</button>
			<button
				className={`upload-pill upload-pill--voice ${voiceMode === "design" ? "is-active" : ""}`}
				type="button"
				onPointerDown={stopNodeControlPointerDown}
				onClick={(event) => {
					event.stopPropagation();
					onAudioVoiceModeChange?.(nodeId, "design");
				}}
			>
				设计
			</button>
		</div>
	);
}
