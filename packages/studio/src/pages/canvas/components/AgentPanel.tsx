import type { ReactNode } from "react";

const DEFAULT_AGENT_CHIPS = ["冷一点", "先找感觉", "先别急着写"] as const;

export type AgentPanelProps = {
	helloUser: string;
	helloTitle: string;
	onClose: () => void;
	children: ReactNode;
};

export function AgentPanel({
	helloUser,
	helloTitle,
	onClose,
	children,
}: AgentPanelProps) {
	return (
		<aside className="right-panel">
			<div className="right-panel__chrome">
				<button type="button" className="chrome-btn">
					•
				</button>
				<button type="button" className="chrome-btn">
					•
				</button>
				<button type="button" className="chrome-btn" onClick={onClose}>
					×
				</button>
			</div>
			<div className="right-panel__content">
				<div className="right-panel__greeting">
					<div className="right-panel__avatar">●</div>
					<div>
						<div className="right-panel__hello">{helloUser}</div>
						<h2>{helloTitle}</h2>
					</div>
				</div>
				<div className="right-panel__chips">
					{DEFAULT_AGENT_CHIPS.map((chip) => (
						<button type="button" key={chip} className="prompt-chip">
							<span>{chip}</span>
						</button>
					))}
				</div>
				{children}
			</div>
		</aside>
	);
}
