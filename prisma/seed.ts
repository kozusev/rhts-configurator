import { PrismaClient } from "@prisma/client";
import { ml } from "../lib/i18n";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database…");

  // ---- Settings ----
  const settings: Record<string, string> = {
    company_name: "Eurobots RHTS",
    admin_email: "kozusev@gmail.com",
    company_email: "info@eurobots.net",
    company_phone: "+34 000 000 000",
    company_website: "https://www.eurobots.net",
    offer_prefix: "RHTS",
    offer_validity_days: "30",
    vat_note: ml({
      en: "Prices are indicative and exclude VAT, shipping and installation.",
      es: "Los precios son orientativos y no incluyen IVA, envío ni instalación.",
      uk: "Ціни орієнтовні, без ПДВ, доставки та монтажу.",
    }),
  };
  for (const [key, value] of Object.entries(settings)) {
    await prisma.setting.upsert({ where: { key }, update: { value }, create: { key, value } });
  }

  // ---- Projects (hero carousel) ----
  await prisma.project.deleteMany();
  await prisma.project.createMany({
    data: [
      {
        title: ml({ en: "Robotic milling of foam moulds", es: "Fresado robotizado de moldes de espuma", uk: "Роботизоване фрезерування пінопластових форм" }),
        subtitle: ml({ en: "5-axis machining for large-format patterns", es: "Mecanizado 5 ejes para modelos de gran formato", uk: "5-осьова обробка великоформатних моделей" }),
        image: "https://images.unsplash.com/photo-1565043666747-69f6646db940?q=80&w=1600&auto=format&fit=crop",
        order: 1,
      },
      {
        title: ml({ en: "Stone & marble sculpting cell", es: "Célula de escultura en piedra y mármol", uk: "Комірка для обробки каменю та мармуру" }),
        subtitle: ml({ en: "High-power spindle on a robotic arm", es: "Husillo de alta potencia sobre brazo robótico", uk: "Потужний шпиндель на роботизованій руці" }),
        image: "https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?q=80&w=1600&auto=format&fit=crop",
        order: 2,
      },
      {
        title: ml({ en: "Aerospace composite trimming", es: "Recorte de composites aeroespaciales", uk: "Обрізка аерокосмічних композитів" }),
        subtitle: ml({ en: "Precision trimming with automatic tool change", es: "Recorte de precisión con cambio automático de herramienta", uk: "Точна обрізка з автоматичною зміною інструменту" }),
        image: "https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=1600&auto=format&fit=crop",
        order: 3,
      },
    ],
  });

  // ---- Packages ----
  await prisma.package.deleteMany();
  const packages = [
    {
      slug: "core",
      name: ml({ en: "Core", es: "Core", uk: "Core" }),
      tagline: ml({ en: "Entry-level milling for light materials", es: "Fresado de entrada para materiales ligeros", uk: "Початковий рівень для легких матеріалів" }),
      description: ml({
        en: "The Core pack pairs an 8 kW HSD spindle with an ISO30 tool holder — ideal for foam, wood, resins and light composites. A cost-effective way to start robotic milling.",
        es: "El pack Core combina un husillo HSD de 8 kW con portaherramientas ISO30, ideal para espuma, madera, resinas y composites ligeros. La forma económica de empezar con el fresado robotizado.",
        uk: "Пакет Core поєднує шпиндель HSD 8 кВт із тримачем ISO30 — ідеально для пінопласту, дерева, смол і легких композитів. Економний спосіб почати роботизоване фрезерування.",
      }),
      spindle: "HSD 8 kW",
      power: "8 kW",
      toolHolder: "ISO30",
      basePrice: 24000,
      image: "https://images.unsplash.com/photo-1581092160562-40aa08e78837?q=80&w=1200&auto=format&fit=crop",
      order: 1,
    },
    {
      slug: "power",
      name: ml({ en: "Power", es: "Power", uk: "Power" }),
      tagline: ml({ en: "Versatile mid-range for mixed production", es: "Gama media versátil para producción mixta", uk: "Універсальний середній рівень для змішаного виробництва" }),
      description: ml({
        en: "The Power pack steps up to a 15 kW HSD spindle with ISO40 or HSK 63 tooling — the workhorse for aluminium, hard woods, tooling boards and heavier composites.",
        es: "El pack Power sube a un husillo HSD de 15 kW con portaherramientas ISO40 o HSK 63: el caballo de batalla para aluminio, maderas duras, tableros de utillaje y composites pesados.",
        uk: "Пакет Power — це шпиндель HSD 15 кВт з оснащенням ISO40 або HSK 63: робоча конячка для алюмінію, твердих порід дерева, модельних плит і важчих композитів.",
      }),
      spindle: "HSD 15 kW",
      power: "15 kW",
      toolHolder: "ISO40 / HSK 63",
      basePrice: 38000,
      image: "https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?q=80&w=1200&auto=format&fit=crop",
      order: 2,
    },
    {
      slug: "beast",
      name: ml({ en: "Beast", es: "Beast", uk: "Beast" }),
      tagline: ml({ en: "Maximum power for stone & metal", es: "Máxima potencia para piedra y metal", uk: "Максимальна потужність для каменю та металу" }),
      description: ml({
        en: "The Beast pack unleashes a 25 kW HSK 63 spindle — built for marble, granite, dense composites and continuous heavy-duty machining.",
        es: "El pack Beast libera un husillo HSK 63 de 25 kW, diseñado para mármol, granito, composites densos y mecanizado pesado en continuo.",
        uk: "Пакет Beast розкриває шпиндель HSK 63 потужністю 25 кВт — створений для мармуру, граніту, щільних композитів і безперервної важкої обробки.",
      }),
      spindle: "HSD 25 kW",
      power: "25 kW",
      toolHolder: "HSK 63",
      basePrice: 56000,
      image: "https://images.unsplash.com/photo-1565043666747-69f6646db940?q=80&w=1200&auto=format&fit=crop",
      order: 3,
    },
  ];
  for (const p of packages) {
    await prisma.package.create({ data: p });
  }

  // ---- Robots ----
  await prisma.robot.deleteMany();
  await prisma.robot.createMany({
    data: [
      { brand: "ABB", model: "IRB 6700-150/3.20", year: 2021, armReach: 3200, payload: 150, controller: "IRC5", price: 42000, image: "https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=1000&auto=format&fit=crop", order: 1 },
      { brand: "KUKA", model: "KR 210 R2700", year: 2020, armReach: 2700, payload: 210, controller: "KR C4", price: 39000, image: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?q=80&w=1000&auto=format&fit=crop", order: 2 },
      { brand: "FANUC", model: "M-900iB/280", year: 2022, armReach: 2655, payload: 280, controller: "R-30iB", price: 45000, image: "https://images.unsplash.com/photo-1565043666747-69f6646db940?q=80&w=1000&auto=format&fit=crop", order: 3 },
      { brand: "ABB", model: "IRB 4600-40/2.55", year: 2019, armReach: 2550, payload: 40, controller: "IRC5", price: 28000, image: "https://images.unsplash.com/photo-1531746790731-6c087fecd65a?q=80&w=1000&auto=format&fit=crop", order: 4 },
    ],
  });

  // ---- Option groups & options ----
  await prisma.optionGroup.deleteMany();

  const safety = await prisma.optionGroup.create({
    data: {
      name: ml({ en: "Safety", es: "Seguridad", uk: "Безпека" }),
      description: ml({ en: "Guarding and safety systems", es: "Protecciones y sistemas de seguridad", uk: "Огородження та системи безпеки" }),
      order: 1,
    },
  });
  const automation = await prisma.optionGroup.create({
    data: {
      name: ml({ en: "Automation", es: "Automatización", uk: "Автоматизація" }),
      description: ml({ en: "Tool changers, tables and axes", es: "Cambiadores, mesas y ejes", uk: "Змінники, столи та осі" }),
      order: 2,
    },
  });
  const software = await prisma.optionGroup.create({
    data: {
      name: ml({ en: "Software", es: "Software", uk: "Програмне забезпечення" }),
      description: ml({ en: "CAM and offline programming", es: "CAM y programación offline", uk: "CAM та офлайн-програмування" }),
      order: 3,
    },
  });

  await prisma.option.createMany({
    data: [
      { groupId: safety.id, name: ml({ en: "Perimeter fencing", es: "Vallado perimetral", uk: "Периметральне огородження" }), description: ml({ en: "CE-compliant fencing with interlocked door", es: "Vallado con puerta enclavada conforme CE", uk: "Огородження з блокуванням дверей за CE" }), price: 4500, order: 1 },
      { groupId: safety.id, name: ml({ en: "Safety laser scanners", es: "Escáneres láser de seguridad", uk: "Лазерні сканери безпеки" }), description: ml({ en: "Area scanning for operator zones", es: "Escaneo de zonas de operario", uk: "Сканування зон оператора" }), price: 3200, order: 2 },
      { groupId: automation.id, name: ml({ en: "Automatic tool changer (12 pos.)", es: "Cambiador automático (12 pos.)", uk: "Автоматичний змінник (12 поз.)" }), description: ml({ en: "12-position rack with tool measurement", es: "Rack de 12 posiciones con medición de herramienta", uk: "12-позиційний магазин із вимірюванням інструменту" }), price: 8900, order: 1 },
      { groupId: automation.id, name: ml({ en: "Rotary/tilt positioner", es: "Posicionador rotativo/basculante", uk: "Поворотний/нахильний позиціонер" }), description: ml({ en: "2-axis external positioner, 500 kg", es: "Posicionador externo 2 ejes, 500 kg", uk: "Зовнішній 2-осьовий позиціонер, 500 кг" }), price: 15000, order: 2 },
      { groupId: automation.id, name: ml({ en: "7th axis linear track (4 m)", es: "7º eje lineal (4 m)", uk: "7-ма лінійна вісь (4 м)" }), description: ml({ en: "Extend robot working envelope", es: "Amplía el volumen de trabajo", uk: "Розширює робочу зону робота" }), price: 22000, order: 3 },
      { groupId: software.id, name: ml({ en: "ENCY Robot CAM licence", es: "Licencia ENCY Robot CAM", uk: "Ліцензія ENCY Robot CAM" }), description: ml({ en: "Offline programming, simulation & toolpath", es: "Programación offline, simulación y trayectorias", uk: "Офлайн-програмування, симуляція та траєкторії" }), price: 6500, order: 1 },
      { groupId: software.id, name: ml({ en: "Training (5 days on-site)", es: "Formación (5 días in situ)", uk: "Навчання (5 днів на місці)" }), description: ml({ en: "Operator and programmer training", es: "Formación de operario y programador", uk: "Навчання оператора та програміста" }), price: 4000, order: 2 },
    ],
  });

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
