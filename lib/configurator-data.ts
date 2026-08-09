import { prisma } from "./db";
import { t, ui, type Locale } from "./i18n";
import type { GroupVM, RobotVM, PackageVM, AdminPackageVM } from "@/components/Configurator";

const LABEL_KEYS = [
  "step_robot", "step_options", "step_contact", "robot_year", "robot_reach", "robot_payload",
  "robot_controller", "cond_new", "cond_used", "select", "selected", "add", "added", "summary", "base_pack", "robot",
  "options", "total", "first_name", "last_name", "email", "phone", "company", "get_offer",
  "sending", "thanks_title", "thanks_body", "download_pdf", "required", "no_robot",
  "optional_note", "reg_number", "delivery_address",
];

/** Build the pack/robots/options/labels view-models the Configurator needs, by package id. */
export async function getConfiguratorData(packageId: string, locale: Locale) {
  const pkg = await prisma.package.findUnique({ where: { id: packageId }, include: { optionGroups: true } });
  if (!pkg) return null;

  const linkedGroupIds = pkg.optionGroups.map((g) => g.groupId);
  const [robots, groups] = await Promise.all([
    prisma.robot.findMany({ where: { published: true }, orderBy: { order: "asc" } }),
    prisma.optionGroup.findMany({
      where: { published: true, ...(linkedGroupIds.length > 0 ? { id: { in: linkedGroupIds } } : {}) },
      orderBy: { order: "asc" },
      include: { options: { where: { published: true }, orderBy: { order: "asc" } } },
    }),
  ]);

  const robotVMs: RobotVM[] = robots.map((r) => ({
    id: r.id, brand: r.brand, model: r.model, condition: r.condition, year: r.year, armReach: r.armReach,
    payload: r.payload, controller: r.controller, price: r.price, currency: r.currency, image: r.image,
  }));

  const groupVMs: GroupVM[] = groups
    .filter((g) => g.options.length > 0)
    .map((g) => ({
      id: g.id,
      name: t(g.name, locale),
      description: t(g.description, locale),
      options: g.options.map((o) => ({
        id: o.id, name: t(o.name, locale), description: t(o.description, locale),
        price: o.price, currency: o.currency, image: o.image,
      })),
    }));

  const labels: Record<string, string> = {};
  for (const k of LABEL_KEYS) labels[k] = ui(k, locale);

  const pkgVM: PackageVM = {
    id: pkg.id, slug: pkg.slug, name: t(pkg.name, locale), basePrice: pkg.basePrice, currency: pkg.currency,
  };

  return { pkg, pkgVM, robotVMs, groupVMs, labels };
}

/**
 * Admin modify mode: load ALL published packages (with their linked group ids),
 * ALL published option groups, robots and labels — so the pack can be switched.
 */
export async function getAdminConfiguratorData(locale: Locale) {
  const [packages, robots, groups] = await Promise.all([
    prisma.package.findMany({ where: { published: true }, orderBy: { order: "asc" }, include: { optionGroups: true } }),
    prisma.robot.findMany({ where: { published: true }, orderBy: { order: "asc" } }),
    prisma.optionGroup.findMany({
      where: { published: true },
      orderBy: { order: "asc" },
      include: { options: { where: { published: true }, orderBy: { order: "asc" } } },
    }),
  ]);

  const packageVMs: AdminPackageVM[] = packages.map((p) => ({
    id: p.id, slug: p.slug, name: t(p.name, locale), basePrice: p.basePrice, currency: p.currency,
    linkedGroupIds: p.optionGroups.map((g) => g.groupId),
  }));

  const robotVMs: RobotVM[] = robots.map((r) => ({
    id: r.id, brand: r.brand, model: r.model, condition: r.condition, year: r.year, armReach: r.armReach,
    payload: r.payload, controller: r.controller, price: r.price, currency: r.currency, image: r.image,
  }));

  const groupVMs: GroupVM[] = groups
    .filter((g) => g.options.length > 0)
    .map((g) => ({
      id: g.id,
      name: t(g.name, locale),
      description: t(g.description, locale),
      options: g.options.map((o) => ({
        id: o.id, name: t(o.name, locale), description: t(o.description, locale),
        price: o.price, currency: o.currency, image: o.image,
      })),
    }));

  const labels: Record<string, string> = {};
  for (const k of LABEL_KEYS) labels[k] = ui(k, locale);

  return { packageVMs, robotVMs, groupVMs, labels };
}
