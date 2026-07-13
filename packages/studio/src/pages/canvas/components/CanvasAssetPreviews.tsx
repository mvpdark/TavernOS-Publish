import {
	type PointerEvent,
	useEffect,
	useRef,
	useState,
} from "react";

type NodeControlPointerHandler = (event: PointerEvent<HTMLElement>) => void;

export function AudioAssetPreview({
	assetUrl,
	isMusic = false,
	stopNodeControlPointerDown,
}: {
	assetUrl: string;
	isMusic?: boolean;
	stopNodeControlPointerDown: NodeControlPointerHandler;
}) {
	const audioRef = useRef<HTMLAudioElement | null>(null);
	const [isPlaying, setIsPlaying] = useState(false);

	useEffect(() => {
		const audio = audioRef.current;
		if (!audio) return;
		const handleEnded = () => setIsPlaying(false);
		const handlePause = () => setIsPlaying(false);
		const handlePlay = () => setIsPlaying(true);
		audio.addEventListener("ended", handleEnded);
		audio.addEventListener("pause", handlePause);
		audio.addEventListener("play", handlePlay);
		return () => {
			audio.removeEventListener("ended", handleEnded);
			audio.removeEventListener("pause", handlePause);
			audio.removeEventListener("play", handlePlay);
		};
	}, []);

	async function togglePlayback() {
		const audio = audioRef.current;
		if (!audio) return;
		if (audio.paused) {
			await audio.play().catch(() => undefined);
			return;
		}
		audio.pause();
	}

	return (
		<div
			className={`canvas-node__asset-preview ${isMusic ? "canvas-node__asset-preview--music" : "canvas-node__asset-preview--audio"} ${isPlaying ? "is-playing" : ""}`}
		>
			{isMusic ? (
				<div className="canvas-node__music-note" aria-hidden="true">
					<span className="canvas-node__music-note-disc" />
					<span className="canvas-node__music-note-stem" />
					<span className="canvas-node__music-note-flag" />
				</div>
			) : (
				<div className="canvas-node__audio-wave" aria-hidden="true">
					{Array.from({ length: 17 }, (_, index) => {
						const barHeight = 18 + ((index * 9) % 44);
						return (
							<span
								key={`audio-wave-${barHeight}`}
								className="canvas-node__audio-bar"
								style={{ ["--bar-height" as string]: `${barHeight}px` }}
							/>
						);
					})}
				</div>
			)}
			<button
				className={`canvas-node__audio-play ${isPlaying ? "is-playing" : ""}`}
				type="button"
				onPointerDown={stopNodeControlPointerDown}
				onClick={(event) => {
					event.stopPropagation();
					togglePlayback();
				}}
				aria-label={isPlaying ? "暂停音频" : "播放音频"}
			>
				<span>{isPlaying ? "❚❚" : "▶"}</span>
			</button>
			<audio
				ref={audioRef}
				src={assetUrl}
				preload="metadata"
				className="canvas-node__audio-element"
			>
				<track
					kind="captions"
					label="字幕"
					srcLang="zh"
					src="data:text/vtt,WEBVTT%0A%0A"
					default
				/>
			</audio>
		</div>
	);
}

export function VideoAssetPreview({
	assetUrl,
	nodeId,
	onOpenVideoPreview,
	onVideoMetadataLoaded,
	stopNodeControlPointerDown,
}: {
	assetUrl: string;
	nodeId: string;
	onOpenVideoPreview: (nodeId: string) => void;
	onVideoMetadataLoaded: (nodeId: string, width: number, height: number) => void;
	stopNodeControlPointerDown: NodeControlPointerHandler;
}) {
	const videoRef = useRef<HTMLVideoElement | null>(null);
	const previewRef = useRef<HTMLDivElement | null>(null);
	const [isPlaying, setIsPlaying] = useState(false);

	useEffect(() => {
		const video = videoRef.current;
		if (!video) return;
		const handleEnded = () => {
			setIsPlaying(false);
			video.currentTime = 0;
		};
		const handlePause = () => setIsPlaying(false);
		const handlePlay = () => setIsPlaying(true);
		const handleLoadedMetadata = () => {
			if (video.videoWidth > 0 && video.videoHeight > 0) {
				onVideoMetadataLoaded(nodeId, video.videoWidth, video.videoHeight);
			}
		};
		video.addEventListener("ended", handleEnded);
		video.addEventListener("pause", handlePause);
		video.addEventListener("play", handlePlay);
		video.addEventListener("loadedmetadata", handleLoadedMetadata);
		handleLoadedMetadata();
		return () => {
			video.removeEventListener("ended", handleEnded);
			video.removeEventListener("pause", handlePause);
			video.removeEventListener("play", handlePlay);
			video.removeEventListener("loadedmetadata", handleLoadedMetadata);
		};
	}, [nodeId, onVideoMetadataLoaded]);

	useEffect(() => {
		const preview = previewRef.current;
		if (!preview) return;
		const handleDoubleClick = (event: globalThis.MouseEvent) => {
			const target = event.target instanceof HTMLElement ? event.target : null;
			if (target?.closest("button")) return;
			event.preventDefault();
			event.stopPropagation();
			if (videoRef.current && !videoRef.current.paused) {
				videoRef.current.pause();
			}
			onOpenVideoPreview(nodeId);
		};
		preview.addEventListener("dblclick", handleDoubleClick);
		return () => preview.removeEventListener("dblclick", handleDoubleClick);
	}, [nodeId, onOpenVideoPreview]);

	async function togglePlayback() {
		const video = videoRef.current;
		if (!video) return;
		if (video.paused) {
			await video.play().catch(() => undefined);
			return;
		}
		video.pause();
	}

	return (
		<div
			ref={previewRef}
			className={`canvas-node__asset-preview canvas-node__asset-preview--video ${isPlaying ? "is-playing" : ""}`}
		>
			<video
				ref={videoRef}
				src={assetUrl}
				className="canvas-node__asset-video"
				playsInline
				preload="metadata"
			>
				<track
					kind="captions"
					label="字幕"
					srcLang="zh"
					src="data:text/vtt,WEBVTT%0A%0A"
					default
				/>
			</video>
			<button
				className={`canvas-node__video-play ${isPlaying ? "is-playing" : ""}`}
				type="button"
				onPointerDown={stopNodeControlPointerDown}
				onClick={(event) => {
					event.stopPropagation();
					togglePlayback();
				}}
				aria-label={isPlaying ? "暂停视频" : "播放视频"}
			>
				<span>{isPlaying ? "❚❚" : "▶"}</span>
			</button>
		</div>
	);
}
