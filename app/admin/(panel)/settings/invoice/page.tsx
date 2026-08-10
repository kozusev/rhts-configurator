import { redirect } from "next/navigation";
import { getSettings } from "@/lib/settings";
import { getSessionUser } from "@/lib/auth";
import { saveInvoiceSettings } from "../../../actions";

export const dynamic = "force-dynamic";

// Renders the company + bank fields for one seller profile, keyed by prefix
// ("inv_" for the with-VAT profile, "inv_novat_" for the without-VAT profile).
function SellerBlock({ s, prefix }: { s: Record<string, string>; prefix: string }) {
  const v = (k: string) => s[`${prefix}${k}`] || "";
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div><label className="label">Company name</label><input name={`${prefix}seller_company`} defaultValue={v("seller_company")} className="field" /></div>
      <div><label className="label">Tax ID</label><input name={`${prefix}seller_tax_id`} defaultValue={v("seller_tax_id")} className="field" /></div>
      <div className="sm:col-span-2"><label className="label">Address</label><input name={`${prefix}seller_address`} defaultValue={v("seller_address")} className="field" /></div>
      <div><label className="label">Phone</label><input name={`${prefix}seller_phone`} defaultValue={v("seller_phone")} className="field" /></div>
      <div><label className="label">Email</label><input name={`${prefix}seller_email`} defaultValue={v("seller_email")} className="field" /></div>

      <div className="sm:col-span-2 mt-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Bank details</div>
      <div><label className="label">Beneficiary</label><input name={`${prefix}bank_beneficiary`} defaultValue={v("bank_beneficiary")} className="field" /></div>
      <div><label className="label">IBAN</label><input name={`${prefix}bank_iban`} defaultValue={v("bank_iban")} className="field" /></div>
      <div><label className="label">SWIFT / BIC</label><input name={`${prefix}bank_swift`} defaultValue={v("bank_swift")} className="field" /></div>
      <div><label className="label">Intermediary BIC</label><input name={`${prefix}bank_intermediary_bic`} defaultValue={v("bank_intermediary_bic")} className="field" /></div>
      <div className="sm:col-span-2"><label className="label">Beneficiary address</label><input name={`${prefix}bank_beneficiary_address`} defaultValue={v("bank_beneficiary_address")} className="field" /></div>
      <div><label className="label">Bank / Payment institution</label><input name={`${prefix}bank_name`} defaultValue={v("bank_name")} className="field" /></div>
      <div><label className="label">Bank / Payment institution address</label><input name={`${prefix}bank_address`} defaultValue={v("bank_address")} className="field" /></div>
    </div>
  );
}

export default async function InvoiceSettingsPage() {
  const me = await getSessionUser();
  if (!me) redirect("/admin/login");
  if (me.role !== "ADMIN") redirect("/admin");

  const s = await getSettings();

  return (
    <form action={saveInvoiceSettings} className="space-y-6">
      <div className="card space-y-5 p-6">
        <div>
          <h2 className="text-lg font-bold">Seller — with VAT</h2>
          <p className="text-xs text-slate-500">Used when the client works with VAT. The VAT rate below is applied.</p>
        </div>
        <SellerBlock s={s} prefix="inv_" />
      </div>

      <div className="card space-y-5 p-6">
        <div>
          <h2 className="text-lg font-bold">Seller — without VAT</h2>
          <p className="text-xs text-slate-500">Used when the client works without VAT. No VAT is added to the invoice.</p>
        </div>
        <SellerBlock s={s} prefix="inv_novat_" />
      </div>

      <div className="card space-y-5 p-6">
        <h2 className="text-lg font-bold">Invoice defaults</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className="label">VAT rate (%)</label><input name="inv_vat_rate" type="number" step="0.01" defaultValue={s.inv_vat_rate || "21"} className="field sm:max-w-[10rem]" /></div>
          <div><label className="label">Default HS code</label><input name="inv_hs_code" defaultValue={s.inv_hs_code || "84.79.50.00"} className="field" /></div>
        </div>
        <div>
          <label className="label">General Terms and Conditions</label>
          <textarea name="inv_terms" rows={5} defaultValue={s.inv_terms || ""} className="field text-sm" placeholder="Shown at the bottom of every invoice." />
        </div>
      </div>

      <button className="btn-primary">Save invoice settings</button>
    </form>
  );
}
