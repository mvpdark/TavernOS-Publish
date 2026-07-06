// ---------------------------------------------------------------------------
// Tasks route: background task management API.
//
// Endpoints:
//   GET    /api/tasks           — list all tasks (newest first)
//   GET    /api/tasks/:id       — get single task status
//   POST   /api/tasks/:id/cancel — cancel a running task
//   DELETE /api/tasks/:id       — remove a finished task from the list
//   DELETE /api/tasks           — clear all finished tasks
// ---------------------------------------------------------------------------

import { Hono } from "hono";
import { taskManager } from "../task-manager";

export function createTasksRouter(): Hono {
  const router = new Hono();

  // List all tasks
  router.get("/api/tasks", (c) => {
    const projectId = c.req.query("projectId");
    const tasks = projectId
      ? taskManager.listByProject(projectId)
      : taskManager.list();
    return c.json({ tasks });
  });

  // Get single task
  router.get("/api/tasks/:id", (c) => {
    const id = c.req.param("id");
    const task = taskManager.get(id);
    if (!task) return c.json({ error: "Task not found" }, 404);
    return c.json({ task });
  });

  // Cancel a running task
  router.post("/api/tasks/:id/cancel", (c) => {
    const id = c.req.param("id");
    const ok = taskManager.cancel(id);
    if (!ok) return c.json({ error: "Task not found or not running" }, 400);
    return c.json({ success: true });
  });

  // Remove a finished task
  router.delete("/api/tasks/:id", (c) => {
    const id = c.req.param("id");
    const ok = taskManager.remove(id);
    if (!ok) return c.json({ error: "Task not found" }, 404);
    return c.json({ success: true });
  });

  // Clear all finished tasks
  router.delete("/api/tasks", (c) => {
    taskManager.clearFinished();
    return c.json({ success: true });
  });

  return router;
}
