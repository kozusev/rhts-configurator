import { prisma } from "./db";
import { t, type Locale } from "./i18n";
import { getSettings } from "./settings";

export type OfferLineItem = { id?: string; label: string; sub?: string; image?: string; qty: number; unitPrice: number; price: number; group?: string };

export type OfferDiscount = { label: string; amount: number };

export type OfferSnapshot = {
  offerNumber: string;
  date: string; // ISO
  locale: Locale;
  currency: string;
  customer: { firstName: string; lastName: string; email: string; phone: string; company: string; note: string; deliveryAddress: string; regNumber: string };
  package: { name: string; price: number; spindle: string; toolHolder: string; image?: string; description?: string };
  robot: { label: string; price: number; specs: string; image?: string } | null;
  options: OfferLineItem[];
  subtotal: number; // sum of pack + robot + options, before discount
  discount?: OfferDiscount | null;
  total: number; // subtotal - discount
  company: Record<string, string>;
  vatNote: string;
};

export type OfferInput = {
  locale: Locale;
  packageId: string;
  robotId: string;
  optionIds: string[];
  optionQuantities?: Record<string, number>;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company?: string;
  note?: string;
  deliveryAddress?: string;
  regNumber?: string;
};

/** Build an offer snapshot, computing all prices server-side from the DB. */
export async function buildOfferSnapshot(input: OfferInput, offerNumber: string): Promise<OfferSnapshot> {
  const locale = input.locale;
  const settings = await getSettings();

  const pkg = await prisma.package.findUnique({ where: { id: input.packageId } });
  if (!pkg) throw new Error("Package not found");

  const robot = input.robotId ? await prisma.robot.findUnique({ where: { id: input.robotId } }) : null;

  // Order options the same way the website shows them: by option-group order,
  // then by the option's order within its group.
  const options = input.optionIds.length
    ? await prisma.option.findMany({
        where: { id: { in: input.optionIds }, published: true },
        orderBy: [{ group: { order: "asc" } }, { order: "asc" }],
        include: { group: true },
      })
    : [];

  const currency = pkg.currency || "EUR";

  const quantities = input.optionQuantities || {};
  const optionItems: OfferLineItem[] = options.map((o) => {
    const label = t(o.name, locale);
    // ENCY licence options ship without their own photo — fall back to the brand image.
    const image = o.image || (/ency/i.test(label) ? "/ENCY.png" : "");
    // Quantity: at least 1, whole number. `price` is the extended (line) price so all
    // downstream totals keep summing `price` unchanged; `unitPrice`/`qty` are for display.
    const qty = Math.max(1, Math.round(quantities[o.id] || 1));
    return { id: o.id, label, sub: t(o.description, locale), image, qty, unitPrice: o.price, price: o.price * qty, group: t(o.group.name, locale) };
  });
  const optionsTotal = optionItems.reduce((s, o) => s + o.price, 0);
  const subtotal = pkg.basePrice + (robot?.price || 0) + optionsTotal;
  const total = subtotal;

  return {
    offerNumber,
    date: new Date().toISOString(),
    locale,
    currency,
    customer: {
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      phone: input.phone,
      company: input.company || "",
      note: input.note || "",
      deliveryAddress: input.deliveryAddress || "",
      regNumber: input.regNumber || "",
    },
    package: { name: t(pkg.name, locale), price: pkg.basePrice, spindle: pkg.spindle, toolHolder: pkg.toolHolder, image: pkg.image || "", description: t(pkg.description, locale) },
    robot: robot
      ? {
          label: `${robot.brand} ${robot.model}`,
          price: robot.price,
          specs: `${robot.year} · ${robot.armReach} mm · ${robot.payload} kg · ${robot.controller}`,
          image: robot.image || "",
        }
      : null,
    options: optionItems,
    subtotal,
    discount: null,
    total,
    company: settings,
    vatNote: t(settings.vat_note, locale),
  };
}

export async function nextOfferNumber(prefix: string): Promise<string> {
  const year = new Date().getFullYear();
  // Strip any trailing dash from the prefix so we never get "RHTS--2026-0001".
  const p = prefix.replace(/-+$/, "");
  const base = `${p}-${year}-`;

  // Derive the next sequence from the HIGHEST existing offer for this prefix+year,
  // never from the lead count — otherwise deleting a lead would reuse a number and
  // hit the unique constraint on `offerNumber` (P2002). Sequences are zero-padded
  // to 4 digits so lexical desc order matches numeric order.
  const last = await prisma.lead.findFirst({
    where: { offerNumber: { startsWith: base } },
    orderBy: { offerNumber: "desc" },
    select: { offerNumber: true },
  });

  let seq = 1;
  if (last) {
    const m = last.offerNumber.match(/(\d+)$/);
    if (m) seq = parseInt(m[1], 10) + 1;
  }
  return `${base}${String(seq).padStart(4, "0")}`;
}
