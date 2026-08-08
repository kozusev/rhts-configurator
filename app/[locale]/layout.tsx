import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/lib/i18n";
import { getSettings } from "@/lib/settings";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { locales } from "@/lib/i18n";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  if (!isLocale(params.locale)) notFound();
  const locale = params.locale as Locale;
  const settings = await getSettings();

  return (
    <div className="flex min-h-screen flex-col">
      <Header locale={locale} />
      <main className="flex-1">{children}</main>
      <Footer locale={locale} company={settings} />
    </div>
  );
}
