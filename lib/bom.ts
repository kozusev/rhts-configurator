import { prisma } from "./db";

export type BomProductType = "package" | "robot" | "option";
export const BOM_PRODUCT_TYPES: readonly BomProductType[] = ["package", "robot", "option"];

export type BomLineVM = { name: string; qty: number; unitCost: number };

/** Load a product's bill-of-materials lines (ordered). Internal / admin-only data. */
export async function getBomLines(productType: BomProductType, productId: string): Promise<BomLineVM[]> {
  const lines = await prisma.bomLine.findMany({
    where: { productType, productId },
    orderBy: { order: "asc" },
  });
  return lines.map((l) => ({ name: l.name, qty: l.qty, unitCost: l.unitCost }));
}

/** Sum of qty × unitCost across all lines. */
export function bomTotal(lines: { qty: number; unitCost: number }[]): number {
  return lines.reduce((s, l) => s + (l.qty || 0) * (l.unitCost || 0), 0);
}

/** Total BOM cost for a single product (0 if it has no lines / no id). */
export async function getBomTotal(productType: BomProductType, productId: string): Promise<number> {
  if (!productId) return 0;
  const lines = await prisma.bomLine.findMany({
    where: { productType, productId },
    select: { qty: true, unitCost: true },
  });
  return bomTotal(lines);
}

/** Map of productId → total BOM cost for many products of one type, in a single query. */
export async function getBomTotalsMap(productType: BomProductType, productIds: string[]): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  const ids = productIds.filter(Boolean);
  if (ids.length === 0) return map;
  const lines = await prisma.bomLine.findMany({
    where: { productType, productId: { in: ids } },
    select: { productId: true, qty: true, unitCost: true },
  });
  for (const l of lines) {
    map.set(l.productId, (map.get(l.productId) || 0) + (l.qty || 0) * (l.unitCost || 0));
  }
  return map;
}

export type LeadForCost = { id: string; packageId: string; robotId: string; snapshot: string };

/**
 * Compute each lead's internal cost from the BOM of its pack, robot and options
 * (option cost × quantity from the snapshot), in just three queries total.
 */
export async function getLeadCosts(leads: LeadForCost[]): Promise<Map<string, number>> {
  const leadOptions = new Map<string, { id: string; qty: number }[]>();
  // Product/service leads carry explicit per-line unit costs in their snapshot (no BOM).
  const leadLineCost = new Map<string, number>();
  const pkgIds: string[] = [];
  const robotIds: string[] = [];
  const optIds: string[] = [];

  for (const l of leads) {
    if (l.packageId) pkgIds.push(l.packageId);
    if (l.robotId) robotIds.push(l.robotId);
    let opts: { id: string; qty: number }[] = [];
    let lineCost = 0;
    try {
      const snap = JSON.parse(l.snapshot);
      const snapOpts = snap?.options || [];
      opts = snapOpts.filter((o: any) => o?.id).map((o: any) => ({ id: String(o.id), qty: o.qty || 1 }));
      lineCost = snapOpts.reduce((s: number, o: any) => s + (Number(o?.unitCost) || 0) * (o?.qty || 1), 0);
    } catch {}
    leadOptions.set(l.id, opts);
    leadLineCost.set(l.id, lineCost);
    for (const o of opts) optIds.push(o.id);
  }

  const [pkgMap, robotMap, optMap] = await Promise.all([
    getBomTotalsMap("package", pkgIds),
    getBomTotalsMap("robot", robotIds),
    getBomTotalsMap("option", optIds),
  ]);

  const result = new Map<string, number>();
  for (const l of leads) {
    let cost = (pkgMap.get(l.packageId) || 0) + (robotMap.get(l.robotId) || 0) + (leadLineCost.get(l.id) || 0);
    for (const o of leadOptions.get(l.id) || []) cost += (optMap.get(o.id) || 0) * o.qty;
    result.set(l.id, cost);
  }
  return result;
}
