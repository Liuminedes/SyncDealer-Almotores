// backend/src/utils/pdfCommission.js
// Genera el PDF de comisión replicando el formato oficial de Almotores S.A.
import PDFDocument from "pdfkit";

const MONTHS_ES = [
  "","ENERO","FEBRERO","MARZO","ABRIL","MAYO","JUNIO",
  "JULIO","AGOSTO","SEPTIEMBRE","OCTUBRE","NOVIEMBRE","DICIEMBRE",
];

const COP = (n) =>
  "$" + Number(n || 0).toLocaleString("es-CO", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

// Colores del formato oficial
const COLOR_HEADER_BG  = "#C0504D"; // rojo encabezado de tabla
const COLOR_HEADER_FG  = "#FFFFFF";
const COLOR_META_BG    = "#F2DCDB"; // fondo filas de metadatos (fecha, asesor…)
const COLOR_META_KEY   = "#000000";
const COLOR_ROW_EVEN   = "#FCE4E4"; // filas alternas de la tabla
const COLOR_ROW_ODD    = "#FFFFFF";
const COLOR_TOTAL_BG   = "#F2DCDB";
const COLOR_BORDER     = "#C0504D";

export function generateCommissionPdf(run, items) {
  return new Promise((resolve, reject) => {
    const doc    = new PDFDocument({ size: "LETTER", layout: "landscape", margin: 28 });
    const chunks = [];

    doc.on("data",  (c) => chunks.push(c));
    doc.on("end",   () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const W     = doc.page.width  - 56; // ancho útil
    const LEFT  = 28;
    let   y     = 28;

    // ── ENCABEZADO ────────────────────────────────────────────────────────────
    doc.font("Helvetica-Bold").fontSize(13)
      .text("ALMOTORES S.A.", LEFT, y, { width: W, align: "center" });
    y += 16;
    doc.text("COMISIONES DE VENTAS", LEFT, y, { width: W, align: "center" });
    y += 22;

    // ── METADATOS (FECHA / ASESOR / MES / QUINCENA) ──────────────────────────
    const metaW  = W * 0.42;
    const metaKW = 80;
    const metaVW = metaW - metaKW;
    const metaH  = 14;
    const metas  = [
      ["FECHA",    new Date(run.created_at).toLocaleDateString("es-CO", { timeZone: "UTC" })],
      ["ASESOR",   `${run.advisor_document || ""} ${(run.advisor_name || "").toUpperCase()}`],
      ["MES",      MONTHS_ES[run.cut_month] || ""],
      ["QUINCENA", run.fortnight === "FIRST" ? "PRIMERA" : "SEGUNDA"],
    ];

    metas.forEach(([key, val]) => {
      // Fondo
      doc.rect(LEFT, y, metaKW, metaH).fillAndStroke(COLOR_META_BG, COLOR_BORDER);
      doc.rect(LEFT + metaKW, y, metaVW, metaH).fillAndStroke(COLOR_META_BG, COLOR_BORDER);
      // Texto
      doc.fillColor(COLOR_META_KEY).font("Helvetica-Bold").fontSize(8)
        .text(key, LEFT + 3, y + 3, { width: metaKW - 6, ellipsis: true });
      doc.font("Helvetica").fontSize(8)
        .text(val, LEFT + metaKW + 3, y + 3, { width: metaVW - 6, ellipsis: true });
      y += metaH;
    });
    y += 8;

    // ── CABECERA DE TABLA ─────────────────────────────────────────────────────
    // Anchos de columnas (total = W)
    const cols = [
      { label: "FACTURA",        w: W * 0.07 },
      { label: "CLIENTE",        w: W * 0.17 },
      { label: "PLACA",          w: W * 0.06 },
      { label: "VEHÍCULO",       w: W * 0.09 },
      { label: "MODELO",         w: W * 0.11 },
      { label: "VERSIÓN",        w: W * 0.09 },
      { label: "MES",            w: W * 0.08 },
      { label: "TIPO COBRO",     w: W * 0.09 },
      { label: "VALOR COMISIÓN", w: W * 0.11 },
    ];
    // Ajustar último para que sume W exacto
    const sumW = cols.reduce((s, c) => s + c.w, 0);
    cols[cols.length - 1].w += W - sumW;

    const rowH = 13;
    let   x    = LEFT;

    cols.forEach((col) => {
      doc.rect(x, y, col.w, rowH).fillAndStroke(COLOR_HEADER_BG, COLOR_BORDER);
      doc.fillColor(COLOR_HEADER_FG).font("Helvetica-Bold").fontSize(7)
        .text(col.label, x + 2, y + 3, { width: col.w - 4, align: "center", ellipsis: true });
      x += col.w;
    });
    y += rowH;

    // ── FILAS DE DATOS ────────────────────────────────────────────────────────
    const MAX_ROWS = 18; // filas visibles antes de desbordarse
    const filledItems = [...(items || [])];
    // Rellenar con filas vacías hasta MAX_ROWS
    while (filledItems.length < MAX_ROWS) filledItems.push(null);

    filledItems.forEach((it, idx) => {
      const bg = idx % 2 === 0 ? COLOR_ROW_ODD : COLOR_ROW_EVEN;
      x = LEFT;

      const vals = it ? [
        it.invoice          || "",
        (it.client_name     || "").toUpperCase(),
        it.plate            || "",
        it.vehicle_code     || "",
        (it.vehicle_model   || "").toUpperCase(),
        (it.vehicle_version || "").toUpperCase(),
        MONTHS_ES[it.sale_cut_month || run.cut_month] || "",
        it.tier_name        || (it.notes || ""),
        COP(it.rate_amount),
      ] : Array(9).fill("");

      cols.forEach((col, ci) => {
        doc.rect(x, y, col.w, rowH).fillAndStroke(bg, COLOR_BORDER);
        if (vals[ci]) {
          const align = ci === 8 ? "right" : "left"; // valor comisión alineado a la derecha
          doc.fillColor("#000000").font("Helvetica").fontSize(7)
            .text(vals[ci], x + 2, y + 3, { width: col.w - 4, align, ellipsis: true });
        }
        x += col.w;
      });
      y += rowH;
    });

    // ── SUBTOTALES: BASE + AJUSTE + TOTAL ────────────────────────────────────
    const totalLabelW = W - cols[cols.length - 1].w;
    const totalValW   = cols[cols.length - 1].w;

    const hasAdj     = run.manual_adjustment != null && Number(run.manual_adjustment) !== 0;
    const adjAmount  = Number(run.manual_adjustment || 0);
    const adjType    = String(run.manual_adjustment_type || "").toUpperCase();
    const adjNote    = String(run.manual_adjustment_note || "").trim();
    const baseComm   = Number(run.base_commission || run.total_commission || 0);

    // Fila comisión base (solo si hay ajuste, para mostrar el desglose)
    if (hasAdj) {
      doc.rect(LEFT, y, totalLabelW, rowH).fillAndStroke(COLOR_ROW_EVEN, COLOR_BORDER);
      doc.rect(LEFT + totalLabelW, y, totalValW, rowH).fillAndStroke(COLOR_ROW_EVEN, COLOR_BORDER);
      doc.fillColor("#000000").font("Helvetica-Bold").fontSize(8)
        .text("COMISIÓN BASE", LEFT + 2, y + 3, { width: totalLabelW - 4, align: "center" });
      doc.font("Helvetica").fontSize(8)
        .text(COP(baseComm), LEFT + totalLabelW + 2, y + 3, { width: totalValW - 4, align: "right" });
      y += rowH;

      // Fila ajuste manual
      const adjLabel  = adjType === "ADD" ? "AUMENTO" : "DESCUENTO";
      const adjSign   = adjType === "ADD" ? "+" : "-";
      const adjColor  = adjType === "ADD" ? "#1a7a1a" : "#C0504D";
      const adjBg     = adjType === "ADD" ? "#E8F5E8" : "#FDEAEA";

      doc.rect(LEFT, y, totalLabelW, rowH).fillAndStroke(adjBg, COLOR_BORDER);
      doc.rect(LEFT + totalLabelW, y, totalValW, rowH).fillAndStroke(adjBg, COLOR_BORDER);

      // Label con concepto
      const adjFullLabel = adjNote
        ? `${adjLabel}: ${adjNote}`
        : adjLabel;
      doc.fillColor(adjColor).font("Helvetica-Bold").fontSize(8)
        .text(adjFullLabel, LEFT + 2, y + 3, { width: totalLabelW - 4, ellipsis: true });
      doc.font("Helvetica-Bold").fontSize(8)
        .text(`${adjSign}${COP(adjAmount)}`, LEFT + totalLabelW + 2, y + 3, { width: totalValW - 4, align: "right" });
      y += rowH;
    }

    // Fila TOTAL COMISIONES (siempre)
    doc.rect(LEFT, y, totalLabelW, rowH).fillAndStroke(COLOR_TOTAL_BG, COLOR_BORDER);
    doc.rect(LEFT + totalLabelW, y, totalValW, rowH).fillAndStroke(COLOR_TOTAL_BG, COLOR_BORDER);
    doc.fillColor("#000000").font("Helvetica-Bold").fontSize(8)
      .text("TOTAL COMISIONES", LEFT + 2, y + 3, { width: totalLabelW - 4, align: "center" });
    doc.text(COP(run.total_commission), LEFT + totalLabelW + 2, y + 3, { width: totalValW - 4, align: "right" });
    y += rowH + 10;

    // ── BONOS / NOTAS ─────────────────────────────────────────────────────────
    // Parsear notas — formato: "Bonos: Meta de Ventas(+$300.000) | Vacaciones: ..."
    const notesRaw = String(run.notes || "").trim();
    if (notesRaw) {
      const noteLines = notesRaw.split("|").map(s => s.trim()).filter(Boolean);

      // Cabecera sección bonos
      const bonusHeaderH = 13;
      doc.rect(LEFT, y, W, bonusHeaderH).fillAndStroke(COLOR_HEADER_BG, COLOR_BORDER);
      doc.fillColor(COLOR_HEADER_FG).font("Helvetica-Bold").fontSize(7)
        .text("BONOS Y AJUSTES APLICADOS", LEFT + 2, y + 3, { width: W - 4, align: "center" });
      y += bonusHeaderH;

      noteLines.forEach((line, idx) => {
        const bg = idx % 2 === 0 ? COLOR_ROW_ODD : COLOR_ROW_EVEN;
        const noteH = 13;
        doc.rect(LEFT, y, W, noteH).fillAndStroke(bg, COLOR_BORDER);
        doc.fillColor("#000000").font("Helvetica").fontSize(7)
          .text(line, LEFT + 4, y + 3, { width: W - 8, ellipsis: true });
        y += noteH;
      });
      y += 20;
    } else {
      y += 26;
    }

    // ── FIRMAS ────────────────────────────────────────────────────────────────
    const sigW   = 180;
    const sigGap = 60;
    const sigY   = y + 14;

    // Asesor
    doc.moveTo(LEFT, sigY).lineTo(LEFT + sigW, sigY).stroke("#000000");
    doc.font("Helvetica-Bold").fontSize(8).fillColor("#000000")
      .text("ASESOR", LEFT, sigY + 3);

    // Director Comercial (centrado en página)
    const dirX = LEFT + sigW + sigGap;
    doc.moveTo(dirX, sigY).lineTo(dirX + sigW, sigY).stroke("#000000");
    doc.font("Helvetica-Bold").fontSize(8).fillColor("#000000")
      .text("DIRECTOR COMERCAL", dirX, sigY + 3);

    doc.end();
  });
}