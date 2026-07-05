import PDFDocument from "pdfkit";
import type { Report } from "./reports";

/** Renders any Report (title + headers + rows) as a simple paginated table PDF. */
export function reportToPdfBuffer(report: Report): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: "A4" });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const startX = doc.page.margins.left;
    const colWidth = pageWidth / Math.max(report.headers.length, 1);
    const rowHeight = 18;

    function drawHeaderRow(y: number) {
      doc.font("Helvetica-Bold").fontSize(9).fillColor("#0f172a");
      report.headers.forEach((h, i) => doc.text(h, startX + i * colWidth, y, { width: colWidth - 8 }));
      doc
        .moveTo(startX, y + 14)
        .lineTo(startX + pageWidth, y + 14)
        .strokeColor("#cbd5e1")
        .lineWidth(0.5)
        .stroke();
    }

    doc.font("Helvetica-Bold").fontSize(16).fillColor("#0f172a").text(report.title);
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor("#64748b")
      .text(`Generated ${new Date().toLocaleString("en-US")}`);
    doc.moveDown(1);

    if (report.rows.length === 0) {
      doc.font("Helvetica").fontSize(11).fillColor("#0f172a").text("No results.");
      doc.end();
      return;
    }

    let y = doc.y;
    drawHeaderRow(y);
    y += rowHeight;

    for (const row of report.rows) {
      if (y + rowHeight > doc.page.height - doc.page.margins.bottom) {
        doc.addPage();
        y = doc.page.margins.top;
        drawHeaderRow(y);
        y += rowHeight;
      }
      doc.font("Helvetica").fontSize(9).fillColor("#1e293b");
      row.forEach((cell, i) => doc.text(cell, startX + i * colWidth, y, { width: colWidth - 8 }));
      y += rowHeight;
    }

    doc.end();
  });
}
