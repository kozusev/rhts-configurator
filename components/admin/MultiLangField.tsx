import { locales } from "@/lib/i18n";

function parse(value?: string): Record<string, string> {
  if (!value) return {};
  try {
    const o = JSON.parse(value);
    return typeof o === "object" && o ? o : {};
  } catch {
    return {};
  }
}

export default function MultiLangField({
  base,
  label,
  value,
  textarea = false,
}: {
  base: string;
  label: string;
  value?: string;
  textarea?: boolean;
}) {
  const parts = parse(value);
  return (
    <div>
      <label className="label">{label}</label>
      <div className="grid gap-2 sm:grid-cols-3">
        {locales.map((loc) => (
          <div key={loc}>
            <span className="mb-1 block text-[10px] font-semibold uppercase text-slate-500">{loc}</span>
            {textarea ? (
              <textarea name={`${base}_${loc}`} defaultValue={parts[loc] || ""} className="field min-h-[90px]" />
            ) : (
              <input name={`${base}_${loc}`} defaultValue={parts[loc] || ""} className="field" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
