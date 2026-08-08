// One-time import of prisma/seed-data.json into the (Postgres) database.
// Run AFTER `prisma db push` against the target database:
//   DATABASE_URL="postgres://..." npx prisma db push
//   DATABASE_URL="postgres://..." npx tsx prisma/import-data.ts
import { promises as fs } from "fs";
import path from "path";
import { prisma } from "@/lib/db";

// Revive ISO date strings back into Date objects for Prisma.
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
function reviveDates(rows: any[]): any[] {
  return (rows || []).map((row) => {
    const o: any = { ...row };
    for (const k of Object.keys(o)) {
      if (typeof o[k] === "string" && ISO.test(o[k])) o[k] = new Date(o[k]);
    }
    return o;
  });
}

async function main() {
  const raw = await fs.readFile(path.join(process.cwd(), "prisma", "seed-data.json"), "utf8");
  const d = JSON.parse(raw);

  // Insert in dependency order. skipDuplicates makes re-runs safe.
  await prisma.setting.createMany({ data: reviveDates(d.settings), skipDuplicates: true });
  await prisma.user.createMany({ data: reviveDates(d.users), skipDuplicates: true });
  await prisma.project.createMany({ data: reviveDates(d.projects), skipDuplicates: true });
  await prisma.robot.createMany({ data: reviveDates(d.robots), skipDuplicates: true });
  await prisma.package.createMany({ data: reviveDates(d.packages), skipDuplicates: true });
  await prisma.optionGroup.createMany({ data: reviveDates(d.optionGroups), skipDuplicates: true });
  await prisma.option.createMany({ data: reviveDates(d.options), skipDuplicates: true });
  await prisma.packageOptionGroup.createMany({ data: reviveDates(d.packageOptionGroups), skipDuplicates: true });
  await prisma.lead.createMany({ data: reviveDates(d.leads), skipDuplicates: true });
  await prisma.leadEvent.createMany({ data: reviveDates(d.leadEvents), skipDuplicates: true });

  const counts = {
    settings: await prisma.setting.count(),
    users: await prisma.user.count(),
    projects: await prisma.project.count(),
    robots: await prisma.robot.count(),
    packages: await prisma.package.count(),
    optionGroups: await prisma.optionGroup.count(),
    options: await prisma.option.count(),
    leads: await prisma.lead.count(),
    leadEvents: await prisma.leadEvent.count(),
  };
  console.log("import complete. row counts:", JSON.stringify(counts));
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
