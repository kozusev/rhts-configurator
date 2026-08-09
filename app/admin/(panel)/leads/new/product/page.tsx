import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getSetting } from "@/lib/settings";
import ProductLeadBuilder from "@/components/ProductLeadBuilder";

export const dynamic = "force-dynamic";

export default async function NewProductLeadPage({ searchParams }: { searchParams: { error?: string } }) {
  const me = await getSessionUser();
  if (!me) redirect("/admin/login");

  const currency = await getSetting("default_currency", "EUR");

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <Link href="/admin" className="text-sm text-slate-400 hover:text-white">← Dashboard</Link>
        <h1 className="mt-1 text-2xl font-bold">New product / service lead</h1>
        <p className="text-sm text-slate-400">
          Add any products, services or software as line items, then create the offer. It&apos;s recorded under your name.
        </p>
      </div>

      {searchParams.error === "nolines" && (
        <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-300">
          Add at least one item with a name or price.
        </div>
      )}

      <ProductLeadBuilder defaultCurrency={currency || "EUR"} />
    </div>
  );
}
