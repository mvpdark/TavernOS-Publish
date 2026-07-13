import type { CSSProperties } from "react";

const FLOATING_TEXT_TOOLBAR_ITEMS = [
	"P",
	"H1",
	"H2",
	"H3",
	"Q",
	"B",
	"I",
	"U",
	"S",
	"?",
	"1.",
	"↗",
] as const;

export type FloatingTextToolbarProps = {
	visible: boolean;
	toolbarStyle: CSSProperties | null | undefined;
};

export function FloatingTextToolbar({
	visible,
	toolbarStyle,
}: FloatingTextToolbarProps) {
	if (!visible || !toolbarStyle) return null;

	return (
		<div className="floating-text-toolbar-wrap" style={toolbarStyle}>
			<div className="text-format-bar text-format-bar--floating">
				{FLOATING_TEXT_TOOLBAR_ITEMS.map((item) => (
					<button key={item} type="button">
						{item}
					</button>
				))}
			</div>
		</div>
	);
}
