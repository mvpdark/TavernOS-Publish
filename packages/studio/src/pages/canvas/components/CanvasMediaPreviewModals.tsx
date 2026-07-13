import type {
	ImagePreviewState,
	VideoPreviewState,
} from "../appCanvasState";
import { ThreeDDirectorPanoramaPreview } from "./ThreeDDirectorPanoramaPreview";

export type ImagePreviewModalProps = {
	imagePreview: ImagePreviewState;
	onClose: () => void;
};

export function ImagePreviewModal({
	imagePreview,
	onClose,
}: ImagePreviewModalProps) {
	if (!imagePreview) return null;

	return (
		<div className="image-preview-modal" onPointerDown={onClose}>
			<div
				className="image-preview-modal__panel"
				onPointerDown={(event) => event.stopPropagation()}
			>
				<div className="image-preview-modal__chrome">
					<div>
						<span>图片预览</span>
						<strong>{imagePreview.name}</strong>
					</div>
					<button
						type="button"
						className="image-preview-modal__close"
						onClick={onClose}
						aria-label="关闭图片预览"
					>
						×
					</button>
				</div>
				{imagePreview.isThreeDDirector ? (
					<ThreeDDirectorPanoramaPreview
						assetUrl={imagePreview.url}
						assetName={imagePreview.name}
						providerMetadata={imagePreview.providerMetadata}
						className="three-d-director-panorama--modal"
					/>
				) : (
					<img
						className="image-preview-modal__image"
						src={imagePreview.url}
						alt={imagePreview.name}
						draggable={false}
					/>
				)}
			</div>
		</div>
	);
}

export type VideoPreviewModalProps = {
	videoPreview: VideoPreviewState;
	onClose: () => void;
};

export function VideoPreviewModal({
	videoPreview,
	onClose,
}: VideoPreviewModalProps) {
	if (!videoPreview) return null;

	return (
		<div className="video-preview-modal" onPointerDown={onClose}>
			<div
				className="video-preview-modal__panel"
				onPointerDown={(event) => event.stopPropagation()}
			>
				<video
					className="video-preview-modal__player"
					src={videoPreview.url}
					controls
					autoPlay
					playsInline
				>
					<track
						kind="captions"
						label="字幕"
						srcLang="zh"
						src="data:text/vtt,WEBVTT%0A%0A00:00:00.000 --> 00:00:02.000%0APreview captions unavailable."
						default
					/>
				</video>
			</div>
		</div>
	);
}
