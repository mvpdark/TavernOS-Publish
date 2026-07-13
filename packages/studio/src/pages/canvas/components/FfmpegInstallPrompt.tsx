import type { FfmpegInstallPromptState } from "../appCanvasState";

export type FfmpegInstallPromptProps = {
	prompt: FfmpegInstallPromptState;
	installingNodeId: string | null;
	onDismiss: () => void;
	onConfirm: () => void;
};

export function FfmpegInstallPrompt({
	prompt,
	installingNodeId,
	onDismiss,
	onConfirm,
}: FfmpegInstallPromptProps) {
	if (!prompt) return null;

	const isInstalling = Boolean(installingNodeId);

	return (
		<div
			className="ffmpeg-install-float"
			role="dialog"
			aria-modal="true"
			aria-label="安装 FFmpeg"
		>
			<div className="ffmpeg-install-float__orb">FF</div>
			<div className="ffmpeg-install-float__body">
				<span>本机能力缺失</span>
				<strong>需要安装 FFmpeg 才能继续处理媒体</strong>
				<p>{prompt.message}</p>
				<small>
					会打开一个可见的安装窗口显示下载、解压和 PATH 写入进度；
					安装位置是当前用户的系统程序目录，不会写入 Kaka Studio 项目目录。
				</small>
			</div>
			<div className="ffmpeg-install-float__actions">
				<button
					type="button"
					className="ffmpeg-install-float__secondary"
					disabled={isInstalling}
					onClick={onDismiss}
				>
					暂不安装
				</button>
				<button
					type="button"
					className="ffmpeg-install-float__primary"
					disabled={isInstalling}
					onClick={onConfirm}
				>
					{isInstalling ? "正在打开..." : "打开安装窗口"}
				</button>
			</div>
		</div>
	);
}
