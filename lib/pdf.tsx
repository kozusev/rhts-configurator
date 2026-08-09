import { Document, Page, Text, View, Image, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import type { OfferSnapshot } from "./offer";
import { money } from "./format";
import { logoDataUri, imageForDoc } from "./images";
import { dl } from "./docLabels";

const RED = "#e4322b";
const DARK = "#17181b";
const GRAY = "#64748b";

const styles = StyleSheet.create({
  page: { padding: 0, fontSize: 10, color: "#1f2937", fontFamily: "Helvetica" },
  body: { paddingHorizontal: 40, paddingTop: 20 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: DARK, paddingHorizontal: 40, paddingVertical: 18 },
  logo: { height: 34, objectFit: "contain" },
  brand: { fontSize: 18, fontFamily: "Helvetica-Bold", color: "#ffffff" },
  brandSub: { fontSize: 9, color: "#cbd5e1", marginTop: 2 },
  offerBox: { textAlign: "right" },
  offerTitle: { fontSize: 14, fontFamily: "Helvetica-Bold", color: "#ffffff" },
  offerMeta: { color: "#cbd5e1", fontSize: 9 },
  accentBar: { height: 4, backgroundColor: RED },
  muted: { color: GRAY },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 11, fontFamily: "Helvetica-Bold", marginBottom: 6, color: "#0f172a" },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 6, borderBottom: "1 solid #e2e8f0" },
  thumb: { width: 34, height: 34, borderRadius: 4, marginRight: 10, objectFit: "cover", border: "1 solid #e2e8f0" },
  thumbPlaceholder: { width: 34, height: 34, borderRadius: 4, marginRight: 10, backgroundColor: "#f1f5f9" },
  cellLabel: { flex: 1, paddingRight: 8 },
  cellName: { fontFamily: "Helvetica-Bold" },
  cellSub: { fontSize: 8, color: GRAY, marginTop: 2 },
  packDesc: { marginTop: 4, lineHeight: 1.4, color: "#334155" },
  cellPrice: { width: 90, textAlign: "right", fontFamily: "Helvetica-Bold" },
  subRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3, paddingLeft: 44 },
  subLabel: { color: GRAY },
  subValue: { width: 90, textAlign: "right" },
  discountLabel: { color: "#15803d", fontFamily: "Helvetica-Bold" },
  discountValue: { width: 90, textAlign: "right", color: "#15803d", fontFamily: "Helvetica-Bold" },
  totalRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 10, paddingTop: 10, borderTop: `2 solid ${RED}` },
  totalLabel: { fontSize: 12, fontFamily: "Helvetica-Bold" },
  totalValue: { fontSize: 14, fontFamily: "Helvetica-Bold", color: RED },
  twoCol: { flexDirection: "row", justifyContent: "space-between", gap: 20 },
  col: { flex: 1 },
  kv: { marginBottom: 3 },
  footer: { position: "absolute", bottom: 24, left: 40, right: 40, fontSize: 8, color: "#94a3b8", textAlign: "center", borderTop: "1 solid #e2e8f0", paddingTop: 8 },
  note: { marginTop: 6, fontSize: 9, fontStyle: "italic", color: GRAY },
});

function fmtDate(iso: string) {
  return iso.slice(0, 10);
}

function Thumb({ src }: { src: string | null }) {
  return src ? <Image style={styles.thumb} src={src} /> : <View style={styles.thumbPlaceholder} />;
}

function OfferDoc({
  s,
  logo,
  packageImage,
  robotImage,
  optionImages,
}: {
  s: OfferSnapshot;
  logo: string | null;
  packageImage: string | null;
  robotImage: string | null;
  optionImages: (string | null)[];
}) {
  const c = s.company || {};
  const validity = c.offer_validity_days || "30";
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Branded header band (white logo on dark) */}
        <View style={styles.header}>
          <View>
            {logo ? (
              <Image style={styles.logo} src={logo} />
            ) : (
              <Text style={styles.brand}>{c.company_name || "RHTS Milling Cells"}</Text>
            )}
            {c.company_email ? <Text style={styles.brandSub}>{c.company_email}</Text> : null}
            {c.company_phone ? <Text style={styles.brandSub}>{c.company_phone}</Text> : null}
          </View>
          <View style={styles.offerBox}>
            <Text style={styles.offerTitle}>{dl("offer", s.locale)}</Text>
            <Text style={styles.offerMeta}>{s.offerNumber}</Text>
            <Text style={styles.offerMeta}>{fmtDate(s.date)}</Text>
          </View>
        </View>
        <View style={styles.accentBar} />

        <View style={styles.body}>
          <View style={[styles.section, styles.twoCol]}>
            <View style={styles.col}>
              <Text style={styles.sectionTitle}>{dl("preparedFor", s.locale)}</Text>
              <Text style={styles.kv}>{s.customer.firstName} {s.customer.lastName}</Text>
              {s.customer.company ? <Text style={[styles.kv, styles.muted]}>{s.customer.company}</Text> : null}
              {s.customer.regNumber ? <Text style={[styles.kv, styles.muted]}>{dl("regVat", s.locale)}: {s.customer.regNumber}</Text> : null}
              <Text style={[styles.kv, styles.muted]}>{s.customer.email}</Text>
              <Text style={[styles.kv, styles.muted]}>{s.customer.phone}</Text>
              {s.customer.deliveryAddress ? <Text style={[styles.kv, styles.muted]}>{dl("delivery", s.locale)}: {s.customer.deliveryAddress}</Text> : null}
            </View>
            <View style={styles.col}>
              <Text style={styles.sectionTitle}>{dl("validity", s.locale)}</Text>
              <Text style={[styles.kv, styles.muted]}>{dl("validityBody", s.locale, { days: String(validity) })}</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{dl("configuration", s.locale)}</Text>

            {s.package ? (
              <View style={styles.row}>
                <Thumb src={packageImage} />
                <View style={styles.cellLabel}>
                  <Text style={styles.cellName}>{dl("millingPack", s.locale)} — {s.package.name}</Text>
                  <Text style={styles.cellSub}>{s.package.spindle} · {s.package.toolHolder}</Text>
                  {s.package.description ? <Text style={[styles.cellSub, styles.packDesc]}>{s.package.description}</Text> : null}
                </View>
                <Text style={styles.cellPrice}>{money(s.package.price, s.currency, s.locale)}</Text>
              </View>
            ) : null}

            {s.robot ? (
              <View style={styles.row}>
                <Thumb src={robotImage} />
                <View style={styles.cellLabel}>
                  <Text style={styles.cellName}>{dl("robot", s.locale)} — {s.robot.label}</Text>
                  <Text style={styles.cellSub}>{s.robot.specs}</Text>
                </View>
                <Text style={styles.cellPrice}>{money(s.robot.price, s.currency, s.locale)}</Text>
              </View>
            ) : null}

            {s.options.map((o, i) => (
              <View style={styles.row} key={i} wrap={false}>
                <Thumb src={optionImages[i]} />
                <View style={styles.cellLabel}>
                  <Text style={styles.cellName}>{o.label}{o.qty > 1 ? ` × ${o.qty}` : ""}</Text>
                  {o.sub ? <Text style={styles.cellSub}>{o.sub}</Text> : null}
                  {o.qty > 1 ? <Text style={styles.cellSub}>{o.qty} × {money(o.unitPrice, s.currency, s.locale)}</Text> : null}
                </View>
                <Text style={styles.cellPrice}>{money(o.price, s.currency, s.locale)}</Text>
              </View>
            ))}

            {s.discount && s.discount.amount > 0 ? (
              <>
                <View style={styles.subRow}>
                  <Text style={styles.subLabel}>{dl("subtotal", s.locale)}</Text>
                  <Text style={styles.subValue}>{money(s.subtotal, s.currency, s.locale)}</Text>
                </View>
                <View style={styles.subRow}>
                  <Text style={styles.discountLabel}>{s.discount.label}</Text>
                  <Text style={styles.discountValue}>− {money(s.discount.amount, s.currency, s.locale)}</Text>
                </View>
              </>
            ) : null}

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>{s.discount && s.discount.amount > 0 ? dl("totalAfterDiscount", s.locale) : dl("estimatedTotal", s.locale)}</Text>
              <Text style={styles.totalValue}>{money(s.total, s.currency, s.locale)}</Text>
            </View>

            {s.vatNote ? <Text style={styles.note}>{s.vatNote}</Text> : null}
          </View>

          {s.customer.note ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{dl("customerNote", s.locale)}</Text>
              <Text style={styles.muted}>{s.customer.note}</Text>
            </View>
          ) : null}
        </View>

        <Text style={styles.footer}>
          {(c.company_name || "RHTS")} · {c.company_website || ""} · {c.company_email || ""}
        </Text>
      </Page>
    </Document>
  );
}

export async function renderOfferPdf(s: OfferSnapshot): Promise<Buffer> {
  const [logo, packageImage, robotImage, optionImages] = await Promise.all([
    logoDataUri(),
    s.package ? imageForDoc(s.package.image) : Promise.resolve(null),
    s.robot ? imageForDoc(s.robot.image) : Promise.resolve(null),
    Promise.all(s.options.map((o) => imageForDoc(o.image))),
  ]);
  return renderToBuffer(
    <OfferDoc s={s} logo={logo} packageImage={packageImage} robotImage={robotImage} optionImages={optionImages} />
  );
}
