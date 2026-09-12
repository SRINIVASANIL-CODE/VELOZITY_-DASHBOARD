import cron from "node-cron";
import { prisma } from "../config/prisma";

// Sweeps for tasks past their due date and flags them, on a schedule — never computed
// on the fly when a page loads, so "Overdue" is a stored fact, not a derived one that
// could disagree between two people viewing the same task at slightly different times.
export async function sweepOverdueTasks() {
  const now = new Date();
  const result = await prisma.task.updateMany({
    where: {
      isOverdue: false,
      dueDate: { lt: now },
      status: { not: "DONE" },
    },
    data: { isOverdue: true },
  });
  if (result.count > 0) {
    console.log(`[overdue-job] flagged ${result.count} task(s) as overdue at ${now.toISOString()}`);
  }
  return result.count;
}

// Runs every 5 minutes. node-cron was chosen over a full queue (e.g. Bull/Redis) because
// this is a single, stateless, idempotent sweep with no per-job payload or retry needs —
// adding a Redis-backed queue for one recurring UPDATE would be infrastructure the task
// doesn't earn. If overdue detection grew retry/backoff/distributed-worker requirements,
// Bull would be the right move.
export function startOverdueJob() {
  cron.schedule("*/5 * * * *", () => {
    sweepOverdueTasks().catch((err) => console.error("[overdue-job] failed:", err));
  });
  // Also run once at boot so overdue state is correct immediately after a deploy/restart.
  sweepOverdueTasks().catch((err) => console.error("[overdue-job] initial run failed:", err));
}
