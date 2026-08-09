import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import ProductLeadBuilder from "@/components/ProductLeadBuilder";

export const dynamic = "force-dynamic";

export default async function EditProductLeadItems({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { error?: string };
}) {
  const me = await getSessionUser();
  if (!me) redirect("/admin/login");

  const lead = await prisma.lead.findUnique({ where: { id: params.id } });
  if (!lead) redirect("/admin");
  if (me.role === "AGENT" && lead.createdBy !== me.email) redirect("/admin");

  let snap: any = {};
  try { snap = JSON.parse(lead.snapshot); } catch {}
  // This editor is only for free-form product/service leads (no milling pack).
  if (snap?.package) redirect(`/admin/leads/${lead.id}/edit`);

  const initialLines = (snap?.options || []).map((o: any) => ({
    name: o.label || "",
    description: o.sub || "",
    qty: o.qty || 1,
    unitPrice: o.unitPrice ?? (o.qty ? o.price / o.qty : o.price) ?? 0,
    unitCost: o.unitCost || 0,
  }));

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <Link href={`/admin/leads/${lead.id}`} className="text-sm text-slate-400 hover:text-white">← Back to lead</Link>
        <h1 className="mt-1 text-2xl font-bold">Edit items — {lead.offerNumber}</h1>
        <p className="text-sm text-slate-400">Add, edit or remove line items. Use “Edit customer” on the lead page to change customer details.</p>
      </div>

      {searchParams.error === "nolines" && (
        <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-300">
          Keep at least one item with a name or price.
        </div>
      )}

      <ProductLeadBuilder mode="edit" leadId={lead.id} defaultCurrency={lead.currency || "EUR"} initialLines={initialLines} />
    </div>
  );
}
