import { Suspense, lazy, useState, useEffect } from "react";
import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { JSX } from "react";
import CategoryLayout from "./components/CategoryLayout.js";
import CommandPalette from "./components/CommandPalette.js";
import TaskIndicator from "./components/TaskIndicator.js";
import { ToastProvider } from "./components/Toast.js";
import { PageTransition } from "./components/PageTransition.js";

const Launcher = lazy(() => import("./pages/Launcher.tsx"));
const Dashboard = lazy(() => import("./pages/Dashboard.tsx"));
const Library = lazy(() => import("./pages/Library.tsx"));
const Editor = lazy(() => import("./pages/Editor.tsx"));
const Characters = lazy(() => import("./pages/Characters.tsx"));
const LoreBook = lazy(() => import("./pages/LoreBook.tsx"));
const Chat = lazy(() => import("./pages/Chat.tsx"));
const Blueprint = lazy(() => import("./pages/Blueprint.tsx"));
const Create = lazy(() => import("./pages/Create.tsx"));
const StyleLibrary = lazy(() => import("./pages/StyleLibrary.tsx"));
const DeepGame = lazy(() => import("./pages/DeepGame.tsx"));
const Analytics = lazy(() => import("./pages/Analytics.tsx"));
const Settings = lazy(() => import("./pages/Settings.tsx"));
const Appearance = lazy(() => import("./pages/Appearance.tsx"));
const GroupChat = lazy(() => import("./pages/GroupChat.tsx"));
const Video = lazy(() => import("./pages/Video.tsx"));
const Workshop = lazy(() => import("./pages/Workshop.tsx"));
const CanvasPage = lazy(() => import("./pages/canvas/CanvasPage.tsx"));
const WorldOverview = lazy(() => import("./pages/WorldOverview.tsx"));
const Assets = lazy(() => import("./pages/Assets.tsx"));
const Scenes = lazy(() => import("./pages/Scenes.tsx"));
const Props = lazy(() => import("./pages/Props.tsx"));

// Chat and GroupChat are temporarily unrouted but retained for future use.
void Chat;
void GroupChat;

/**
 * Smart preload: when the user enters a layout, preload the pages that
 * belong to that layout. This avoids the "flash" of Suspense fallback on
 * first tab switch without loading ALL pages upfront (which would negate
 * the benefit of code-splitting).
 *
 * Each layout preloads its own pages + shared pages (Settings/Appearance).
 */
const LAYOUT_PRELOAD: Record<string, Array<() => Promise<unknown>>> = {
  write: [
    () => import("./pages/Library.tsx"),
    () => import("./pages/Editor.tsx"),
    () => import("./pages/LoreBook.tsx"),
    () => import("./pages/Workshop.tsx"),
    // These pages live under /write/* routes (see <Route path="/write">),
    // so they must be preloaded together with the write layout.
    () => import("./pages/Create.tsx"),
    () => import("./pages/Blueprint.tsx"),
    () => import("./pages/DeepGame.tsx"),
    () => import("./pages/StyleLibrary.tsx"),
  ],
  assets: [
    () => import("./pages/Characters.tsx"),
    () => import("./pages/Scenes.tsx"),
    () => import("./pages/Props.tsx"),
  ],
  chat: [
    () => import("./pages/Chat.tsx"),
    () => import("./pages/GroupChat.tsx"),
  ],
  create: [
    // Only pages that truly belong to the Studio (/studio/*) layout.
    () => import("./pages/Video.tsx"),
    () => import("./pages/Assets.tsx"),
  ],
  system: [
    () => import("./pages/Settings.tsx"),
    () => import("./pages/Appearance.tsx"),
    () => import("./pages/Analytics.tsx"),
    () => import("./pages/WorldOverview.tsx"),
  ],
};

function preloadLayout(layout: string): void {
  const pages = LAYOUT_PRELOAD[layout];
  if (pages) {
    // Fire-and-forget — pages load in background
    for (const p of pages) p().catch(() => {});
  }
}

function Fallback(): JSX.Element {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center animate-fade-in">
      <div className="relative mb-4">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#222222] border-t-[#C9A86C]" />
      </div>
      <div className="text-sm text-[#555555]">{t("common.loading")}</div>
    </div>
  );
}

// Category layouts — each wraps its sub-pages
function WriteLayout(): JSX.Element {
  useEffect(() => { preloadLayout("write"); }, []);
  const { t } = useTranslation();
  return (
    <CategoryLayout title={t("nav.write")} subtitle={t("nav.writeSubtitle")}
      subNav={[
        { to: "/write/library", label: t("nav.library"), end: true },
        { to: "/write/editor", label: t("nav.editor") },
        { to: "/write/blueprint", label: t("nav.blueprint") },
        { to: "/write/style", label: t("nav.styleLibrary") },
        { to: "/write/deep-game", label: t("nav.deepGame") },
      ]}>
      <Suspense fallback={<Fallback />}><Outlet /></Suspense>
    </CategoryLayout>
  );
}

function AssetLayout(): JSX.Element {
  useEffect(() => { preloadLayout("assets"); }, []);
  const { t } = useTranslation();
  return (
    <CategoryLayout title={t("nav.assets")} subtitle={t("nav.assetsSubtitle")}
      subNav={[
        { to: "/assets/characters", label: t("nav.characters"), end: true },
        { to: "/assets/scenes", label: t("nav.scenes") },
        { to: "/assets/props", label: t("nav.props") },
      ]}>
      <Suspense fallback={<Fallback />}><Outlet /></Suspense>
    </CategoryLayout>
  );
}

function WorldLayout(): JSX.Element {
  useEffect(() => { preloadLayout("write"); }, []);
  const { t } = useTranslation();
  return (
    <CategoryLayout title={t("nav.world")} subtitle={t("nav.worldSubtitle")}
      subNav={[
        { to: "/world", label: t("nav.worldOverview"), end: true },
        { to: "/world/lorebook", label: t("nav.lorebook") },
        { to: "/world/assets", label: t("nav.assets") },
      ]}>
      <Suspense fallback={<Fallback />}><Outlet /></Suspense>
    </CategoryLayout>
  );
}

function StudioLayout(): JSX.Element {
  useEffect(() => { preloadLayout("create"); }, []);
  const { t } = useTranslation();
  return (
    <CategoryLayout title={t("nav.studio")} subtitle={t("nav.studioSubtitle")}
      subNav={[
        { to: "/studio/workshop", label: t("nav.workshop"), end: true },
        { to: "/studio/canvas", label: "画布" },
        { to: "/studio/video", label: t("nav.video") },
        { to: "/studio/analytics", label: t("nav.analytics") },
      ]}>
      <Suspense fallback={<Fallback />}><Outlet /></Suspense>
    </CategoryLayout>
  );
}

function SystemLayout(): JSX.Element {
  useEffect(() => { preloadLayout("system"); }, []);
  const { t } = useTranslation();
  return (
    <CategoryLayout title={t("nav.system")} subtitle={t("nav.systemSubtitle")}
      subNav={[
        { to: "/system/settings", label: t("common.settings"), end: true },
        { to: "/system/appearance", label: t("common.appearance") },
      ]}>
      <Suspense fallback={<Fallback />}><Outlet /></Suspense>
    </CategoryLayout>
  );
}

export default function App(): JSX.Element {
  const { t } = useTranslation();
  // 载入动画：每个浏览器会话只播放一次
  const [introDone, setIntroDone] = useState(
    () => sessionStorage.getItem("tavernos_intro_played") === "1"
  );

  useEffect(() => {
    if (introDone) return;
    const timer = setTimeout(() => {
      sessionStorage.setItem("tavernos_intro_played", "1");
      setIntroDone(true);
    }, 3000);
    return () => clearTimeout(timer);
  }, [introDone]);

  return (
    <>
      {!introDone && (
        <div
          id="intro-overlay"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 99999,
            background: "#050505",
            pointerEvents: "none",
            animation: "introFadeOut 0.8s ease-in 2.2s forwards",
          }}
        >
          <div
            id="intro-brand"
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              fontFamily: 'Georgia, "Times New Roman", serif',
              fontSize: "clamp(54px, 9vw, 120px)",
              fontWeight: 700,
              letterSpacing: "0.13em",
              background: "linear-gradient(110deg, #6E4C12, #D4AF37 34%, #FFF1A6 50%, #C8941C 68%, #6E4C12)",
              backgroundSize: "200% 100%",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              WebkitTextFillColor: "transparent",
              animation: "introFlyIn 1.2s cubic-bezier(0.16,1,0.3,1) 0.2s forwards, introShimmer 1.5s ease-in-out 1.4s infinite, introMoveUp 0.8s ease-in-out 2s forwards",
              opacity: 0,
            }}
          >
            TAVERNOS
          </div>
          <div
            style={{
              position: "absolute",
              top: "calc(50% + 80px)",
              left: "50%",
              transform: "translateX(-50%)",
              color: "rgba(212,175,55,0.5)",
              fontSize: "12px",
              letterSpacing: "0.6em",
              textTransform: "uppercase",
              whiteSpace: "nowrap",
              fontFamily: "Inter, sans-serif",
              opacity: 0,
              animation: "introSubIn 0.6s ease-out 1.5s forwards",
            }}
          >
            {t("common.appTagline")}
          </div>
        </div>
      )}
      <style>{`
        @keyframes introFlyIn {
          0% { opacity: 0; transform: translate(-50%, -50%) scale(3.5) perspective(1200px) rotateX(32deg); filter: blur(12px); }
          100% { opacity: 1; transform: translate(-50%, -50%) scale(1) perspective(1200px) rotateX(0deg); filter: blur(0px); }
        }
        @keyframes introShimmer {
          0%, 100% { background-position: 0% 0%; }
          50% { background-position: 200% 0%; }
        }
        @keyframes introMoveUp {
          0% { transform: translate(-50%, -50%) scale(1); }
          100% { transform: translate(-50%, -180%) scale(0.3); opacity: 0; }
        }
        @keyframes introSubIn {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }
        @keyframes introFadeOut {
          0% { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>
    <ToastProvider>
    <PageTransition>
    <Routes>
      {/* Launcher — home */}
      <Route path="/" element={<Suspense fallback={<Fallback />}><Launcher /></Suspense>} />

      {/* Dashboard — direct access */}
      <Route path="/dashboard" element={<Suspense fallback={<Fallback />}><Dashboard /></Suspense>} />

      {/* 写作 */}
      <Route path="/write" element={<WriteLayout />}>
        <Route index element={<Navigate to="/write/library" replace />} />
        <Route path="library" element={<Library />} />
        <Route path="editor" element={<Editor />} />
        <Route path="blueprint" element={<Blueprint />} />
        <Route path="create" element={<Create />} />
        <Route path="style" element={<StyleLibrary />} />
        <Route path="deep-game" element={<DeepGame />} />
      </Route>

      {/* 资产 */}
      <Route path="/assets" element={<AssetLayout />}>
        <Route index element={<Navigate to="/assets/characters" replace />} />
        <Route path="characters" element={<Characters />} />
        <Route path="scenes" element={<Scenes />} />
        <Route path="props" element={<Props />} />
      </Route>

      {/* 旧路由重定向 */}
      <Route path="/characters/*" element={<Navigate to="/assets/characters" replace />} />

      {/* 世界观 */}
      <Route path="/world" element={<WorldLayout />}>
        <Route index element={<WorldOverview />} />
        <Route path="lorebook" element={<LoreBook />} />
        <Route path="assets" element={<Assets />} />
      </Route>

      {/* 影视 */}
      <Route path="/studio" element={<StudioLayout />}>
        <Route index element={<Navigate to="/studio/workshop" replace />} />
        <Route path="workshop" element={<Workshop />} />
        <Route path="canvas" element={<CanvasPage />} />
        <Route path="video" element={<Video />} />
        <Route path="analytics" element={<Analytics />} />
      </Route>

      {/* 系统 */}
      <Route path="/system" element={<SystemLayout />}>
        <Route index element={<Navigate to="/system/settings" replace />} />
        <Route path="settings" element={<Settings />} />
        <Route path="appearance" element={<Appearance />} />
      </Route>
    </Routes>
    </PageTransition>
    <CommandPalette />
    <TaskIndicator />
    </ToastProvider>
    </>
  );
}
