import type { Locale } from "@/lib/i18n";

const copy: Record<Locale, { eyebrow: string; title: string; sub: string; features: string[]; apps: string; cta: string }> = {
  en: {
    eyebrow: "CAM software",
    title: "Programmed with ENCY Robot",
    sub: "A complete offline robot programming solution — the ultimate toolpath calculation, kinematics management and simulation software for robots.",
    features: [
      "Kinematics-aware toolpath generation",
      "Singularity, collision & reach-zone management",
      "Full robotic cell simulation & NC verification",
      "External axes support & digital twins",
    ],
    apps: "Milling · Additive · Cutting · Welding · Stone · Polishing",
    cta: "Learn about ENCY Robot",
  },
  es: {
    eyebrow: "Software CAM",
    title: "Programado con ENCY Robot",
    sub: "Una solución completa de programación offline: el software definitivo de cálculo de trayectorias, gestión de cinemática y simulación para robots.",
    features: [
      "Generación de trayectorias con cinemática",
      "Gestión de singularidades, colisiones y zonas de alcance",
      "Simulación completa de la célula y verificación NC",
      "Soporte de ejes externos y gemelos digitales",
    ],
    apps: "Fresado · Aditiva · Corte · Soldadura · Piedra · Pulido",
    cta: "Descubre ENCY Robot",
  },
  uk: {
    eyebrow: "CAM програма",
    title: "Програмування з ENCY Robot",
    sub: "Повне рішення для офлайн-програмування роботів — найкраще ПЗ для розрахунку траєкторій, керування кінематикою та симуляції.",
    features: [
      "Генерація траєкторій з урахуванням кінематики",
      "Керування сингулярностями, колізіями та зонами досяжності",
      "Повна симуляція комірки та перевірка NC-коду",
      "Підтримка зовнішніх осей і цифрових двійників",
    ],
    apps: "Фрезерування · Адитивне · Різання · Зварювання · Камінь · Полірування",
    cta: "Дізнатися про ENCY Robot",
  },
};

export default function CamBlock({ locale }: { locale: Locale }) {
  const c = copy[locale] || copy.en;
  return (
    <section className="container-page mt-20">
      <div className="card overflow-hidden">
        <div className="grid items-stretch gap-8 p-8 md:grid-cols-2 md:p-12">
          <div>
            <span className="chip mb-4 text-brand-300">{c.eyebrow}</span>
            <h2 className="text-2xl font-bold sm:text-3xl">{c.title}</h2>
            <p className="mt-3 text-slate-300">{c.sub}</p>
            <ul className="mt-6 space-y-2">
              {c.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-slate-200">
                  <span className="mt-1 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-brand-500/20 text-brand-300">✓</span>
                  {f}
                </li>
              ))}
            </ul>
            <p className="mt-6 text-xs uppercase tracking-wide text-slate-400">{c.apps}</p>
            <a href="https://encycam.com/ency-robot/" target="_blank" rel="noopener noreferrer" className="btn-ghost mt-6">
              {c.cta} →
            </a>
          </div>
          <div className="relative min-h-[260px]">
            <div className="absolute inset-0 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-brand-900 to-ink-900">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/ENCY.png"
                alt="ENCY Robot CAM"
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
