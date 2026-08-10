import { redirect } from "next/navigation";
import { getSettings } from "@/lib/settings";
import { getSessionUser } from "@/lib/auth";
import { saveInvoiceSettings } from "../../../actions";

export const dynamic = "force-dynamic";

export default async function InvoiceSettingsPage() {
  const me = await getSessionUser();
  if (!me) redirect("/admin/login");
  if (me.role !== "ADMIN") redirect("/admin");

  const s = await getSettings();

  return (
    <form action={saveInvoiceSettings} className="space-y-6">
      <div className="card space-y-5 p-6">
        <h2 className="text-lg font-bold">Seller</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className="label">Company name</label><input name="inv_seller_company" defaultValue={s.inv_seller_company || ""} className="field" /></div>
          <div><label className="label">Tax ID</label><input name="inv_seller_tax_id" defaultValue={s.inv_seller_tax_id || ""} className="field" /></div>
          <div className="sm:col-span-2"><label className="label">Address</label><input name="inv_seller_address" defaultValue={s.inv_seller_address || ""} className="field" /></div>
          <div><label className="label">Phone</label><input name="inv_seller_phone" defaultValue={s.inv_seller_phone || ""} className="field" /></div>
          <div><label className="label">Email</label><input name="inv_seller_email" defaultValue={s.inv_seller_email || ""} className="field" /></div>
          <div>
            <label className="label">VAT rate (%)</label>
            <input name="inv_vat_rate" type="number" step="0.01" defaultValue={s.inv_vat_rate || "21"} className="field sm:max-w-[10rem]" />
          </div>
        </div>
      </div>

      <div className="card space-y-5 p-6">
        <h2 className="text-lg font-bold">Bank details</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className="label">Beneficiary</label><input name="inv_bank_beneficiary" defaultValue={s.inv_bank_beneficiary || ""} className="field" /></div>
          <div><label className="label">IBAN</label><input name="inv_bank_iban" defaultValue={s.inv_bank_iban || ""} className="field" /></div>
          <div><label className="label">SWIFT / BIC</label><input name="inv_bank_swift" defaultValue={s.inv_bank_swift || ""} className="field" /></div>
          <div><label className="label">Intermediary BIC</label><input name="inv_bank_intermediary_bic" defaultValue={s.inv_bank_intermediary_bic || ""} className="field" /></div>
          <div className="sm:col-span-2"><label className="label">Beneficiary address</label><input name="inv_bank_beneficiary_address" defaultValue={s.inv_bank_beneficiary_address || ""} className="field" /></div>
          <div><label className="label">Bank / Payment institution</label><input name="inv_bank_name" defaultValue={s.inv_bank_name || ""} className="field" /></div>
          <div><label className="label">Bank / Payment institution address</label><input name="inv_bank_address" defaultValue={s.inv_bank_address || ""} className="field" /></div>
        </div>
      </div>

      <div className="card space-y-5 p-6">
        <h2 className="text-lg font-bold">Invoice defaults</h2>
        <div className="grid gap-4 sm:grid-cols-2">
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
