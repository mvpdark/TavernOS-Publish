import type { AudioComposerOptionKey } from "../appComposerOptionUpdates";
import type { ComposerPreset } from "../canvas-types";

export type ComposerVoiceMode = Exclude<
	NonNullable<ComposerPreset["audioVoiceMode"]>,
	"tts"
>;

type ComposerVoiceFormProps = {
	composer: ComposerPreset;
	mode: ComposerVoiceMode;
	isSending?: boolean;
	floating?: boolean;
	onUpdateAudioOption?: (key: AudioComposerOptionKey, value: string) => void;
	onSend?: () => void;
};

export function ComposerVoiceForm({
	composer,
	mode,
	isSending,
	floating = false,
	onUpdateAudioOption,
	onSend,
}: ComposerVoiceFormProps) {
	return (
		<div className={`composer-voice-form ${floating ? "composer-voice-form--floating" : ""}`}>
			{mode === "design" ? (
				<label className="composer-voice-form__field composer-voice-form__field--wide">
					<span>设计语音风格</span>
					<textarea
						className="composer-voice-form__textarea"
						value={composer.audioVoiceStyle ?? ""}
						placeholder="例如：温暖、年轻、清晰的女声，适合纪录片旁白"
						onChange={(event) => onUpdateAudioOption?.("audioVoiceStyle", event.target.value)}
					/>
				</label>
			) : null}
			<div className="composer-voice-form__row">
				<label className="composer-voice-form__field">
					<span>{mode === "clone" ? "克隆音色命名" : "设计音色命名"}</span>
					<input
						value={composer.audioVoiceName ?? ""}
						placeholder="例如：写实 / 80年代"
						onChange={(event) => onUpdateAudioOption?.("audioVoiceName", event.target.value)}
					/>
				</label>
				{mode === "clone" ? (
					<label className="composer-voice-form__field">
						<span>voice_id</span>
						<input
							value={composer.audioVoiceId ?? ""}
							placeholder="留空则按命名自动生成"
							onChange={(event) => onUpdateAudioOption?.("audioVoiceId", event.target.value)}
						/>
					</label>
				) : null}
			</div>
			<button
				className="composer-voice-form__confirm"
				type="button"
				disabled={isSending}
				onClick={onSend}
			>
				{isSending ? "处理中..." : mode === "clone" ? "确认克隆" : "确认设计"}
			</button>
		</div>
	);
}
