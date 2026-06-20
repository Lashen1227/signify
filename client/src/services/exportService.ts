import { jsPDF } from "jspdf";
import type { TranscriptEntry } from "@/types/transcript";

const fmtTime = (ts: number) => new Date(ts).toLocaleTimeString();
const fmtDate = (ts: number) => new Date(ts).toLocaleDateString();

export function transcriptToText(entries: TranscriptEntry[]): string {
  return entries
    .map((e) => `[${fmtTime(e.timestamp)}] ${e.text}`)
    .join("\n");
}

export function downloadText(entries: TranscriptEntry[], language: string) {
  const header = `Signify Transcript\nDate: ${fmtDate(Date.now())}\nLanguage: ${language}\n\n`;
  const blob = new Blob([header + transcriptToText(entries)], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  triggerDownload(url, `sign-conversation-${dateStamp()}.txt`);
  URL.revokeObjectURL(url);
}

export function downloadPdf(entries: TranscriptEntry[], language: string) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 56;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let y = margin;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("Signify — Sign Language Transcript", margin, y);
  y += 28;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(110);
  doc.text(`Date: ${fmtDate(Date.now())}    Time: ${fmtTime(Date.now())}    Language: ${language}`, margin, y);
  y += 12;
  doc.setDrawColor(220);
  doc.line(margin, y, pageWidth - margin, y);
  y += 18;

  doc.setTextColor(20);
  doc.setFontSize(11);

  for (const e of entries) {
    const stamp = `[${fmtTime(e.timestamp)}]`;
    const lines = doc.splitTextToSize(`${stamp} ${e.text}`, pageWidth - margin * 2);
    if (y + lines.length * 16 > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
    doc.text(lines, margin, y);
    y += lines.length * 16 + 4;
  }

  if (entries.length === 0) {
    doc.text("No entries captured.", margin, y);
  }

  doc.save(`sign-conversation-${dateStamp()}.pdf`);
}

export async function copyTranscript(entries: TranscriptEntry[]) {
  await navigator.clipboard.writeText(transcriptToText(entries));
}

function dateStamp() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function triggerDownload(url: string, filename: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export function formatDuration(ms: number): string {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}
