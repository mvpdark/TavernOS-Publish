import { create } from "zustand";
import { persist } from "zustand/middleware";
import { apiGet, apiPost } from "../api/client.js";

export interface Project {
  id: string;
  name: string;
  version?: string;
  language?: string;
  /** Work type: long-form novel ("long") or short story ("short"). */
  type?: "long" | "short";
  /** Story genre, e.g. 奇幻 / 科幻 / 悬疑. */
  genre?: string;
  /** 封面图 URL */
  coverUrl?: string;
  createdAt?: string;
}

interface ProjectState {
  projects: Project[];
  currentProject: Project | null;
  loading: boolean;
  error: string | null;
  fetchProjects: () => Promise<void>;
  createProject: (name: string, language?: string, type?: "long" | "short", genre?: string) => Promise<Project | undefined>;
  setCurrentProject: (project: Project | null) => void;
}

// Inflight guard — prevents concurrent duplicate fetchProjects requests.
let fetchProjectsInflight: Promise<void> | null = null;

export const useProjectStore = create<ProjectState>()(
  persist(
    (set) => ({
      projects: [],
      currentProject: null,
      loading: false,
      error: null,
      fetchProjects: async () => {
        // Deduplicate: if a fetch is already running, await it instead of
        // triggering a parallel request.
        if (fetchProjectsInflight) return fetchProjectsInflight;
        const run = async (): Promise<void> => {
          set({ loading: true, error: null });
          try {
            const data = await apiGet<{ projects: Project[] }>("/projects");
            set((state) => {
              // Reconcile persisted currentProject: if it no longer exists in
              // the freshly fetched list (e.g. it was deleted out-of-band),
              // clear it to avoid pointing at a ghost project.
              const stillExists =
                state.currentProject != null &&
                data.projects.some((p) => p.id === state.currentProject!.id);
              return {
                projects: data.projects,
                loading: false,
                currentProject: stillExists ? state.currentProject : null,
              };
            });
          } catch (e) {
            set({ error: e instanceof Error ? e.message : String(e), loading: false });
          } finally {
            fetchProjectsInflight = null;
          }
        };
        fetchProjectsInflight = run();
        return fetchProjectsInflight;
      },
      createProject: async (name: string, language?: string, type?: "long" | "short", genre?: string) => {
        set({ error: null });
        try {
          const project = await apiPost<Project>("/projects", { name, language, type, genre });
          set((state) => ({ projects: [...state.projects, project], currentProject: project }));
          return project;
        } catch (e) {
          set({ error: e instanceof Error ? e.message : String(e) });
          throw e;
        }
      },
      setCurrentProject: (currentProject) => set({ currentProject }),
    }),
    {
      name: "tavernos-project",
      partialize: (state) => ({ currentProject: state.currentProject }),
    },
  ),
);
