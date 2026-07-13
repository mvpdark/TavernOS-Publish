import { Suspense, lazy } from "react";
import type { ComposerPreset, NodeType } from "../canvas-types";
import { AgentPanel } from "./AgentPanel";
import type { CanvasInspectorPanelProps } from "./CanvasInspectorPanel";
import { CanvasModeGuidePanel } from "./CanvasModeGuidePanel";
import type { CanvasModeGuidePanelProps } from "./CanvasModeGuidePanel";

const CanvasInspectorPanel = lazy(() =>
	import("./CanvasInspectorPanel").then((module) => ({
		default: module.CanvasInspectorPanel,
	})),
);

const EmptyComposer = lazy(() =>
	import("./Composer").then((module) => ({
		default: module.EmptyComposer,
	})),
);

type CanvasSidePanelSlotProps = {
	agentOpen: boolean;
	isCanvasView: boolean;
	isDirectorMode: boolean;
	helloUser: string;
	helloTitle: string;
	agentOrbSrc: string;
	agentComposer: {
		composer: ComposerPreset;
		type: NodeType;
		onPromptChange: (type: NodeType, prompt: string) => void;
	};
	inspectorProps: CanvasInspectorPanelProps | null;
	directorGuideProps: CanvasModeGuidePanelProps;
	onCloseAgent: () => void;
	onOpenAgent: () => void;
};

export function CanvasSidePanelSlot({
	agentOpen,
	isCanvasView,
	isDirectorMode,
	helloUser,
	helloTitle,
	agentOrbSrc,
	agentComposer,
	inspectorProps,
	directorGuideProps,
	onCloseAgent,
	onOpenAgent,
}: CanvasSidePanelSlotProps) {
	if (agentOpen) {
		return (
			<AgentPanel
				helloUser={helloUser}
				helloTitle={helloTitle}
				onClose={onCloseAgent}
			>
				<Suspense fallback={null}>
					<EmptyComposer
						composer={agentComposer.composer}
						type={agentComposer.type}
						onPromptChange={agentComposer.onPromptChange}
					/>
				</Suspense>
			</AgentPanel>
		);
	}

	if (!isCanvasView) return null;
	if (inspectorProps) {
		return (
			<Suspense fallback={null}>
				<CanvasInspectorPanel {...inspectorProps} />
			</Suspense>
		);
	}
	if (isDirectorMode) return <CanvasModeGuidePanel {...directorGuideProps} />;

	return (
		<button
			type="button"
			className="agent-orb-button"
			onClick={onOpenAgent}
			aria-label="打开助手"
		>
			<span className="agent-orb-button__glow" />
			<img src={agentOrbSrc} alt="" draggable={false} />
			<span className="agent-orb-button__blink agent-orb-button__blink--left" />
			<span className="agent-orb-button__blink agent-orb-button__blink--right" />
		</button>
	);
}
