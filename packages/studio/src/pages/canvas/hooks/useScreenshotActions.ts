import type { Dispatch, SetStateAction } from "react";
import { useCallback } from "react";
import { findConnectedVideoNodeForText } from "../canvasConnectionActions";
import {
	applyUploadedScreenshotAsset,
	buildVideoScreenshotPrompt,
	createScreenshotConnection,
	createScreenshotImageNode,
} from "../appScreenshotNodeActions";
import {
	extractScreenshotFromVideoAsset,
	isVideoScreenshotPrompt,
} from "../videoFrameHelpers";
import type { NodeConnection } from "./useConnectionInteractionHelpers";
import type { RuntimeNotice } from "./useRuntimeNotices";
import type { CanvasNode, ComposerPreset, StyleLibraryState } from "../canvas-types";

type GeneratedUploadResult = { cloudPath: string; url: string };

type UseScreenshotActionsArgs = {
	primaryNode: CanvasNode | null;
	promptPrefix: string;
	composerPrompt: string;
	imageComposer: ComposerPreset;
	globalStylePresetId: string;
	styleLibrary: StyleLibraryState;
	latestNodesRef: { current: CanvasNode[] };
	latestConnectionsRef: { current: NodeConnection[] };
	pushRuntimeNotice: (
		message: string,
		tone?: RuntimeNotice["tone"],
		dedupeKey?: string,
	) => void;
	pushUndoSnapshot: () => void;
	setGeneratingNodeIds: Dispatch<SetStateAction<Set<string>>>;
	setNodes: Dispatch<SetStateAction<CanvasNode[]>>;
	setConnections: Dispatch<SetStateAction<NodeConnection[]>>;
	setSelectedIds: Dispatch<SetStateAction<string[]>>;
	withTimeout: <T>(promise: Promise<T>, timeoutMs: number, message: string) => Promise<T>;
	uploadGeneratedAssetToCloudDrive: (
		file: File,
		category: "video" | "audio" | "music" | "image",
	) => Promise<GeneratedUploadResult>;
};

export function useScreenshotActions({
	primaryNode,
	promptPrefix,
	composerPrompt,
	imageComposer,
	globalStylePresetId,
	styleLibrary,
	latestNodesRef,
	latestConnectionsRef,
	pushRuntimeNotice,
	pushUndoSnapshot,
	setGeneratingNodeIds,
	setNodes,
	setConnections,
	setSelectedIds,
	withTimeout,
	uploadGeneratedAssetToCloudDrive,
}: UseScreenshotActionsArgs) {
	const handleVideoScreenshotFromText = useCallback(async () => {
		if (!primaryNode || primaryNode.type !== "text") return false;
		const prompt = buildVideoScreenshotPrompt({
			promptPrefix,
			nodePrompt: primaryNode.composer?.prompt,
			composerPrompt,
		});
		if (!isVideoScreenshotPrompt(prompt)) return false;

		const textNode =
			latestNodesRef.current.find((node) => node.id === primaryNode.id) ?? primaryNode;
		const videoNode = findConnectedVideoNodeForText(
			textNode.id,
			latestNodesRef.current,
			latestConnectionsRef.current,
		);
		if (!videoNode?.asset?.url) {
			pushRuntimeNotice(
				"请先把视频节点连接到这个文本节点，再让文本节点执行截图。",
				"warning",
				`video-text-screenshot-missing-video-${textNode.id}`,
			);
			return true;
		}

		setGeneratingNodeIds((current) => {
			const next = new Set(current);
			next.add(textNode.id);
			return next;
		});
		try {
			pushRuntimeNotice(
				"正在从已连接视频提取截图；会先生成本地图片节点，随后后台同步到 CloudDrive…",
				"info",
				`video-text-screenshot-start-${textNode.id}`,
			);
			const screenshot = await withTimeout(
				extractScreenshotFromVideoAsset(videoNode.asset, prompt),
				30000,
				"截图超时，请确认视频文件可读取，或重新上传后再试。",
			);
			const localUrl = URL.createObjectURL(screenshot.file);
			const imageNode = createScreenshotImageNode({
				textNode,
				imageComposer,
				screenshotFile: screenshot.file,
				localUrl,
				screenshotSize: screenshot.size,
				globalStylePresetId,
				styleLibrary,
			});
			const screenshotConnection = createScreenshotConnection(textNode.id, imageNode.id);
			pushUndoSnapshot();
			setNodes((current) => current.concat(imageNode));
			setConnections((current) => current.concat(screenshotConnection));
			setSelectedIds([imageNode.id]);
			pushRuntimeNotice(
				"截图已完成，图片节点已自动放到文本节点后面并完成连接。",
				"info",
				`video-text-screenshot-success-${imageNode.id}`,
			);
			void (async () => {
				try {
					const uploaded = await withTimeout(
						uploadGeneratedAssetToCloudDrive(screenshot.file, "image"),
						60000,
						"截图上传到 CloudDrive 超时。",
					);
					setNodes((current) =>
						applyUploadedScreenshotAsset({
							nodes: current,
							imageNodeId: imageNode.id,
							screenshotFile: screenshot.file,
							localUrl,
							uploaded,
						}),
					);
					pushRuntimeNotice(
						"截图已后台同步到 CloudDrive。",
						"info",
						`video-text-screenshot-uploaded-${imageNode.id}`,
					);
				} catch (uploadError) {
					console.warn("Screenshot upload failed; keeping local blob URL.", uploadError);
					pushRuntimeNotice(
						`截图节点已生成，但后台上传失败：${uploadError instanceof Error ? uploadError.message : "未知错误"}`,
						"warning",
						`video-text-screenshot-upload-failed-${imageNode.id}`,
					);
				}
			})();
		} catch (error) {
			console.error("Failed to create screenshot node from connected video.", error);
			pushRuntimeNotice(
				`截图失败：${error instanceof Error ? error.message : "未知错误"}`,
				"warning",
				`video-text-screenshot-failed-${textNode.id}-${Date.now()}`,
			);
		} finally {
			setGeneratingNodeIds((current) => {
				if (!current.has(textNode.id)) return current;
				const next = new Set(current);
				next.delete(textNode.id);
				return next;
			});
		}
		return true;
	}, [
		composerPrompt,
		globalStylePresetId,
		imageComposer,
		latestConnectionsRef,
		latestNodesRef,
		primaryNode,
		promptPrefix,
		pushRuntimeNotice,
		pushUndoSnapshot,
		setConnections,
		setGeneratingNodeIds,
		setNodes,
		setSelectedIds,
		styleLibrary,
		uploadGeneratedAssetToCloudDrive,
		withTimeout,
	]);

	return { handleVideoScreenshotFromText };
}
