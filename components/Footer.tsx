import { ui, type Locale } from "@/lib/i18n";

export default function Footer({ locale, company }: { locale: Locale; company: Record<string, string> }) {
  return (
    <footer id="contact" className="mt-20 border-t border-white/10 bg-ink-900">
      <div className="container-page grid gap-8 py-12 sm:grid-cols-3">
        <div>
          <div className="mb-2 text-sm font-bold">{ui("brand", locale)}</div>
          <p className="text-sm text-slate-400">{company.company_name}</p>
          {company.company_website && (
            <a href={company.company_website} className="text-sm text-brand-300 hover:text-brand-200">
              {company.company_website.replace(/^https?:\/\//, "")}
            </a>
          )}
        </div>
        <div className="text-sm text-slate-400">
          <div className="mb-2 font-semibold text-slate-200">{ui("nav_contact", locale)}</div>
          {company.company_email && <div>{company.company_email}</div>}
          {company.company_phone && <div>{company.company_phone}</div>}
        </div>
        <div className="text-sm text-slate-500">
          © {new Date().getFullYear()} {company.company_name}. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
