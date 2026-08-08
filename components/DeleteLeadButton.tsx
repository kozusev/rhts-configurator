"use client";

import { deleteLead } from "@/app/admin/lead-actions";

export default function DeleteLeadButton({ leadId, offerNumber }: { leadId: string; offerNumber: string }) {
  return (
    <form
      action={deleteLead}
      onSubmit={(e) => {
        if (!confirm(`Permanently delete offer ${offerNumber}?\n\nThis removes the lead and its entire activity log. This cannot be undone.`)) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={leadId} />
      <button className="btn border border-red-500/40 bg-red-500/10 text-red-300 hover:bg-red-500/20 !px-3 !py-1.5 text-sm">
        Delete lead
      </button>
    </form>
  );
}
