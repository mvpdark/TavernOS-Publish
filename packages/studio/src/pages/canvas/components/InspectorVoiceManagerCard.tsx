import type { PanelOption } from "../parameterPanelPresentation";
import {
	InspectorLabeledTextControl,
	InspectorMetricCardFrame,
	ParamCard,
} from "./InspectorBaseParamCards";

export type VoiceManagerCardProps<MenuKey extends string> = {
	menuKey: MenuKey;
	isOpen: boolean;
	options: PanelOption[];
	value: string;
	selectedValue?: string;
	isLoading?: boolean;
	voiceIdDraft: string;
	voiceIdPlaceholder: string;
	voiceAliasDraft: string;
	voiceAliasSaveId: string;
	onToggle: (menuKey: MenuKey) => void;
	onSelect: (value: string) => void;
	onRefresh?: () => void;
	onVoiceIdDraftChange: (value: string) => void;
	onVoiceAliasDraftChange: (value: string) => void;
	onSaveAlias?: () => void;
};

type VoiceAliasTextFieldProps = {
	label: string;
	value: string;
	placeholder: string;
	onChange: (value: string) => void;
};

function VoiceAliasTextField({
	label,
	value,
	placeholder,
	onChange,
}: VoiceAliasTextFieldProps) {
	return (
		<InspectorLabeledTextControl
			control="input"
			label={label}
			inputClassName="inspector-panel__voice-alias-input"
			value={value}
			placeholder={placeholder}
			onChange={onChange}
		/>
	);
}

export function VoiceManagerCard<MenuKey extends string>({
	menuKey,
	isOpen,
	options,
	value,
	selectedValue,
	isLoading,
	voiceIdDraft,
	voiceIdPlaceholder,
	voiceAliasDraft,
	voiceAliasSaveId,
	onToggle,
	onSelect,
	onRefresh,
	onVoiceIdDraftChange,
	onVoiceAliasDraftChange,
	onSaveAlias,
}: VoiceManagerCardProps<MenuKey>) {
	return (
		<InspectorMetricCardFrame
			label=""
			className="inspector-panel__metric--voice-manager"
		>
			<div className="inspector-panel__voice-head">
				<span>音色管理 ☁️</span>
				<button type="button" onClick={onRefresh} disabled={isLoading}>
					{isLoading ? "读取中" : "读取 MiniMax 官方音色"}
				</button>
			</div>
			<ParamCard
				label="选择音色"
				value={value}
				selectedValue={selectedValue}
				menuKey={menuKey}
				isOpen={isOpen}
				options={options}
				onToggle={onToggle}
				onSelect={onSelect}
				className="inspector-panel__metric--voice-select"
			/>
			<div className="inspector-panel__voice-alias-editor">
				<VoiceAliasTextField
					label="音色 ID"
					value={voiceIdDraft}
					placeholder={voiceIdPlaceholder}
					onChange={onVoiceIdDraftChange}
				/>
				<VoiceAliasTextField
					label="显示名称"
					value={voiceAliasDraft}
					placeholder="例如：我的旁白男声"
					onChange={onVoiceAliasDraftChange}
				/>
				<button
					type="button"
					disabled={!voiceAliasSaveId || !voiceAliasDraft.trim()}
					onClick={onSaveAlias}
				>
					加入音色库
				</button>
			</div>
			<p className="inspector-panel__voice-empty">
				已有 MiniMax 官方 voice_id 可以直接粘贴加入；克隆/设计成功的音色也会自动加入我的音色并排在最上方。
			</p>
		</InspectorMetricCardFrame>
	);
}
