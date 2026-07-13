import type {
	MouseEvent as ReactMouseEvent,
	RefObject,
} from "react";

export type WorkshopScriptContextMenuState = {
	x: number;
	y: number;
} | null;

export type WorkshopScriptStageProps = {
	templateFile: string;
	templateValue: string;
	templateLabel: string;
	textModel: string;
	textModelOptions: string[];
	script: string;
	textareaRef: RefObject<HTMLTextAreaElement | null>;
	contextMenu: WorkshopScriptContextMenuState;
	isExtracting: boolean;
	onTemplateFileChange: (value: string) => void;
	onTextModelChange: (value: string) => void;
	onScriptChange: (value: string) => void;
	onTextareaScroll: () => void;
	onTextareaContextMenu: (
		event: ReactMouseEvent<HTMLTextAreaElement>,
	) => void;
	onCopyFromMenu: () => void;
	onPasteFromMenu: () => void;
	onDirectExtract: () => void;
	onAutoEpisodeBreakdown: () => void;
	onNext: () => void;
};

export function WorkshopScriptStage({
	templateFile,
	templateValue,
	templateLabel,
	textModel,
	textModelOptions,
	script,
	textareaRef,
	contextMenu,
	isExtracting,
	onTemplateFileChange,
	onTextModelChange,
	onScriptChange,
	onTextareaScroll,
	onTextareaContextMenu,
	onCopyFromMenu,
	onPasteFromMenu,
	onDirectExtract,
	onAutoEpisodeBreakdown,
	onNext,
}: WorkshopScriptStageProps) {
	return (
		<div className="workshop-stage workshop-stage--script">
			<div className="workshop-stage__head">
				<div>
					<h2>输入剧本</h2>
					<p>粘贴你的小说或剧本内容，下一步将由 AI 自动分集并提取角色场景。</p>
				</div>
				<div className="workshop-stage__controls">
					<select
						value={templateFile}
						onChange={(event) => onTemplateFileChange(event.target.value)}
					>
						<option value={templateValue}>{templateLabel}</option>
					</select>
					<select
						value={textModel}
						onChange={(event) => onTextModelChange(event.target.value)}
					>
						{textModelOptions.map((model) => (
							<option key={model} value={model}>
								{model}
							</option>
						))}
					</select>
				</div>
			</div>
			<textarea
				ref={textareaRef}
				className="workshop-stage__textarea"
				value={script}
				onChange={(event) => onScriptChange(event.target.value)}
				onScroll={onTextareaScroll}
				onContextMenu={onTextareaContextMenu}
				placeholder="在这里粘贴你的小说或剧本内容..."
			/>
			{contextMenu ? (
				<div
					className="workshop-context-menu"
					style={{
						left: contextMenu.x,
						top: contextMenu.y,
					}}
				>
					<button
						type="button"
						className="workshop-context-menu__item"
						onClick={() => {
							onCopyFromMenu();
						}}
					>
						<span>复制</span>
					</button>
					<button
						type="button"
						className="workshop-context-menu__item"
						onClick={() => {
							onPasteFromMenu();
						}}
					>
						<span>粘贴</span>
					</button>
				</div>
			) : null}
			<div className="workshop-stage__footer">
				<button
					type="button"
					className="workshop-studio__ghost"
					disabled={isExtracting}
					onClick={onDirectExtract}
				>
					{isExtracting ? "提取中…" : "直接提取角色场景"}
				</button>
				<button
					type="button"
					className="workshop-studio__ghost"
					onClick={onAutoEpisodeBreakdown}
				>
					按章节自动分集
				</button>
				<button type="button" className="workshop-studio__btn" onClick={onNext}>
					下一步：分镜规划
				</button>
			</div>
		</div>
	);
}
