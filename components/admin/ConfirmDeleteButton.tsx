"use client";

import type { ReactNode } from "react";

/**
 * Delete button that asks for confirmation before submitting. Wraps a server delete
 * action in a form and blocks submission unless the user confirms the popup.
 */
export default function ConfirmDeleteButton({
  action,
  fields,
  message,
  className = "btn-ghost !px-3 !py-1.5 text-xs text-red-400",
  children = "Delete",
}: {
  action: (formData: FormData) => void | Promise<void>;
  fields: Record<string, string>;
  message: string;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(message)) e.preventDefault();
      }}
    >
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <button className={className}>{children}</button>
    </form>
  );
}
