import type { AddNodeMenuState } from "../appCanvasState";
import { COPY, MENU_ITEMS, REFERENCE_MENU_ITEMS } from "../appUiConfig";
import type { NodeType } from "../canvas-types";

export type CanvasAddNodeMenuProps = {
	menuAt: AddNodeMenuState | null;
	onCreateNode: (type: NodeType) => void;
	onCreateReferencedNode: (
		type: NodeType,
		menu: Extract<AddNodeMenuState, { mode: "reference" }>,
	) => void;
	onOpenUpload: () => void;
};

export function CanvasAddNodeMenu({
	menuAt,
	onCreateNode,
	onCreateReferencedNode,
	onOpenUpload,
}: CanvasAddNodeMenuProps) {
	if (!menuAt) return null;
	return (
		<div
			className={`add-node-menu ${menuAt.mode === "reference" ? "add-node-menu--reference" : ""}`}
			style={{ left: menuAt.x, top: menuAt.y }}
		>
			{menuAt.mode === "reference" ? (
				<>
					<div className="add-node-menu__header">引用该节点生成</div>
					<div className="add-node-menu__list">
						{REFERENCE_MENU_ITEMS.map((item, index) => (
							<button
								type="button"
								key={item.type}
								className={`add-node-menu__item ${index === 0 ? "is-primary" : ""}`}
								onClick={() =>
									onCreateReferencedNode(item.type as NodeType, menuAt)
								}
							>
								<span className="add-node-menu__icon">{item.icon}</span>
								<span className="add-node-menu__copy">
									<strong>{item.label}</strong>
									{item.desc ? <small>{item.desc}</small> : null}
								</span>
							</button>
						))}
					</div>
				</>
			) : (
				<>
					<div className="add-node-menu__header">{COPY.addNode}</div>
					<div className="add-node-menu__list">
						{MENU_ITEMS.filter(
							(item) => item.type !== "editor" && item.type !== "upload",
						).map((item, index) => (
							<button
								type="button"
								key={item.type}
								className={`add-node-menu__item ${index === 0 ? "is-primary" : ""}`}
								onClick={() => onCreateNode(item.type as NodeType)}
							>
								<span className="add-node-menu__icon">{item.icon}</span>
								<span className="add-node-menu__copy">
									<strong>{item.label}</strong>
									{item.desc ? <small>{item.desc}</small> : null}
								</span>
							</button>
						))}
					</div>
					<div className="add-node-menu__subhead">{COPY.addAsset}</div>
					{MENU_ITEMS.filter(
						(item) => item.type === "editor" || item.type === "upload",
					).map((item) => (
						<button
							type="button"
							key={item.type}
							className="add-node-menu__item"
							onClick={() =>
								item.type === "upload"
									? onOpenUpload()
									: onCreateNode(item.type as NodeType)
							}
						>
							<span className="add-node-menu__icon">{item.icon}</span>
							<span className="add-node-menu__copy">
								<strong>{item.label}</strong>
							</span>
						</button>
					))}
				</>
			)}
		</div>
	);
}
