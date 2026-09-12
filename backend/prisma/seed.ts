import { PrismaClient, Role, TaskPriority, TaskStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function hash(pw: string) {
  return bcrypt.hash(pw, 10);
}

async function main() {
  console.log("Seeding...");

  // Wipe in FK-safe order for repeatable local runs.
  await prisma.notification.deleteMany();
  await prisma.activityEvent.deleteMany();
  await prisma.task.deleteMany();
  await prisma.project.deleteMany();
  await prisma.client.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();

  const defaultPassword = await hash("Password123!");

  const admin = await prisma.user.create({
    data: { name: "Ava Admin", email: "admin@velozity.dev", passwordHash: defaultPassword, role: Role.ADMIN },
  });

  const pm1 = await prisma.user.create({
    data: { name: "Priya Menon", email: "priya.pm@velozity.dev", passwordHash: defaultPassword, role: Role.PROJECT_MANAGER },
  });
  const pm2 = await prisma.user.create({
    data: { name: "Marcus Lee", email: "marcus.pm@velozity.dev", passwordHash: defaultPassword, role: Role.PROJECT_MANAGER },
  });

  const dev1 = await prisma.user.create({
    data: { name: "Ravi Kumar", email: "ravi.dev@velozity.dev", passwordHash: defaultPassword, role: Role.DEVELOPER },
  });
  const dev2 = await prisma.user.create({
    data: { name: "Sara Chen", email: "sara.dev@velozity.dev", passwordHash: defaultPassword, role: Role.DEVELOPER },
  });
  const dev3 = await prisma.user.create({
    data: { name: "Diego Alvarez", email: "diego.dev@velozity.dev", passwordHash: defaultPassword, role: Role.DEVELOPER },
  });
  const dev4 = await prisma.user.create({
    data: { name: "Fatima Noor", email: "fatima.dev@velozity.dev", passwordHash: defaultPassword, role: Role.DEVELOPER },
  });

  const clientA = await prisma.client.create({ data: { name: "Nimbus Retail Co." } });
  const clientB = await prisma.client.create({ data: { name: "Harborline Logistics" } });
  const clientC = await prisma.client.create({ data: { name: "Coral Health Systems" } });

  const projectAlpha = await prisma.project.create({
    data: { name: "Nimbus Storefront Revamp", description: "Rebuild the customer-facing storefront.", clientId: clientA.id, managerId: pm1.id },
  });
  const projectBeta = await prisma.project.create({
    data: { name: "Harborline Fleet Tracker", description: "Real-time fleet tracking dashboard.", clientId: clientB.id, managerId: pm1.id },
  });
  const projectGamma = await prisma.project.create({
    data: { name: "Coral Patient Portal", description: "Self-service patient scheduling portal.", clientId: clientC.id, managerId: pm2.id },
  });

  const now = Date.now();
  const days = (n: number) => new Date(now + n * 24 * 60 * 60 * 1000);

  function taskRow(
    projectId: string,
    title: string,
    assigneeId: string,
    status: TaskStatus,
    priority: TaskPriority,
    dueDate: Date
  ) {
    return { projectId, title, assigneeId, status, priority, dueDate };
  }

  const taskDefs = [
    // Project Alpha (PM: Priya)
    taskRow(projectAlpha.id, "Set up product listing API", dev1.id, TaskStatus.DONE, TaskPriority.HIGH, days(-10)),
    taskRow(projectAlpha.id, "Build checkout flow UI", dev2.id, TaskStatus.IN_PROGRESS, TaskPriority.CRITICAL, days(4)),
    taskRow(projectAlpha.id, "Wire up payment gateway", dev1.id, TaskStatus.TODO, TaskPriority.HIGH, days(9)),
    taskRow(projectAlpha.id, "Fix cart rounding bug", dev2.id, TaskStatus.IN_REVIEW, TaskPriority.MEDIUM, days(2)),
    taskRow(projectAlpha.id, "Migrate legacy product images", dev1.id, TaskStatus.TODO, TaskPriority.LOW, days(-3)), // overdue seed
    // Project Beta (PM: Priya)
    taskRow(projectBeta.id, "GPS ingestion pipeline", dev3.id, TaskStatus.IN_PROGRESS, TaskPriority.CRITICAL, days(5)),
    taskRow(projectBeta.id, "Live map WebSocket layer", dev3.id, TaskStatus.TODO, TaskPriority.HIGH, days(12)),
    taskRow(projectBeta.id, "Geofence alert rules", dev4.id, TaskStatus.TODO, TaskPriority.MEDIUM, days(8)),
    taskRow(projectBeta.id, "Driver mobile ping endpoint", dev4.id, TaskStatus.DONE, TaskPriority.HIGH, days(-6)),
    taskRow(projectBeta.id, "Historical route replay", dev3.id, TaskStatus.TODO, TaskPriority.LOW, days(-1)), // overdue seed
    // Project Gamma (PM: Marcus)
    taskRow(projectGamma.id, "Appointment booking form", dev2.id, TaskStatus.IN_PROGRESS, TaskPriority.HIGH, days(6)),
    taskRow(projectGamma.id, "Insurance verification API", dev4.id, TaskStatus.TODO, TaskPriority.CRITICAL, days(3)),
    taskRow(projectGamma.id, "Patient reminder emails", dev2.id, TaskStatus.IN_REVIEW, TaskPriority.MEDIUM, days(1)),
    taskRow(projectGamma.id, "Accessibility audit", dev4.id, TaskStatus.TODO, TaskPriority.LOW, days(15)),
    taskRow(projectGamma.id, "HIPAA audit log export", dev2.id, TaskStatus.DONE, TaskPriority.HIGH, days(-8)),
  ];

  const tasks = [];
  for (const t of taskDefs) {
    tasks.push(await prisma.task.create({ data: t }));
  }

  // Flag the two intentionally-past-due, not-done tasks as overdue (mirrors what the
  // cron sweep would do — seeded directly so the state is correct from first load).
  const overdueTitles = ["Migrate legacy product images", "Historical route replay"];
  for (const title of overdueTitles) {
    const t = tasks.find((x) => x.title === title)!;
    await prisma.task.update({ where: { id: t.id }, data: { isOverdue: true } });
  }

  // Pre-existing activity log + a few assignment notifications so neither the feed
  // nor the notification bell is empty on first load.
  const actors = [dev1, dev2, dev3, dev4, pm1, pm2];
  let i = 0;
  for (const t of tasks.slice(0, 8)) {
    const actor = actors[i % actors.length];
    i++;
    await prisma.activityEvent.create({
      data: {
        projectId: t.projectId,
        taskId: t.id,
        actorId: t.assigneeId ?? actor.id,
        fromStatus: TaskStatus.TODO,
        toStatus: t.status,
        message: `${(await prisma.user.findUnique({ where: { id: t.assigneeId ?? actor.id } }))!.name} moved "${t.title}" from To Do \u2192 ${t.status.replace("_", " ")}`,
        createdAt: new Date(now - (8 - i) * 60 * 60 * 1000),
      },
    });
  }

  for (const t of tasks) {
    if (t.assigneeId) {
      await prisma.notification.create({
        data: {
          userId: t.assigneeId,
          taskId: t.id,
          type: "TASK_ASSIGNED",
          message: `You were assigned to "${t.title}"`,
          read: Math.random() > 0.6,
        },
      });
    }
  }

  console.log("Seed complete.");
  console.log("Login with any of these (password: Password123!):");
  console.log(`  Admin:            ${admin.email}`);
  console.log(`  PM:               ${pm1.email}, ${pm2.email}`);
  console.log(`  Developer:        ${dev1.email}, ${dev2.email}, ${dev3.email}, ${dev4.email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
