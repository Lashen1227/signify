import PDFDocument from "pdfkit";
import type { Session } from "./types.js";

export function createSessionPdf(session: Session) {
  const doc = new PDFDocument({ size: "A4", margin: 48 });
  const createdAt = new Date(session.createdAt).toLocaleString();
  const status = session.status.toUpperCase();

  doc.fontSize(20).text("Signify Transcript", { align: "left" });
  doc.moveDown(0.4);
  doc.fontSize(10).fillColor("#555555");
  doc.text(`Session: ${session.name}`);
  doc.text(`Language: ${session.language}`);
  doc.text(`Status: ${status}`);
  doc.text(`Created: ${createdAt}`);
  doc.text(`Duration: ${formatDuration(session.durationMs)}`);
  doc.moveDown(0.8);
  doc.fillColor("#111111");
  doc.moveTo(48, doc.y).lineTo(547, doc.y).strokeColor("#D1D5DB").stroke();
  doc.moveDown(0.8);

  if (session.entries.length === 0) {
    doc.fontSize(11).text("No transcript entries were captured.");
  } else {
    session.entries.forEach((entry, index) => {
      const time = new Date(entry.timestamp).toLocaleTimeString();
      doc.fontSize(11).fillColor("#111111").text(`${index + 1}. [${time}] ${entry.text}`);
      doc.fontSize(9).fillColor("#6B7280").text(`Confidence: ${(entry.confidence * 100).toFixed(0)}%`);
      if (entry.sourceText) {
        doc.text(`Source: ${entry.sourceText}`);
      }
      doc.moveDown(0.6);
    });
  }

  return doc;
}

function formatDuration(ms: number) {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}
