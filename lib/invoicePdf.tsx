import { Document, Page, Text, View, Image, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import type { OfferSnapshot } from "./offer";
import { money } from "./format";
import { logoDataUri } from "./images";
import { dl } from "./docLabels";

const RED = "#e4322b";
const DARK = "#17181b";
const GRAY = "#64748b";

const styles = StyleSheet.create({
  page: { padding: 0, fontSize: 10, color: "#1f2937", fontFamily: "Helvetica" },
  body: { paddingHorizontal: 40, paddingTop: 20 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: DARK, paddingHorizontal: 40, paddingVertical: 18 },
  logo: { height: 64, objectFit: "contain" },
  brand: { fontSize: 18, fontFamily: "Helvetica-Bold", color: "#ffffff" },
  brandSub: { fontSize: 9, color: "#cbd5e1", marginTop: 2 },
  docBox: { textAlign: "right" },
  docTitle: { fontSize: 16, fontFamily: "Helvetica-Bold", color: "#ffffff" },
  docMeta: { color: "#cbd5e1", fontSize: 9 },
  accentBar: { height: 4, backgroundColor: RED },
  muted: { color: GRAY },
  twoCol: { flexDirection: "row", justifyContent: "space-between", gap: 20, marginBottom: 16 },
  col: { flex: 1 },
  sectionTitle: { fontSize: 11, fontFamily: "Helvetica-Bold", marginBottom: 6, color: "#0f172a" },
  kv: { marginBottom: 2 },
  section: { marginBottom: 16 },
  tableHead: { flexDirection: "row", borderBottom: `1 solid ${DARK}`, paddingBottom: 4, marginBottom: 2 },
  th: { fontFamily: "Helvetica-Bold", fontSize: 9, color: "#0f172a" },
  row: { flexDirection: "row", paddingVertical: 5, borderBottom: "1 solid #e2e8f0" },
  cDesc: { flex: 1, paddingRight: 8 },
  cQty: { width: 40, textAlign: "right" },
  cUnit: { width: 80, textAlign: "right" },
  cAmt: { width: 80, textAlign: "right" },
  totRow: { flexDirection: "row", justifyContent: "flex-end", paddingVertical: 2 },
  totLabel: { width: 120, textAlign: "right", color: GRAY, paddingRight: 10 },
  totValue: { width: 90, textAlign: "right" },
  grandRow: { flexDirection: "row", justifyContent: "flex-end", marginTop: 6, paddingTop: 6, borderTop: `2 solid ${RED}` },
  grandLabel: { width: 120, textAlign: "right", fontFamily: "Helvetica-Bold", fontSize: 12, paddingRight: 10 },
  grandValue: { width: 90, textAlign: "right", fontFamily: "Helvetica-Bold", fontSize: 12, color: RED },
  bankBox: { marginTop: 18, borderTop: "1 solid #e2e8f0", paddingTop: 10 },
  footer: { position: "absolute", bottom: 24, left: 40, right: 40, fontSize: 8, color: "#94a3b8", textAlign: "center", borderTop: "1 solid #e2e8f0", paddingTop: 8 },
});

function fmtDate(iso: string) {
  return iso.slice(0, 10);
}

function InvoiceDoc({ s, g, logo, hsCode, paymentTerms }: { s: OfferSnapshot; g: Record<string, string>; logo: string | null; hsCode: string; paymentTerms: string }) {
  const rate = parseFloat(g.inv_vat_rate || "21") || 0;
  const net = s.total;
  const vat = net * (rate / 100);
  const gross = net + vat;

  // Line items: pack + robot + options.
  const items: { desc: string; sub?: string; qty: number; unit: number; amt: number }[] = [];
  if (s.package) items.push({ desc: `${dl("millingPack", s.locale)} — ${s.package.name}`, qty: 1, unit: s.package.price, amt: s.package.price });
  if (s.robot) items.push({ desc: `${dl("robot", s.locale)} — ${s.robot.label}`, qty: 1, unit: s.robot.price, amt: s.robot.price });
  for (const o of s.options) items.push({ desc: o.label, sub: o.sub, qty: o.qty, unit: o.unitPrice, amt: o.price });

  const cur = s.currency;
  const bankRows: [string, string][] = [
    [dl("beneficiary", s.locale), g.inv_bank_beneficiary],
    [dl("iban", s.locale), g.inv_bank_iban],
    [dl("swiftBic", s.locale), g.inv_bank_swift],
    [dl("intermediaryBic", s.locale), g.inv_bank_intermediary_bic],
    [dl("beneficiaryAddress", s.locale), g.inv_bank_beneficiary_address],
    [dl("bankName", s.locale), g.inv_bank_name],
    [dl("bankAddress", s.locale), g.inv_bank_address],
  ].filter(([, v]) => v) as [string, string][];

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            {logo ? <Image style={styles.logo} src={logo} /> : <Text style={styles.brand}>{g.inv_seller_company || "Invoice"}</Text>}
          </View>
          <View style={styles.docBox}>
            <Text style={styles.docTitle}>{dl("invoice", s.locale)}</Text>
            <Text style={styles.docMeta}>{s.offerNumber}</Text>
            <Text style={styles.docMeta}>{fmtDate(s.date)}</Text>
            {hsCode ? <Text style={styles.docMeta}>{dl("hsCode", s.locale)}: {hsCode}</Text> : null}
          </View>
        </View>
        <View style={styles.accentBar} />

        <View style={styles.body}>
          <View style={styles.twoCol}>
            <View style={styles.col}>
              <Text style={styles.sectionTitle}>{dl("seller", s.locale)}</Text>
              <Text style={styles.kv}>{g.inv_seller_company || ""}</Text>
              {g.inv_seller_tax_id ? <Text style={[styles.kv, styles.muted]}>{dl("taxId", s.locale)}: {g.inv_seller_tax_id}</Text> : null}
              {g.inv_seller_address ? <Text style={[styles.kv, styles.muted]}>{g.inv_seller_address}</Text> : null}
              {g.inv_seller_phone ? <Text style={[styles.kv, styles.muted]}>{g.inv_seller_phone}</Text> : null}
              {g.inv_seller_email ? <Text style={[styles.kv, styles.muted]}>{g.inv_seller_email}</Text> : null}
            </View>
            <View style={styles.col}>
              <Text style={styles.sectionTitle}>{dl("billTo", s.locale)}</Text>
              <Text style={styles.kv}>{s.customer.company || `${s.customer.firstName} ${s.customer.lastName}`.trim()}</Text>
              {s.customer.company && (s.customer.firstName || s.customer.lastName) ? <Text style={[styles.kv, styles.muted]}>{s.customer.firstName} {s.customer.lastName}</Text> : null}
              {s.customer.regNumber ? <Text style={[styles.kv, styles.muted]}>{dl("regVat", s.locale)}: {s.customer.regNumber}</Text> : null}
              {s.customer.deliveryAddress ? <Text style={[styles.kv, styles.muted]}>{s.customer.deliveryAddress}</Text> : null}
              {s.customer.email ? <Text style={[styles.kv, styles.muted]}>{s.customer.email}</Text> : null}
              {s.customer.phone ? <Text style={[styles.kv, styles.muted]}>{s.customer.phone}</Text> : null}
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.tableHead}>
              <Text style={[styles.th, styles.cDesc]}>{dl("description", s.locale)}</Text>
              <Text style={[styles.th, styles.cQty]}>{dl("qty", s.locale)}</Text>
              <Text style={[styles.th, styles.cUnit]}>{dl("unit", s.locale)}</Text>
              <Text style={[styles.th, styles.cAmt]}>{dl("amount", s.locale)}</Text>
            </View>
            {items.map((it, i) => (
              <View style={styles.row} key={i} wrap={false}>
                <View style={styles.cDesc}>
                  <Text>{it.desc}</Text>
                  {it.sub ? <Text style={[styles.muted, { fontSize: 8, marginTop: 2 }]}>{it.sub}</Text> : null}
                </View>
                <Text style={styles.cQty}>{it.qty}</Text>
                <Text style={styles.cUnit}>{money(it.unit, cur, s.locale)}</Text>
                <Text style={styles.cAmt}>{money(it.amt, cur, s.locale)}</Text>
              </View>
            ))}
          </View>

          <View>
            {s.discount && s.discount.amount > 0 ? (
              <View style={styles.totRow}>
                <Text style={styles.totLabel}>{s.discount.label}</Text>
                <Text style={styles.totValue}>− {money(s.discount.amount, cur, s.locale)}</Text>
              </View>
            ) : null}
            <View style={styles.totRow}>
              <Text style={styles.totLabel}>{dl("netTotal", s.locale)}</Text>
              <Text style={styles.totValue}>{money(net, cur, s.locale)}</Text>
            </View>
            <View style={styles.totRow}>
              <Text style={styles.totLabel}>{dl("vat", s.locale)} {rate}%</Text>
              <Text style={styles.totValue}>{money(vat, cur, s.locale)}</Text>
            </View>
            <View style={styles.grandRow}>
              <Text style={styles.grandLabel}>{dl("totalDue", s.locale)}</Text>
              <Text style={styles.grandValue}>{money(gross, cur, s.locale)}</Text>
            </View>
          </View>

          {paymentTerms ? (
            <View style={styles.bankBox}>
              <Text style={styles.sectionTitle}>{dl("paymentTerms", s.locale)}</Text>
              <Text style={styles.kv}>{paymentTerms}</Text>
            </View>
          ) : null}

          {bankRows.length > 0 ? (
            <View style={styles.bankBox}>
              <Text style={styles.sectionTitle}>{dl("paymentDetails", s.locale)}</Text>
              {bankRows.map(([k, v]) => (
                <Text key={k} style={[styles.kv, styles.muted]}>{k}: <Text style={{ color: "#1f2937" }}>{v}</Text></Text>
              ))}
            </View>
          ) : null}

          {g.inv_terms ? (
            <View style={styles.bankBox}>
              <Text style={styles.sectionTitle}>{dl("generalTerms", s.locale)}</Text>
              <Text style={[styles.muted, { fontSize: 8, lineHeight: 1.4 }]}>{g.inv_terms}</Text>
            </View>
          ) : null}
        </View>

        <Text style={styles.footer}>
          {(g.inv_seller_company || "")} {g.inv_seller_tax_id ? `· Tax ID ${g.inv_seller_tax_id}` : ""} {g.inv_seller_email ? `· ${g.inv_seller_email}` : ""}
        </Text>
      </Page>
    </Document>
  );
}

export async function renderInvoicePdf(
  s: OfferSnapshot,
  settings: Record<string, string>,
  opts?: { hsCode?: string; paymentTerms?: string }
): Promise<Buffer> {
  const logo = await logoDataUri();
  const hsCode = opts?.hsCode ?? settings.inv_hs_code ?? "";
  const paymentTerms = opts?.paymentTerms ?? "";
  return renderToBuffer(<InvoiceDoc s={s} g={settings} logo={logo} hsCode={hsCode} paymentTerms={paymentTerms} />);
}
