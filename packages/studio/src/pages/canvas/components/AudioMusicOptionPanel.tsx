import type {
	AudioComposerOptionKey,
	MusicComposerOptionKey,
} from "../appComposerOptionUpdates";
import type { AudioMusicParameterOptionState } from "../audioMusicParameterOptionState";
import {
	buildAudioOptionSections,
	buildMiniMaxMusicOptionSections,
	buildMusicBaseOptionSections,
	type AudioMusicOptionSection,
} from "../audioMusicOptionSections";
import type { ComposerPreset, NodeType } from "../canvas-types";
import {
	ImageHintBlock,
	ImageOptionSectionList,
	ImageTextAreaOptionSection,
} from "./ComposerOptionSections";

type AudioMusicOptionsPanelProps = {
	type: NodeType;
	composer: ComposerPreset;
	optionState: AudioMusicParameterOptionState;
	onUpdateAudioOption?: (key: AudioComposerOptionKey, value: string) => void;
	onUpdateMusicOption?: (key: MusicComposerOptionKey, value: string) => void;
};

export function AudioMusicOptionsPanel({
	type,
	composer,
	optionState,
	onUpdateAudioOption,
	onUpdateMusicOption,
}: AudioMusicOptionsPanelProps) {
	const {
		audioCapability,
		musicCapability,
		musicVersionOptions,
	} = optionState;
	const isAudio = type === "audio";
	const isMusic = type === "music";
	const capabilityNotes = isAudio ? audioCapability?.notes : musicCapability?.notes;
	const audioOptionSections: AudioMusicOptionSection[] = isAudio
		? buildAudioOptionSections({ composer, optionState, onUpdateAudioOption })
		: [];
	const musicBaseOptionSections: AudioMusicOptionSection[] = isMusic
		? buildMusicBaseOptionSections({ composer, optionState, onUpdateMusicOption })
		: [];
	const minimaxMusicOptionSections: AudioMusicOptionSection[] =
		isMusic && musicVersionOptions.length
			? buildMiniMaxMusicOptionSections({ composer, onUpdateMusicOption })
			: [];
	return (
		<>
			<ImageOptionSectionList
				sections={[...audioOptionSections, ...musicBaseOptionSections]}
			/>
			{isMusic && musicVersionOptions.length ? (
				<>
					<ImageOptionSectionList sections={minimaxMusicOptionSections} />
					<ImageTextAreaOptionSection
						label="歌词"
						value={composer.musicLyrics ?? ""}
						onChange={(value) => onUpdateMusicOption?.("musicLyrics", value)}
					/>
				</>
			) : null}
			{capabilityNotes?.map((note) => (
				<ImageHintBlock key={note}>{note}</ImageHintBlock>
			))}
		</>
	);
}
