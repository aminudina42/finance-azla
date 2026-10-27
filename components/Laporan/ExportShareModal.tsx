"use client";

import React, { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "@/components/Modal";
import type { CompleteFinancialReport } from "@/lib/report-service";
import {
  formatWhatsAppReportText,
  generateCsvContent,
} from "@/lib/report-service";
import { ReportShareCard } from "@/components/Laporan/ReportShareCard";
import { toPng } from "html-to-image";
import {
  MessageCircle,
  FileSpreadsheet,
  Image,
  Printer,
  Copy,
  Loader2,
  Share2,
} from "lucide-react";

interface ExportShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: CompleteFinancialReport;
  familyName?: string;
  onShowToast: (msg: string) => void;
}

export default function ExportShareModal({
  isOpen,
  onClose,
  report,
  familyName = "Keluarga",
  onShowToast,
}: ExportShareModalProps) {
  const router = useRouter();
  const cardRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPng, setIsGeneratingPng] = useState(false);

  // 1. Ekspor CSV / Excel
  const handleDownloadCsv = () => {
    try {
      const csvContent = generateCsvContent(report, familyName);
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const cleanLabel = report.period.label.replace(/[^a-zA-Z0-9]/g, "_");
      link.href = url;
      link.setAttribute("download", `Laporan_Keuangan_${cleanLabel}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      onShowToast("File CSV berhasil diunduh! Siap dibuka di Excel / Sheets.");
      onClose();
    } catch (err) {
      console.error(err);
      onShowToast("Gagal mengunduh file CSV.");
    }
  };

  // 2. Berbagi via WhatsApp
  const handleShareWhatsApp = () => {
    try {
      const text = formatWhatsAppReportText(report, familyName);
      // Salin ke clipboard otomatis
      if (navigator.clipboard) {
        navigator.clipboard.writeText(text);
      }
      const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
      window.open(waUrl, "_blank");
      onShowToast("Teks ringkasan disalin & membuka WhatsApp! ✨");
      onClose();
    } catch (err) {
      console.error(err);
      onShowToast("Gagal membuka WhatsApp.");
    }
  };

  // 3. Salin Teks Ringkasan Saja
  const handleCopyTextOnly = () => {
    try {
      const text = formatWhatsAppReportText(report, familyName);
      if (navigator.clipboard) {
        navigator.clipboard.writeText(text);
        onShowToast("Teks ringkasan berhasil disalin ke clipboard! 📋");
        onClose();
      } else {
        onShowToast("Clipboard tidak didukung browser ini.");
      }
    } catch (err) {
      console.error(err);
      onShowToast("Gagal menyalin teks.");
    }
  };

  // 4. Unduh Kartu Gambar PNG (via html-to-image)
  const handleDownloadImage = async () => {
    if (!cardRef.current) return;
    setIsGeneratingPng(true);
    try {
      // NS-09: Timeout guard & safety
      const dataUrl = await toPng(cardRef.current, {
        pixelRatio: 2,
        backgroundColor: "#102d55",
        cacheBust: true,
      });

      const cleanLabel = report.period.label.replace(/[^a-zA-Z0-9]/g, "_");
      const link = document.createElement("a");
      link.download = `Kartu_Laporan_${cleanLabel}.png`;
      link.href = dataUrl;
      link.click();

      onShowToast("Kartu ringkasan berhasil disimpan sebagai gambar! 🖼️");
      onClose();
    } catch (err) {
      console.error("Gagal buat kartu gambar:", err);
      onShowToast("Gagal membuat gambar. Anda tetap dapat menggunakan ringkasan teks!");
    } finally {
      setIsGeneratingPng(false);
    }
  };

  // 5. Cetak PDF Formal A4
  const handlePrintPdf = () => {
    onClose();
    const periodParam = report.period.type;
    const cycleParam = report.period.cycleId ? `&cycleId=${report.period.cycleId}` : "";
    const startParam = `&start=${report.period.startDate}`;
    const endParam = `&end=${report.period.endDate}`;
    router.push(`/laporan/print?type=${periodParam}${cycleParam}${startParam}${endParam}`);
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose}>
        <div className="flex items-center gap-2 mb-1">
          <Share2 size={18} className="text-teal-600" />
          <h2 className="text-base font-extrabold" style={{ color: "var(--navy)" }}>
            Ekspor &amp; Bagikan Laporan
          </h2>
        </div>
        <p className="text-xs mb-4" style={{ color: "var(--muted)" }}>
          Periode: <strong>{report.period.label}</strong>
        </p>

        {/* Action Buttons List */}
        <div className="flex flex-col gap-2.5">
          {/* WhatsApp */}
          <button
            type="button"
            onClick={handleShareWhatsApp}
            className="p-3.5 rounded-2xl flex items-center justify-between border transition-all cursor-pointer text-left hover:border-emerald-300 hover:bg-emerald-50/50"
            style={{
              background: "var(--surface)",
              borderColor: "var(--border)",
            }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <MessageCircle size={20} />
              </div>
              <div>
                <div className="text-xs font-bold" style={{ color: "var(--navy)" }}>
                  Bagi Ringkasan ke WhatsApp
                </div>
                <div className="text-[11px]" style={{ color: "var(--muted)" }}>
                  Kirim teks terformat rapi ke pasangan
                </div>
              </div>
            </div>
            <span className="text-emerald-700 font-extrabold text-sm">›</span>
          </button>

          {/* Unduh Kartu Gambar PNG */}
          <button
            type="button"
            disabled={isGeneratingPng}
            onClick={handleDownloadImage}
            className="p-3.5 rounded-2xl flex items-center justify-between border transition-all cursor-pointer text-left hover:border-blue-300 hover:bg-blue-50/50 disabled:opacity-60"
            style={{
              background: "var(--surface)",
              borderColor: "var(--border)",
            }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                {isGeneratingPng ? <Loader2 size={18} className="animate-spin" /> : <Image size={20} />}
              </div>
              <div>
                <div className="text-xs font-bold" style={{ color: "var(--navy)" }}>
                  {isGeneratingPng ? "Sedang Membuat Gambar..." : "Unduh Kartu Gambar PNG"}
                </div>
                <div className="text-[11px]" style={{ color: "var(--muted)" }}>
                  Kartu visual cantik untuk status / medsos
                </div>
              </div>
            </div>
            <span className="text-blue-700 font-extrabold text-sm">›</span>
          </button>

          {/* Unduh CSV / Excel */}
          <button
            type="button"
            onClick={handleDownloadCsv}
            className="p-3.5 rounded-2xl flex items-center justify-between border transition-all cursor-pointer text-left hover:border-teal-300 hover:bg-teal-50/50"
            style={{
              background: "var(--surface)",
              borderColor: "var(--border)",
            }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
                <FileSpreadsheet size={20} />
              </div>
              <div>
                <div className="text-xs font-bold" style={{ color: "var(--navy)" }}>
                  Unduh File CSV / Excel
                </div>
                <div className="text-[11px]" style={{ color: "var(--muted)" }}>
                  Tabel lengkap untuk diolah di Google Sheets
                </div>
              </div>
            </div>
            <span className="text-teal-700 font-extrabold text-sm">›</span>
          </button>

          {/* Cetak / Simpan PDF Formal A4 */}
          <button
            type="button"
            onClick={handlePrintPdf}
            className="p-3.5 rounded-2xl flex items-center justify-between border transition-all cursor-pointer text-left hover:border-indigo-300 hover:bg-indigo-50/50"
            style={{
              background: "var(--surface)",
              borderColor: "var(--border)",
            }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                <Printer size={20} />
              </div>
              <div>
                <div className="text-xs font-bold" style={{ color: "var(--navy)" }}>
                  Cetak / Simpan PDF Formal A4
                </div>
                <div className="text-[11px]" style={{ color: "var(--muted)" }}>
                  Tata letak dokumen cetak resmi keluarga
                </div>
              </div>
            </div>
            <span className="text-indigo-700 font-extrabold text-sm">›</span>
          </button>

          {/* Salin Teks Saja */}
          <button
            type="button"
            onClick={handleCopyTextOnly}
            className="p-2.5 rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer mt-1"
          >
            <Copy size={13} />
            <span>Salin Teks ke Clipboard</span>
          </button>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors"
            style={{ background: "var(--s1, #f1f8fd)", color: "var(--navy)" }}
          >
            Tutup
          </button>
        </div>
      </Modal>

      {/* Hidden Offscreen Container for HTML-to-Image Generation */}
      <div
        style={{
          position: "fixed",
          left: "-9999px",
          top: "-9999px",
          pointerEvents: "none",
          zIndex: -1,
        }}
        aria-hidden="true"
      >
        <ReportShareCard ref={cardRef} report={report} familyName={familyName} />
      </div>
    </>
  );
}

