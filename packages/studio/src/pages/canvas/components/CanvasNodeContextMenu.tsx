import type {
	ChangeEvent,
	FormEvent,
	MutableRefObject,
	PointerEvent as ReactPointerEvent,
} from "react";

export type CanvasNodeContextMenuState = {
	x: number;
	y: number;
	nodeId: string;
} | null;

export type CanvasNodeContextMenuProps = {
	nodeMenuAt: CanvasNodeContextMenuState;
	hasAsset: boolean;
	isRenaming: boolean;
	renameDraft: string;
	renameInputRef: MutableRefObject<HTMLInputElement | null>;
	onCreateAsset: () => void;
	onSubmitRename: () => void | Promise<void>;
	onRenameDraftChange: (value: string) => void;
	onCancelRename: () => void;
	onOpenRenameEditor: (nodeId: string) => void;
	onSaveAssetToLibrary: (nodeId: string) => void | Promise<void>;
	onCopyNode: (nodeId: string) => void | Promise<void>;
	onDuplicateNode: (nodeId: string) => void;
	onDeleteNode: (nodeId: string) => void;
};

export function CanvasNodeContextMenu({
	nodeMenuAt,
	hasAsset,
	isRenaming,
	renameDraft,
	renameInputRef,
	onCreateAsset,
	onSubmitRename,
	onRenameDraftChange,
	onCancelRename,
	onOpenRenameEditor,
	onSaveAssetToLibrary,
	onCopyNode,
	onDuplicateNode,
	onDeleteNode,
}: CanvasNodeContextMenuProps) {
	if (!nodeMenuAt) return null;
	const nodeId = nodeMenuAt.nodeId;
	const handleSubmitRename = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		void onSubmitRename();
	};
	const handleRenameDraftChange = (
		event: ChangeEvent<HTMLInputElement>,
	) => {
		onRenameDraftChange(event.target.value);
	};
	const stopRenameInputPointerDown = (
		event: ReactPointerEvent<HTMLInputElement>,
	) => {
		event.stopPropagation();
	};

	return (
		<div
			className="node-context-menu"
			style={{ left: nodeMenuAt.x, top: nodeMenuAt.y }}
		>
			<button
				type="button"
				className="node-context-menu__item node-context-menu__item--strong"
				onClick={onCreateAsset}
			>
				<span>创建资产</span>
			</button>
			{isRenaming ? (
				<form className="node-context-menu__rename" onSubmit={handleSubmitRename}>
					<input
						ref={renameInputRef}
						className="node-context-menu__input"
						value={renameDraft}
						onChange={handleRenameDraftChange}
						onPointerDown={stopRenameInputPointerDown}
					/>
					<div className="node-context-menu__rename-actions">
						<button
							type="button"
							className="node-context-menu__rename-btn"
							onClick={onCancelRename}
						>
							取消
						</button>
						<button
							type="submit"
							className="node-context-menu__rename-btn node-context-menu__rename-btn--primary"
						>
							确定
						</button>
					</div>
				</form>
			) : (
				<button
					type="button"
					className={`node-context-menu__item ${hasAsset ? "" : "is-disabled"}`}
					onClick={() => (hasAsset ? onOpenRenameEditor(nodeId) : undefined)}
				>
					<span>重命名</span>
				</button>
			)}
			<button
				type="button"
				className={`node-context-menu__item ${hasAsset ? "" : "is-disabled"}`}
				onClick={() => (hasAsset ? void onSaveAssetToLibrary(nodeId) : undefined)}
			>
				<span>保存到资产库</span>
			</button>
			<button
				type="button"
				className="node-context-menu__item"
				onClick={() => void onCopyNode(nodeId)}
			>
				<span>复制</span>
				<span className="node-context-menu__hint">Ctrl+C</span>
			</button>
			<button type="button" className="node-context-menu__item is-disabled">
				<span>粘贴</span>
				<span className="node-context-menu__hint">Ctrl+V</span>
			</button>
			<button
				type="button"
				className="node-context-menu__item"
				onClick={() => onDuplicateNode(nodeId)}
			>
				<span>副本</span>
			</button>
			<div className="node-context-menu__divider" />
			<button
				type="button"
				className="node-context-menu__item node-context-menu__item--danger"
				onClick={() => onDeleteNode(nodeId)}
			>
				<span>删除</span>
				<span className="node-context-menu__hint">Del</span>
			</button>
			<button
				type="button"
				className="node-context-menu__item"
				onClick={() => void onCopyNode(nodeId)}
			>
				<span>复制到剪贴板</span>
			</button>
		</div>
	);
}
