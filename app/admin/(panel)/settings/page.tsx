import { getSettings } from "@/lib/settings";
import { saveSettings } from "../../actions";
import MultiLangField from "@/components/admin/MultiLangField";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const s = await getSettings();
  return (
    <div className="max-w-3xl">
      <h1 className="mb-6 text-2xl font-bold">Settings</h1>
      <form action={saveSettings} className="card space-y-5 p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className="label">Company name</label><input name="company_name" defaultValue={s.company_name || ""} className="field" /></div>
          <div><label className="label">Admin email (receives lead copies)</label><input name="admin_email" defaultValue={s.admin_email || ""} className="field" /></div>
          <div><label className="label">Company email (sender / contact)</label><input name="company_email" defaultValue={s.company_email || ""} className="field" /></div>
          <div><label className="label">Company phone</label><input name="company_phone" defaultValue={s.company_phone || ""} className="field" /></div>
          <div><label className="label">Website</label><input name="company_website" defaultValue={s.company_website || ""} className="field" /></div>
          <div><label className="label">Offer number prefix</label><input name="offer_prefix" defaultValue={s.offer_prefix || "RHTS"} className="field" /></div>
          <div><label className="label">Offer validity (days)</label><input name="offer_validity_days" type="number" defaultValue={s.offer_validity_days || "30"} className="field" /></div>
        </div>
        <MultiLangField base="vat_note" label="Price note (shown on PDF/offer)" value={s.vat_note} textarea />
        <button className="btn-primary">Save settings</button>
      </form>
      <p className="mt-4 text-xs text-slate-500">
        Email sending is in <b>preview mode</b> until SMTP is configured in <code>.env</code>. Previews are saved to <code>.mail-preview/</code>.
      </p>
    </div>
  );
}
