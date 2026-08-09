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
