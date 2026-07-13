// CanvasPage.tsx — Route entry point for the Canvas module
// Lazy-loaded by App.tsx when navigating to /studio/canvas
// Auto-selects first project if none selected — no need to visit dashboard first

import { Suspense, lazy, useEffect } from "react";
import { useProjectStore } from "../../store/project.js";

const CanvasApp = lazy(() => import("./CanvasApp.js"));

export default function CanvasPage() {
  const currentProject = useProjectStore((s) => s.currentProject);
  const projects = useProjectStore((s) => s.projects);
  const fetchProjects = useProjectStore((s) => s.fetchProjects);
  const setCurrentProject = useProjectStore((s) => s.setCurrentProject);

  // Auto-load projects and select first one if none selected
  useEffect(() => {
    if (projects.length === 0) {
      fetchProjects();
    }
  }, [projects.length, fetchProjects]);

  // Auto-select first project if none selected
  useEffect(() => {
    if (!currentProject && projects.length > 0) {
      setCurrentProject(projects[0]);
    }
  }, [currentProject, projects, setCurrentProject]);

  return (
    <div className="h-full w-full overflow-hidden">
      <Suspense
        fallback={
          <div className="flex h-full items-center justify-center text-zinc-500">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-amber-500" />
              <p className="text-sm">正在加载画布...</p>
            </div>
          </div>
        }
      >
        <CanvasApp />
      </Suspense>
    </div>
  );
}
