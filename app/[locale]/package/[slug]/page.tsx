import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { t, ui, configuratorLabels, type Locale } from "@/lib/i18n";
import { money } from "@/lib/format";
import Configurator, { type GroupVM, type RobotVM } from "@/components/Configurator";

export const dynamic = "force-dynamic";

export default async function PackagePage({ params }: { params: { locale: Locale; slug: string } }) {
  const { locale, slug } = params;

  const pkg = await prisma.package.findUnique({
    where: { slug },
    include: { optionGroups: true },
  });
  if (!pkg || !pkg.published) notFound();

  const linkedGroupIds = pkg.optionGroups.map((g) => g.groupId);

  const [robots, groups] = await Promise.all([
    prisma.robot.findMany({ where: { published: true }, orderBy: { order: "asc" } }),
    prisma.optionGroup.findMany({
      where: {
        published: true,
        ...(linkedGroupIds.length > 0 ? { id: { in: linkedGroupIds } } : {}),
      },
      orderBy: { order: "asc" },
      include: { options: { where: { published: true }, orderBy: { order: "asc" } } },
    }),
  ]);

  const robotVMs: RobotVM[] = robots.map((r) => ({
    id: r.id, brand: r.brand, model: r.model, condition: r.condition, year: r.year, armReach: r.armReach,
    payload: r.payload, controller: r.controller, price: r.price, currency: r.currency, image: r.image,
  }));

  const groupVMs: GroupVM[] = groups
    .filter((g) => g.options.length > 0)
    .map((g) => ({
      id: g.id,
      name: t(g.name, locale),
      description: t(g.description, locale),
      options: g.options.map((o) => ({
        id: o.id, name: t(o.name, locale), description: t(o.description, locale),
        price: o.price, currency: o.currency, image: o.image,
      })),
    }));

  const labels = configuratorLabels(locale);

  return (
    <>
      {/* Package hero / description */}
      <section className="container-page pt-8">
        <Link href={`/${locale}#packs`} className="text-sm text-slate-400 hover:text-white">← {ui("back_home", locale)}</Link>
        <div className="mt-4 grid gap-8 md:grid-cols-2">
          <div className="relative min-h-[320px] overflow-hidden rounded-2xl border border-white/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={pkg.image} alt={t(pkg.name, locale)} className="absolute inset-0 h-full w-full object-cover" />
          </div>
          <div>
            <div className="flex flex-wrap gap-2">
              <span className="chip">{ui("power", locale)}: {pkg.power}</span>
              <span className="chip">{ui("spindle", locale)}: {pkg.spindle}</span>
              <span className="chip">{ui("tool_holder", locale)}: {pkg.toolHolder}</span>
            </div>
            <h1 className="mt-4 text-3xl font-bold sm:text-4xl">{t(pkg.name, locale)}</h1>
            <p className="mt-2 text-lg text-slate-300">{t(pkg.tagline, locale)}</p>
            <p className="mt-4 whitespace-pre-line text-slate-300">{t(pkg.description, locale)}</p>
            <div className="mt-6 text-sm text-slate-400">{ui("from", locale)}</div>
            <div className="text-3xl font-bold text-brand-300">{money(pkg.basePrice, pkg.currency, locale)}</div>
          </div>
        </div>
      </section>

      <section className="container-page mt-14">
        <Configurator
          locale={locale}
          pkg={{ id: pkg.id, slug: pkg.slug, name: t(pkg.name, locale), basePrice: pkg.basePrice, currency: pkg.currency }}
          robots={robotVMs}
          groups={groupVMs}
          labels={labels}
        />
      </section>
    </>
  );
}
