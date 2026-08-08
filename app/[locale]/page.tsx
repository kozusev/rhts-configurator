import { prisma } from "@/lib/db";
import { t, ui, type Locale } from "@/lib/i18n";
import HeroCarousel, { type Slide } from "@/components/HeroCarousel";
import PackageCard from "@/components/PackageCard";
import CamBlock from "@/components/CamBlock";

export const dynamic = "force-dynamic";

export default async function HomePage({ params }: { params: { locale: Locale } }) {
  const locale = params.locale;

  const [projects, packages] = await Promise.all([
    prisma.project.findMany({ where: { published: true }, orderBy: { order: "asc" } }),
    prisma.package.findMany({ where: { published: true }, orderBy: { order: "asc" } }),
  ]);

  const slides: Slide[] = projects.map((p) => ({
    title: t(p.title, locale),
    subtitle: t(p.subtitle, locale),
    image: p.image,
    link: p.link,
  }));

  return (
    <>
      <section className="container-page pt-10">
        <div className="mb-8 max-w-3xl">
          <h1 className="text-3xl font-bold leading-tight sm:text-5xl">{ui("hero_title", locale)}</h1>
          <p className="mt-4 text-lg text-slate-300">{ui("hero_sub", locale)}</p>
        </div>
        <HeroCarousel slides={slides} />
      </section>

      <section id="packs" className="container-page mt-20 scroll-mt-20">
        <div className="mb-8">
          <h2 className="text-2xl font-bold sm:text-3xl">{ui("packs_title", locale)}</h2>
          <p className="mt-2 text-slate-400">{ui("packs_sub", locale)}</p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {packages.map((pkg) => (
            <PackageCard key={pkg.id} pkg={pkg} locale={locale} />
          ))}
        </div>
      </section>

      <CamBlock locale={locale} />
    </>
  );
}
