// One-time export of all data from the current (SQLite) database to JSON,
// so it can be imported into Postgres. Run BEFORE switching the datasource.
import { promises as fs } from "fs";
import path from "path";
import { prisma } from "@/lib/db";

async function main() {
  const data = {
    projects: await prisma.project.findMany(),
    packages: await prisma.package.findMany(),
    robots: await prisma.robot.findMany(),
    optionGroups: await prisma.optionGroup.findMany(),
    options: await prisma.option.findMany(),
    packageOptionGroups: await prisma.packageOptionGroup.findMany(),
    leads: await prisma.lead.findMany(),
    leadEvents: await prisma.leadEvent.findMany(),
    settings: await prisma.setting.findMany(),
    users: await prisma.user.findMany(),
  };
  const out = path.join(process.cwd(), "prisma", "seed-data.json");
  await fs.writeFile(out, JSON.stringify(data, null, 2));
  const counts = Object.fromEntries(Object.entries(data).map(([k, v]) => [k, (v as any[]).length]));
  console.log("exported:", JSON.stringify(counts));
  console.log("-> prisma/seed-data.json");
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
