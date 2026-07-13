import { useCallback, useEffect, useRef, useState } from "react";

import { requestJson } from "../appHttpClient";
import type { RuntimeNotice } from "./useRuntimeNotices";

type WorkshopStep = 1 | 2 | 3 | 4;
type WorkshopRoleTab = "角色设定" | "场景设定" | "物品设定";
type WorkshopFrameTab = "模板" | "生图" | "生视频";

type UseWorkshopFrameActionsParams = {
	workshopScript: string;
	workshopStep: WorkshopStep;
	workshopRoleTab: WorkshopRoleTab;
	workshopFrameTab: WorkshopFrameTab;
	workshopFrameCards: string[];
	workshopDirectExtractTemplateFile: string;
	workshopDraftStorageKey: string;
	onNotice: (
		message: string,
		tone?: RuntimeNotice["tone"],
		dedupeKey?: string,
	) => void;
	onDirectExtract?: () => Promise<boolean>;
	onMergeFrames?: (frames: string[]) => Promise<string[]>;
	setWorkshopStep: (step: WorkshopStep) => void;
	setWorkshopRoleTab: (tab: WorkshopRoleTab) => void;
	setWorkshopScriptExpanded: (expanded: boolean) => void;
	setWorkshopFrameCards: (frames: string[]) => void;
};

async function requestLocalFrameMergeFallback(frames: string[]) {
	const parsed = await requestJson<{
		mergedFrames?: unknown;
	} | null>(
		"/api/workshop/frame-merge",
		{
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ frames }),
		},
		"服务端分镜合并失败",
	);
	return Array.isArray(parsed?.mergedFrames) ? parsed.mergedFrames : [];
}

export function useWorkshopFrameActions({
	workshopScript,
	workshopStep,
	workshopRoleTab,
	workshopFrameTab,
	workshopFrameCards,
	workshopDirectExtractTemplateFile,
	workshopDraftStorageKey,
	onNotice,
	onDirectExtract,
	onMergeFrames,
	setWorkshopStep,
	setWorkshopRoleTab,
	setWorkshopScriptExpanded,
	setWorkshopFrameCards,
}: UseWorkshopFrameActionsParams) {
	const workshopFrameActionTimerRef = useRef<number | null>(null);
	const [workshopFrameActionKey, setWorkshopFrameActionKey] = useState<string | null>(null);

	const flashWorkshopFrameAction = useCallback((actionKey: string) => {
		if (workshopFrameActionTimerRef.current !== null) {
			window.clearTimeout(workshopFrameActionTimerRef.current);
		}
		setWorkshopFrameActionKey(actionKey);
		workshopFrameActionTimerRef.current = window.setTimeout(() => {
			setWorkshopFrameActionKey((current) =>
				current === actionKey ? null : current,
			);
			workshopFrameActionTimerRef.current = null;
		}, 720);
	}, []);

	const requireWorkshopScript = useCallback(
		(actionKey: string) => {
			flashWorkshopFrameAction(actionKey);
			if (workshopScript.trim()) return true;
			onNotice(
				"请先输入脚本内容，再继续当前操作。",
				"warning",
				`workshop-empty-${actionKey}`,
			);
			return false;
		},
		[flashWorkshopFrameAction, onNotice, workshopScript],
	);

	const setWorkshopFrameDraft = useCallback(
		(
			nextFrames: string[],
			actionKey: string,
			message: string,
			tone: RuntimeNotice["tone"] = "info",
		) => {
			setWorkshopFrameCards(nextFrames);
			flashWorkshopFrameAction(actionKey);
			onNotice(message, tone, `workshop-frame-${actionKey}`);
		},
		[flashWorkshopFrameAction, onNotice, setWorkshopFrameCards],
	);

	const saveWorkshopDraftToLocal = useCallback(() => {
		try {
			window.localStorage.setItem(
				workshopDraftStorageKey,
				JSON.stringify({
					script: workshopScript,
					step: workshopStep,
					roleTab: workshopRoleTab,
					frameTab: workshopFrameTab,
					savedAt: Date.now(),
				}),
			);
			onNotice("草稿已保存到本地。", "info", "workshop-save-local");
		} catch {
			onNotice(
				"本地保存失败，请检查浏览器存储权限。",
				"warning",
				"workshop-save-local-failed",
			);
		}
	}, [
		onNotice,
		workshopDraftStorageKey,
		workshopFrameTab,
		workshopRoleTab,
		workshopScript,
		workshopStep,
	]);

	const handleWorkshopUploadToCloud = useCallback(() => {
		if (!requireWorkshopScript("upload-cloud")) return;
		setWorkshopStep(2);
		onNotice("脚本已上传到云端，已进入分集规划。", "info", "workshop-upload-cloud");
	}, [onNotice, requireWorkshopScript, setWorkshopStep]);

	const handleWorkshopSaveLocal = useCallback(() => {
		if (!requireWorkshopScript("save-local")) return;
		saveWorkshopDraftToLocal();
	}, [requireWorkshopScript, saveWorkshopDraftToLocal]);

	const handleWorkshopDirectExtract = useCallback(() => {
		if (!requireWorkshopScript("direct-extract")) return;
		void (async () => {
			const extracted = onDirectExtract ? await onDirectExtract() : true;
			if (!extracted) return;
			setWorkshopRoleTab("角色设定");
			setWorkshopStep(3);
			onNotice(
				`已按 ${workshopDirectExtractTemplateFile} 提取角色与场景，进入角色设定。`,
				"info",
				`workshop-direct-extract-${workshopDirectExtractTemplateFile}`,
			);
		})();
	}, [
		onNotice,
		onDirectExtract,
		requireWorkshopScript,
		setWorkshopRoleTab,
		setWorkshopStep,
		workshopDirectExtractTemplateFile,
	]);

	const handleWorkshopAutoEpisodeBreakdown = useCallback(() => {
		if (!requireWorkshopScript("auto-episode-breakdown")) return;
		setWorkshopStep(2);
		onNotice("已按章节自动分集，进入分集规划。", "info", "workshop-auto-breakdown");
	}, [onNotice, requireWorkshopScript, setWorkshopStep]);

	const handleWorkshopAiEpisodeSplit = useCallback(() => {
		if (!requireWorkshopScript("ai-episode-split")) return;
		setWorkshopStep(3);
		onNotice(
			"AI 已完成智能分集，进入角色与场景设定。",
			"info",
			"workshop-ai-episode-split",
		);
	}, [onNotice, requireWorkshopScript, setWorkshopStep]);

	const handleWorkshopFrameInfer = useCallback(() => {
		if (!requireWorkshopScript("frame-infer")) return;
		setWorkshopScriptExpanded(true);
		setWorkshopFrameDraft(
			["01 · 开场建立", "02 · 情绪推进", "03 · 关键冲突", "04 · 结尾收束"],
			"frame-infer",
			"已完成分镜推理，生成 4 条初稿。",
		);
	}, [requireWorkshopScript, setWorkshopFrameDraft, setWorkshopScriptExpanded]);

	const handleWorkshopFrameValidate = useCallback(() => {
		if (!requireWorkshopScript("frame-validate")) return;
		const nextFrames = workshopFrameCards.length
			? workshopFrameCards.map(
				(frame, index) => `${frame} · 校验 ${index + 1}`,
			)
			: ["01 · 校验镜头", "02 · 校验镜头"];
		setWorkshopFrameDraft(
			nextFrames,
			"frame-validate",
			"已完成二次验证推理，当前分镜已加上校验标记。",
		);
	}, [requireWorkshopScript, setWorkshopFrameDraft, workshopFrameCards]);

	const handleWorkshopFrameMerge = useCallback(() => {
		if (!requireWorkshopScript("frame-merge")) return;
		if (!workshopFrameCards.length) {
			flashWorkshopFrameAction("frame-merge");
			onNotice(
				"当前没有可合并的分镜，请先推理或添加。",
				"warning",
				"workshop-frame-merge-empty",
			);
			return;
		}
		const fallbackMergedFrames = Array.from(
			new Set(
				workshopFrameCards.map((frame) =>
					frame.replace(/\s*·\s*校验\s*\d+$/, ""),
				),
			),
		);
		void (async () => {
			try {
				onNotice("正在调用本地 FFmpeg 融合分镜视频…", "info", "workshop-frame-merge-start");
				const responseFrames = onMergeFrames
					? await onMergeFrames(workshopFrameCards)
					: await requestLocalFrameMergeFallback(workshopFrameCards);
				const mergedFrames = responseFrames.length
					? responseFrames
						.filter((frame): frame is string => typeof frame === "string")
						.map((frame) => frame.trim())
						.filter((frame) => frame.length > 0)
					: fallbackMergedFrames;
				if (!mergedFrames.length) {
					onNotice("后端返回内容为空，已回退本地合并规则。", "warning", "workshop-frame-merge-fallback");
					setWorkshopFrameDraft(
						fallbackMergedFrames,
						"frame-merge",
						`已合并为 ${fallbackMergedFrames.length} 条分镜。`,
					);
					return;
				}
				setWorkshopFrameDraft(
					mergedFrames,
					"frame-merge",
					`已合并为 ${mergedFrames.length} 条分镜。`,
				);
			} catch (error) {
				onNotice(
					error instanceof Error ? error.message : "本地 FFmpeg 融合失败，已回退为文本去重。",
					"warning",
					"workshop-frame-merge-fallback",
				);
				if (onMergeFrames) return;
				setWorkshopFrameDraft(
					fallbackMergedFrames,
					"frame-merge",
					`已合并为 ${fallbackMergedFrames.length} 条分镜。`,
				);
			}
		})();
	}, [
		flashWorkshopFrameAction,
		onMergeFrames,
		onNotice,
		requireWorkshopScript,
		setWorkshopFrameDraft,
		workshopFrameCards,
	]);

	const handleWorkshopFrameReferenceRecognition = useCallback(() => {
		if (!requireWorkshopScript("frame-reference-recognition")) return;
		const nextFrames = workshopFrameCards.length
			? workshopFrameCards.map(
				(frame, index) => `${frame} · 参考 ${index + 1}`,
			)
			: ["参考识别 · 场景 01", "参考识别 · 场景 02"];
		setWorkshopFrameDraft(
			nextFrames,
			"frame-reference-recognition",
			"已完成批量参考二次识别。",
		);
	}, [requireWorkshopScript, setWorkshopFrameDraft, workshopFrameCards]);

	const handleWorkshopFrameAdd = useCallback(() => {
		const nextIndex = workshopFrameCards.length + 1;
		const nextFrames = [
			...workshopFrameCards,
			`新分镜 ${String(nextIndex).padStart(2, "0")}`,
		];
		setWorkshopFrameDraft(nextFrames, "frame-add", "已添加一个分镜占位。");
	}, [setWorkshopFrameDraft, workshopFrameCards]);

	const handleWorkshopFrameImport = useCallback(() => {
		if (!requireWorkshopScript("frame-import")) return;
		const nextFrames = [...workshopFrameCards, "导入分镜 A", "导入分镜 B"];
		setWorkshopFrameDraft(nextFrames, "frame-import", "已导入外部分镜参考。");
	}, [requireWorkshopScript, setWorkshopFrameDraft, workshopFrameCards]);

	const handleWorkshopFrameClear = useCallback(() => {
		setWorkshopFrameCards([]);
		flashWorkshopFrameAction("frame-clear");
		onNotice("分镜草稿已清空。", "info", "workshop-frame-clear");
	}, [flashWorkshopFrameAction, onNotice, setWorkshopFrameCards]);

	useEffect(
		() => () => {
			if (workshopFrameActionTimerRef.current !== null) {
				window.clearTimeout(workshopFrameActionTimerRef.current);
			}
		},
		[],
	);

	return {
		workshopFrameActionKey,
		handleWorkshopUploadToCloud,
		handleWorkshopSaveLocal,
		handleWorkshopDirectExtract,
		handleWorkshopAutoEpisodeBreakdown,
		handleWorkshopAiEpisodeSplit,
		handleWorkshopFrameInfer,
		handleWorkshopFrameValidate,
		handleWorkshopFrameMerge,
		handleWorkshopFrameReferenceRecognition,
		handleWorkshopFrameAdd,
		handleWorkshopFrameImport,
		handleWorkshopFrameClear,
	};
}
