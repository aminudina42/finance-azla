"use client";

import React, { useState } from "react";
import {
  getBMIRecommendationDetails,
  BMI_SCIENTIFIC_REFERENCES,
  type BMIRecommendation,
} from "@/lib/health-utils";
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Apple,
  Dumbbell,
  Activity,
  Info,
} from "lucide-react";

interface BMIRecommendationCardProps {
  bmi: number;
  memberName: string;
  relationRole: string;
}

export default function BMIRecommendationCard({
  bmi,
  memberName,
  relationRole,
}: BMIRecommendationCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<"recommendation" | "comparison" | "research">("recommendation");

  const isChild = relationRole === "anak";
  const rec: BMIRecommendation = getBMIRecommendationDetails(bmi || 21.5);

  const getBadgeStyle = (color: string) => {
    switch (color) {
      case "green":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "yellow":
        return "bg-amber-50 text-amber-800 border-amber-200";
      case "red":
        return "bg-red-50 text-red-700 border-red-200";
      default:
        return "bg-blue-50 text-blue-700 border-blue-200";
    }
  };

  return (
    <div
      className="rounded-2xl transition-colors"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
      }}
    >
      {/* 1. Toggle Header Bar */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between gap-3 text-left cursor-pointer hover:bg-slate-50/60 rounded-2xl transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <BookOpen size={18} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-bold text-sm text-slate-900">
                Panduan & Rekomendasi BMI
              </h4>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                Kemenkes RI & WHO
              </span>
            </div>
            <p className="text-xs text-slate-500 truncate mt-0.5">
              {bmi > 0 ? (
                <span>
                  Status {memberName}: <strong className="text-slate-800">{rec.label}</strong> ({bmi} kg/m²) • Klik untuk rekomendasi
                </span>
              ) : (
                "Pelajari target kalori, olahraga, dan standar riset WHO/Kemenkes"
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-xs font-semibold text-blue-600 hidden sm:inline">
            {isExpanded ? "Tutup" : "Buka Rekomendasi"}
          </span>
          <div className="p-1 rounded-lg text-slate-400 bg-slate-50 border border-slate-200">
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </div>
      </button>

      {/* 2. Expanded Content Panel */}
      {isExpanded && (
        <div className="p-4 pt-2 space-y-4">
          {/* Child Disclaimer Banner if relevant */}
          {isChild && (
            <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200 flex items-start gap-2.5">
              <Info size={16} className="text-amber-700 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-900 leading-relaxed">
                <span className="font-bold">Khusus Anak & Balita: </span>
                Sesuai <strong>Permenkes No. 2 Tahun 2020</strong> dan <strong>WHO Child Growth Standards</strong>, status gizi anak di bawah 18 tahun dinilai menggunakan kurva persentil Z-score (IMT menurut Umur / IMT/U), bukan tabel statis dewasa. Panduan di bawah dapat menjadi wawasan pola makan gizi seimbang keluarga.
              </div>
            </div>
          )}

          {/* Sub-Tab Navigation Bar */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab("recommendation")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                activeTab === "recommendation"
                  ? "bg-white text-blue-600 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <TrendingUp size={13} />
              <span>Rekomendasi Personal</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("comparison")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                activeTab === "comparison"
                  ? "bg-white text-blue-600 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <FileText size={13} />
              <span>Tabel Standar</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("research")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                activeTab === "research"
                  ? "bg-white text-blue-600 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Activity size={13} />
              <span>Dasar Penelitian</span>
            </button>
          </div>

          {/* TAB 1: REKOMENDASI PERSONAL */}
          {activeTab === "recommendation" && (
            <div className="space-y-3.5">
              {/* Highlight Focus Card */}
              <div
                className="p-3.5 rounded-xl border"
                style={{
                  background: "var(--s1, #f1f8fd)",
                  borderColor: "var(--border, #d8eaf8)",
                }}
              >
                <div className="flex items-center justify-between gap-2 flex-wrap mb-1.5">
                  <span className="text-xs font-bold text-slate-800">
                    Target untuk {memberName} ({rec.bmiRangeText})
                  </span>
                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${getBadgeStyle(
                      rec.badgeColor
                    )}`}
                  >
                    {rec.label}
                  </span>
                </div>
                <h5 className="text-sm font-bold text-slate-900 mb-1">
                  {rec.focusTitle}
                </h5>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {rec.focusSummary}
                </p>
              </div>

              {/* Advice Columns Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Nutrisi */}
                <div className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-2">
                  <div className="flex items-center gap-2 text-rose-600 font-bold text-xs">
                    <Apple size={15} />
                    <span>Pola Makan & Nutrisi</span>
                  </div>
                  <ul className="space-y-1.5 text-xs text-slate-600">
                    {rec.nutritionAdvice.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <CheckCircle2 size={13} className="text-emerald-500 shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Olahraga */}
                <div className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-2">
                  <div className="flex items-center gap-2 text-blue-600 font-bold text-xs">
                    <Dumbbell size={15} />
                    <span>Latihan Fisik & Olahraga</span>
                  </div>
                  <ul className="space-y-1.5 text-xs text-slate-600">
                    {rec.exerciseAdvice.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <CheckCircle2 size={13} className="text-emerald-500 shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Gaya Hidup */}
                <div className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-2">
                  <div className="flex items-center gap-2 text-teal-600 font-bold text-xs">
                    <Activity size={15} />
                    <span>Gaya Hidup & Pemantauan</span>
                  </div>
                  <ul className="space-y-1.5 text-xs text-slate-600">
                    {rec.lifestyleAdvice.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <CheckCircle2 size={13} className="text-emerald-500 shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Warning note if available */}
              {rec.warningNote && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2">
                  <AlertTriangle size={15} className="text-red-600 shrink-0 mt-0.5" />
                  <span className="text-xs text-red-800 font-medium">
                    {rec.warningNote}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: TABEL PERBANDINGAN STANDAR */}
          {activeTab === "comparison" && (
            <div data-ui="table" className="space-y-3">
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold">
                      <th className="p-2.5">Kategori Status</th>
                      <th className="p-2.5">
                        Kemenkes RI & WHO Asia-Pasifik
                        <span className="block text-[10px] font-normal text-slate-500">
                          (Digunakan di CatatKeluarga)
                        </span>
                      </th>
                      <th className="p-2.5">
                        WHO Internasional
                        <span className="block text-[10px] font-normal text-slate-500">
                          (Standar Barat / Kaukasia)
                        </span>
                      </th>
                      <th className="p-2.5">Tingkat Risiko Penyakit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Underweight */}
                    <tr className={rec.status === "underweight" ? "bg-blue-50/70 font-semibold" : ""}>
                      <td className="p-2.5 font-bold text-slate-800">
                        Kekurangan Berat (Underweight)
                      </td>
                      <td className="p-2.5 text-blue-700 font-bold">&lt; 18.5 kg/m²</td>
                      <td className="p-2.5 text-slate-600">&lt; 18.5 kg/m²</td>
                      <td className="p-2.5 text-slate-600">Meningkat (Malnutrisi, Imunitas Rendah)</td>
                    </tr>

                    {/* Normal */}
                    <tr className={rec.status === "normal" ? "bg-emerald-50/70 font-semibold" : ""}>
                      <td className="p-2.5 font-bold text-slate-800">
                        Normal / Berat Sehat
                      </td>
                      <td className="p-2.5 text-emerald-700 font-bold">18.5 – 22.9 kg/m²</td>
                      <td className="p-2.5 text-slate-600">18.5 – 24.9 kg/m²</td>
                      <td className="p-2.5 text-emerald-700 font-medium">Rendah (Optimal)</td>
                    </tr>

                    {/* Overweight */}
                    <tr className={rec.status === "overweight" ? "bg-amber-50/70 font-semibold" : ""}>
                      <td className="p-2.5 font-bold text-slate-800">
                        Kelebihan Berat (Overweight)
                      </td>
                      <td className="p-2.5 text-amber-800 font-bold">23.0 – 24.9 kg/m²</td>
                      <td className="p-2.5 text-slate-600">25.0 – 29.9 kg/m²</td>
                      <td className="p-2.5 text-amber-800 font-medium">Meningkat (Waspada Pre-Diabetes)</td>
                    </tr>

                    {/* Obesitas I */}
                    <tr className={rec.status === "obese" ? "bg-red-50/70 font-semibold" : ""}>
                      <td className="p-2.5 font-bold text-slate-800">
                        Obesitas Tingkat 1
                      </td>
                      <td className="p-2.5 text-red-700 font-bold">25.0 – 29.9 kg/m² (Kemenkes: 25.1–27)</td>
                      <td className="p-2.5 text-slate-600">30.0 – 34.9 kg/m²</td>
                      <td className="p-2.5 text-red-700 font-medium">Tinggi (Hipertensi, Kolesterol)</td>
                    </tr>

                    {/* Obesitas II */}
                    <tr className={rec.status === "obese" && bmi >= 30 ? "bg-red-100/70 font-semibold" : ""}>
                      <td className="p-2.5 font-bold text-slate-800">
                        Obesitas Tingkat 2 (Berat)
                      </td>
                      <td className="p-2.5 text-red-800 font-bold">≥ 30.0 kg/m² (Kemenkes: &gt; 27.0)</td>
                      <td className="p-2.5 text-slate-600">≥ 35.0 kg/m²</td>
                      <td className="p-2.5 text-red-800 font-bold">Sangat Tinggi (Jantung Koroner)</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 leading-relaxed">
                <span className="font-bold text-slate-800">Catatan Klinis: </span>
                Baris yang disorot dengan warna merupakan status BMI aktif Anda saat ini. CatatKeluarga menggunakan batas ambang **Asia-Pasifik** karena telah disahkan Kemenkes RI sebagai acuan medis yang paling tepat melindungi masyarakat Indonesia.
              </div>
            </div>
          )}

          {/* TAB 3: DASAR PENELITIAN & REFERENSI ILMIAH */}
          {activeTab === "research" && (
            <div className="space-y-3.5">
              {/* Mengapa Berbeda */}
              <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-200 space-y-1.5">
                <h5 className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                  <Info size={14} className="text-blue-600" />
                  Mengapa Standar Asia-Pasifik Berbeda dari Standar Barat?
                </h5>
                <p className="text-xs text-blue-900 leading-relaxed">
                  Penelitian klinis multisenter internasional menemukan bahwa <strong>populasi Asia (termasuk Indonesia) memiliki persentase lemak tubuh (body fat percentage) dan akumulasi lemak visceral (lemak perut) yang lebih tinggi</strong> dibanding populasi Kaukasia pada angka BMI yang sama.
                </p>
                <p className="text-xs text-blue-900 leading-relaxed">
                  Akibatnya, orang Indonesia dengan <strong>BMI 23.0 kg/m²</strong> sudah memiliki risiko terkena diabetes melitus tipe 2 dan penyakit kardiovaskular yang setara dengan orang Barat pada <strong>BMI 25.0 kg/m²</strong>. Oleh sebab itu, ambang batas normal diturunkan menjadi 18.5 – 22.9 kg/m².
                </p>
              </div>

              {/* Daftar Jurnal & Regulasi Resmi */}
              <div className="space-y-2.5">
                <span className="text-xs font-bold text-slate-900 block">
                  Daftar Penelitian & Dasar Hukum Resmi:
                </span>

                <div className="space-y-2">
                  {BMI_SCIENTIFIC_REFERENCES.map((ref) => (
                    <div
                      key={ref.id}
                      className="p-3 rounded-xl bg-white border border-slate-200 space-y-1"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h6 className="font-bold text-xs text-slate-900">
                          {ref.title}
                        </h6>
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 shrink-0">
                          {ref.year}
                        </span>
                      </div>

                      <p className="text-[11px] font-medium text-blue-700">
                        {ref.authorOrSource} • {ref.publication}
                      </p>

                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        {ref.keyFinding}
                      </p>

                      <div className="text-[10px] text-slate-500 pt-0.5">
                        Referensi Dokumen: {ref.doiOrDocNumber}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
