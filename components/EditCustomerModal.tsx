"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { updateLeadCustomer } from "@/app/admin/lead-actions";

export type CustomerData = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company: string;
  regNumber: string;
  deliveryAddress: string;
  note: string;
};

export default function EditCustomerModal({ leadId, customer }: { leadId: string; customer: CustomerData }) {
  const [open, setOpen] = useState(false);
  const searchParams = useSearchParams();

  // The save action redirects to ?ok=customer on success (a soft navigation that would
  // otherwise leave this modal mounted and open). Close it once that lands.
  useEffect(() => {
    if (searchParams.get("ok") === "customer") setOpen(false);
  }, [searchParams]);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="btn-ghost !px-3 !py-1.5 text-sm">
        ✎ Edit
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div className="card my-8 w-full max-w-lg p-5" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold">Edit customer</h3>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="text-xl text-slate-400 hover:text-white">
                ✕
              </button>
            </div>
            {/* On submit the server action redirects with ?ok=customer; the effect above then closes this modal. */}
            <form action={updateLeadCustomer} className="grid gap-3 sm:grid-cols-2">
              <input type="hidden" name="id" value={leadId} />
              <div><label className="label">First name *</label><input name="firstName" defaultValue={customer.firstName} className="field" /></div>
              <div><label className="label">Last name *</label><input name="lastName" defaultValue={customer.lastName} className="field" /></div>
              <div><label className="label">Email *</label><input name="email" type="email" defaultValue={customer.email} className="field" /></div>
              <div><label className="label">Phone</label><input name="phone" defaultValue={customer.phone} className="field" /></div>
              <div><label className="label">Company</label><input name="company" defaultValue={customer.company} className="field" /></div>
              <div><label className="label">Reg. / VAT number</label><input name="regNumber" defaultValue={customer.regNumber} className="field" /></div>
              <div className="sm:col-span-2"><label className="label">Delivery address</label><input name="deliveryAddress" defaultValue={customer.deliveryAddress} className="field" /></div>
              <div className="sm:col-span-2"><label className="label">Note</label><textarea name="note" rows={2} defaultValue={customer.note} className="field text-sm" /></div>
              <div className="sm:col-span-2 mt-1 flex gap-2">
                <button className="btn-primary">Save changes</button>
                <button type="button" onClick={() => setOpen(false)} className="btn-ghost">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
