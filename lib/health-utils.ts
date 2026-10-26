/**
 * Utilities & Clinical Interpretation Helpers for Health Tracking Module
 * CatatKeluarga (finance-azla)
 */

import type { HealthGender, HealthBloodType } from "./types";

/**
 * Sanitize decimal number from user input string (handling comma vs dot)
 */
export function sanitizeDecimalInput(val: string | number): number {
  if (typeof val === "number") return val;
  if (!val) return 0;
  // Replace comma with dot and trim
  const cleanStr = String(val).replace(/,/g, ".").trim();
  const parsed = parseFloat(cleanStr);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Calculate detailed age in years, months, days, with premature corrected age if applicable
 */
export function calculateDetailedAge(
  birthDateStr: string,
  targetDateStr?: string,
  isPremature?: boolean,
  gestationalWeeks?: number | null
) {
  if (!birthDateStr) {
    return {
      years: 0,
      months: 0,
      days: 0,
      totalMonths: 0,
      formatted: "-",
      correctedFormatted: null,
    };
  }

  const birth = new Date(birthDateStr);
  const target = targetDateStr ? new Date(targetDateStr) : new Date();

  let years = target.getFullYear() - birth.getFullYear();
  let months = target.getMonth() - birth.getMonth();
  let days = target.getDate() - birth.getDate();

  if (days < 0) {
    months -= 1;
    const prevMonthLastDay = new Date(target.getFullYear(), target.getMonth(), 0).getDate();
    days += prevMonthLastDay;
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }

  const totalMonths = Math.max(0, years * 12 + months);

  let formatted = "";
  if (years > 0) {
    formatted = `${years} thn ${months} bln`;
  } else if (months > 0) {
    formatted = `${months} bln ${days} hr`;
  } else {
    formatted = `${days} hari`;
  }

  // Usia Koreksi untuk bayi prematur (< 37 minggu) hingga usia 2 tahun (24 bulan)
  let correctedFormatted: string | null = null;
  if (isPremature && gestationalWeeks && gestationalWeeks < 37 && totalMonths < 24) {
    const weeksPremature = 40 - gestationalWeeks;
    const daysPremature = weeksPremature * 7;
    const correctedTargetDate = new Date(target.getTime() - daysPremature * 24 * 60 * 60 * 1000);
    
    let cYears = correctedTargetDate.getFullYear() - birth.getFullYear();
    let cMonths = correctedTargetDate.getMonth() - birth.getMonth();
    let cDays = correctedTargetDate.getDate() - birth.getDate();

    if (cDays < 0) {
      cMonths -= 1;
      const prevMonthLastDay = new Date(correctedTargetDate.getFullYear(), correctedTargetDate.getMonth(), 0).getDate();
      cDays += prevMonthLastDay;
    }
    if (cMonths < 0) {
      cYears -= 1;
      cMonths += 12;
    }

    if (cYears > 0) {
      correctedFormatted = `${cYears} thn ${cMonths} bln`;
    } else if (cMonths > 0) {
      correctedFormatted = `${cMonths} bln ${cDays} hr`;
    } else {
      correctedFormatted = `${Math.max(0, cDays)} hari`;
    }
  }

  return {
    years,
    months,
    days,
    totalMonths,
    formatted,
    correctedFormatted,
  };
}

export interface StatusBadge {
  label: string;
  color: "green" | "yellow" | "orange" | "red" | "blue";
  desc: string;
  isCrisis?: boolean;
}

/**
 * Interpret Blood Pressure (Tensi Darah)
 * AHA / Indonesian Society of Hypertension (InaSH) Standard
 */
export function getBloodPressureStatus(systolic: number, diastolic: number): StatusBadge {
  if (!systolic || !diastolic) {
    return { label: "-", color: "blue", desc: "Data belum lengkap" };
  }

  // Krisis Hipertensi
  if (systolic >= 180 || diastolic >= 120) {
    return {
      label: "Krisis Hipertensi",
      color: "red",
      desc: "Tekanan sangat tinggi! Segera hubungi faskes/dokter.",
      isCrisis: true,
    };
  }

  // Hipotensi (Tensi Rendah)
  if (systolic < 90 || diastolic < 60) {
    return {
      label: "Tensi Rendah",
      color: "blue",
      desc: "Di bawah batas normal (< 90/60 mmHg).",
    };
  }

  // Hipertensi Derajat 2
  if (systolic >= 140 || diastolic >= 90) {
    return {
      label: "Hipertensi",
      color: "red",
      desc: "Tinggi (≥ 140/90 mmHg). Perhatikan pola makan & konsultasi dokter.",
    };
  }

  // Pra-Hipertensi / Waspada
  if ((systolic >= 120 && systolic <= 139) || (diastolic >= 80 && diastolic <= 89)) {
    return {
      label: "Pra-Hipertensi",
      color: "yellow",
      desc: "Sedikit di atas optimal. Jaga konsumsi garam & istirahat.",
    };
  }

  // Normal / Optimal
  return {
    label: "Normal",
    color: "green",
    desc: "Tekanan darah optimal (< 120/80 mmHg).",
  };
}

/**
 * Interpret Blood Sugar (Gula Darah)
 * PERKENI / ADA Standard (mg/dL)
 */
export function getBloodSugarStatus(
  value: number,
  category: "fasting" | "postprandial" | "random" | "hba1c"
): StatusBadge {
  if (!value) return { label: "-", color: "blue", desc: "-" };

  // Hipoglikemia akut
  if (category !== "hba1c" && value < 70) {
    return {
      label: "Hipoglikemia",
      color: "red",
      desc: "Gula darah terlalu rendah (< 70 mg/dL). Butuh asupan glukosa segera.",
      isCrisis: value < 55,
    };
  }

  if (category === "hba1c") {
    if (value >= 6.5) {
      return { label: "Diabetes", color: "red", desc: "HbA1c ≥ 6.5%" };
    }
    if (value >= 5.7) {
      return { label: "Prediabetes", color: "yellow", desc: "HbA1c 5.7 - 6.4%" };
    }
    return { label: "Normal", color: "green", desc: "HbA1c < 5.7%" };
  }

  if (category === "fasting") {
    // Puasa minimal 8 jam
    if (value >= 126) {
      return { label: "Tinggi (Diabetes)", color: "red", desc: "GDP ≥ 126 mg/dL" };
    }
    if (value >= 100) {
      return { label: "Prediabetes", color: "yellow", desc: "GDP 100 - 125 mg/dL" };
    }
    return { label: "Normal", color: "green", desc: "GDP 70 - 99 mg/dL" };
  }

  // Sewaktu (Random) atau 2 Jam PP (Postprandial)
  if (value >= 200) {
    return { label: "Tinggi (Diabetes)", color: "red", desc: "Gula darah ≥ 200 mg/dL" };
  }
  if (value >= 140) {
    return { label: "Toleransi Terganggu", color: "yellow", desc: "Gula darah 140 - 199 mg/dL" };
  }
  return { label: "Normal", color: "green", desc: "Gula darah < 140 mg/dL" };
}

/**
 * Interpret Total Cholesterol (mg/dL)
 */
export function getCholesterolStatus(totalCholesterol: number): StatusBadge {
  if (!totalCholesterol) return { label: "-", color: "blue", desc: "-" };
  if (totalCholesterol >= 240) {
    return { label: "Tinggi", color: "red", desc: "Kolesterol total ≥ 240 mg/dL" };
  }
  if (totalCholesterol >= 200) {
    return { label: "Batas Tinggi", color: "yellow", desc: "Kolesterol total 200 - 239 mg/dL" };
  }
  return { label: "Optimal", color: "green", desc: "Kolesterol total < 200 mg/dL" };
}

/**
 * Interpret Uric Acid (Asam Urat in mg/dL)
 */
export function getUricAcidStatus(value: number, gender: HealthGender = "male"): StatusBadge {
  if (!value) return { label: "-", color: "blue", desc: "-" };
  const maxNormal = gender === "female" ? 6.0 : 7.0;

  if (value > maxNormal) {
    return {
      label: "Tinggi",
      color: "red",
      desc: `Di atas normal (> ${maxNormal} mg/dL). Batasi makanan tinggi purin.`,
    };
  }
  return { label: "Normal", color: "green", desc: `Dalam batas normal (≤ ${maxNormal} mg/dL)` };
}

/**
 * Calculate Body Mass Index (BMI) for Adult (kg/m²)
 * WHO Asia-Pacific Standard & Kemenkes RI
 */
export function getBMICalculation(weightKg: number, heightCm: number): {
  bmi: number;
  badge: StatusBadge;
} {
  if (!weightKg || !heightCm || heightCm <= 0) {
    return { bmi: 0, badge: { label: "-", color: "blue", desc: "-" } };
  }

  const heightM = heightCm / 100;
  const bmi = parseFloat((weightKg / (heightM * heightM)).toFixed(1));

  if (bmi < 18.5) {
    return {
      bmi,
      badge: { label: "Kurang (Underweight)", color: "blue", desc: "BMI < 18.5" },
    };
  }
  if (bmi <= 22.9) {
    return {
      bmi,
      badge: { label: "Normal (Ideal)", color: "green", desc: "BMI 18.5 - 22.9" },
    };
  }
  if (bmi <= 24.9) {
    return {
      bmi,
      badge: { label: "Kelebihan (Overweight)", color: "yellow", desc: "BMI 23.0 - 24.9" },
    };
  }
  return {
    bmi,
    badge: { label: "Obesitas", color: "red", desc: "BMI ≥ 25.0" },
  };
}

export interface BMIRecommendation {
  status: "underweight" | "normal" | "overweight" | "obese";
  label: string;
  badgeColor: "blue" | "green" | "yellow" | "red";
  bmiRangeText: string;
  focusTitle: string;
  focusSummary: string;
  nutritionAdvice: string[];
  exerciseAdvice: string[];
  lifestyleAdvice: string[];
  warningNote?: string;
}

export interface BMIScientificReference {
  id: string;
  title: string;
  authorOrSource: string;
  year: number;
  publication: string;
  doiOrDocNumber: string;
  keyFinding: string;
}

export const BMI_SCIENTIFIC_REFERENCES: BMIScientificReference[] = [
  {
    id: "lancet-2004",
    title: "Appropriate body-mass index for Asian populations and its implications for policy and intervention strategies",
    authorOrSource: "WHO Expert Consultation",
    year: 2004,
    publication: "The Lancet, Vol. 363 (9403), hal. 157–163",
    doiOrDocNumber: "DOI: 10.1016/S0140-6736(03)15268-3",
    keyFinding: "Masyarakat Asia memiliki persentase lemak tubuh (body fat) dan akumulasi lemak visceral yang lebih tinggi pada angka BMI yang sama dibanding populasi Kaukasia. Risiko diabetes melitus tipe 2 dan penyakit kardiovaskular pada orang Asia meningkat signifikan mulai dari BMI 23.0 kg/m².",
  },
  {
    id: "kemenkes-permenkes-41-2014",
    title: "Pedoman Gizi Seimbang & Pencegahan Obesitas",
    authorOrSource: "Kementerian Kesehatan Republik Indonesia",
    year: 2014,
    publication: "Peraturan Menteri Kesehatan RI No. 41 Tahun 2014",
    doiOrDocNumber: "Berita Negara RI Tahun 2014 No. 1110",
    keyFinding: "Kemenkes RI mengadopsi klasifikasi BMI nasional yang diselaraskan dengan cut-off Asia-Pasifik: Kurus (< 18.5), Normal (18.5–22.9 Asia-Pasifik / maks 25.0), Berat Badan Lebih (23.0–24.9), dan Obesitas (≥ 25.0 Asia-Pasifik / ≥ 27.0 klasifikasi konvensional).",
  },
  {
    id: "wpro-iaso-2000",
    title: "The Asia-Pacific perspective: Redefining obesity and its treatment",
    authorOrSource: "WHO Western Pacific Region & International Association for the Study of Obesity (IASO)",
    year: 2000,
    publication: "International Obesity Task Force (IOTF)",
    doiOrDocNumber: "ISBN 0-9577082-1-1",
    keyFinding: "Konsultasi ilmiah regional menetapkan cut-off BMI khusus populasi Asia guna mendeteksi sindrom metabolik lebih dini sebelum timbul komplikasi aterosklerosis dan hipertensi.",
  },
  {
    id: "kemenkes-permenkes-2-2020",
    title: "Standar Antropometri Anak",
    authorOrSource: "Kementerian Kesehatan Republik Indonesia",
    year: 2020,
    publication: "Peraturan Menteri Kesehatan RI No. 2 Tahun 2020",
    doiOrDocNumber: "Berita Negara RI Tahun 2020 No. 142",
    keyFinding: "Untuk anak dan balita (0–18 tahun), status gizi dinilai berdasarkan standar pertumbuhan WHO Child Growth Standards 2006 menggunakan Z-score IMT/U (Indeks Massa Tubuh menurut Umur), bukan menggunakan tabel BMI orang dewasa.",
  },
];

export function getBMIRecommendationDetails(bmi: number): BMIRecommendation {
  if (bmi < 18.5) {
    return {
      status: "underweight",
      label: "Kurang (Underweight)",
      badgeColor: "blue",
      bmiRangeText: "< 18.5 kg/m²",
      focusTitle: "Prioritas: Peningkatan Massa Otot & Asupan Kalori Padat Nutrisi",
      focusSummary: "Berat badan Anda berada di bawah rentang sehat. Prioritaskan peningkatan massa otot melalui surplus kalori padat nutrisi dan latihan kekuatan, bukan sekadar menumpuk lemak jenuh.",
      nutritionAdvice: [
        "Terapkan surplus kalori terukur: Tambahkan +300 hingga +500 kkal/hari di atas kebutuhan kalori pemeliharaan (TDEE).",
        "Tingkatkan asupan protein berkualitas (1.2 – 1.6 gram/kg BB/hari) dari telur, dada ayam, ikan, tempe, tahu, atau susu tinggi protein.",
        "Pilih lemak sehat padat kalori: Konsumsi alpukat, kacang almond, minyak zaitun, dan biji-bijian sebagai camilan bergizi.",
        "Makan lebih sering dalam porsi sedang: 3 kali makan utama ditambah 2-3 kali camilan padat nutrisi.",
      ],
      exerciseAdvice: [
        "Fokus pada latihan beban / resistensi (resistance training) 2-3 kali seminggu untuk menstimulasi hipertrofi otot (bukan lemak perut).",
        "Lakukan gerakan gabungan (compound movements) seperti squat, push-up, dumbbell row, atau latihan beban bertahap.",
        "Batasi kardio berdurasi sangat panjang (seperti lari maraton) yang membakar banyak simpanan kalori yang dibutuhkan untuk pembentukan massa tubuh.",
      ],
      lifestyleAdvice: [
        "Tidur cukup 7–8 jam setiap malam untuk mendukung pelepasan hormon pertumbuhan (growth hormone) dan pemulihan jaringan otot.",
        "Periksakan diri ke dokter/faskes jika berat badan sulit naik untuk skrining malabsorpsi nutrisi, hipertiroid, atau anemia.",
      ],
      warningNote: "Hindari makanan cepat saji (junk food) tinggi gula dan minyak trans untuk menaikkan berat badan karena memicu risiko penyakit metabolik meskipun tubuh terlihat kurus (Skinny Fat).",
    };
  }

  if (bmi <= 22.9) {
    return {
      status: "normal",
      label: "Normal / Ideal (Asia-Pasifik)",
      badgeColor: "green",
      bmiRangeText: "18.5 – 22.9 kg/m²",
      focusTitle: "Prioritas: Pertahankan Komposisi Tubuh Seimbang & Jaga Lingkar Pinggang",
      focusSummary: "Selamat! Berat badan Anda berada dalam batas optimal menurut standar Kemenkes RI & WHO Asia-Pasifik. Pertahankan pola makan seimbang dan gaya hidup aktif.",
      nutritionAdvice: [
        "Terapkan pedoman 'Isi Piringku' Kemenkes RI: 1/2 piring sayur dan buah, 1/4 piring karbohidrat kompleks, 1/4 piring lauk protein.",
        "Kendalikan konsumsi GGL harian (Gula maks 4 sendok makan, Garam maks 1 sendok teh, Lemak maks 5 sendok makan per hari).",
        "Jaga hidrasi tubuh dengan minum air putih minimal 2 liter (8 gelas) sehari.",
      ],
      exerciseAdvice: [
        "Latihan kardio aerobik moderat minimal 150 menit per minggu (jalan cepat, lari santai, bersepeda, berenang 30 menit x 5 hari).",
        "Latihan kekuatan otot 2 hari seminggu untuk mempertahankan massa otot dan kepadatan tulang seiring bertambahnya usia.",
      ],
      lifestyleAdvice: [
        "Pantau lingkar pinggang secara berkala (Pria < 90 cm, Wanita < 80 cm) untuk memastikan tidak terjadi penumpukan lemak visceral di perut (visceral adiposity).",
        "Lakukan cek kesehatan berkala (tekanan darah, gula darah puasa, dan profil lipid).",
      ],
    };
  }

  if (bmi <= 24.9) {
    return {
      status: "overweight",
      label: "Kelebihan Berat Badan (Overweight)",
      badgeColor: "yellow",
      bmiRangeText: "23.0 – 24.9 kg/m²",
      focusTitle: "Prioritas: Defisit Kalori Ringan, Pengurangan Lemak Visceral & Batasi Gula",
      focusSummary: "Pada standar Asia-Pasifik, BMI 23.0 ke atas sudah mulai meningkatkan risiko resistensi insulin dan hipertensi. Intervensi gaya hidup sejak dini sangat efektif mencegah pergeseran ke obesitas.",
      nutritionAdvice: [
        "Terapkan defisit kalori moderat: Kurangi 300 – 500 kkal/hari dari asupan harian untuk penurunan berat badan bertahap (0.5 kg per minggu).",
        "Hindari minuman manis kemasan (MBDK), kopi susu bergula, boba, soda, dan kue-kue manis.",
        "Perbanyak konsumsi serat larut air (sayuran hijau, apel, oatmeal) untuk memperlambat penyerapan glukosa dan memberikan rasa kenyang lebih lama.",
        "Ganti karbohidrat sederhana dengan karbohidrat kompleks (beras merah/cokelat, kentang kukus dengan kulit, ubi).",
      ],
      exerciseAdvice: [
        "Tingkatkan aktivitas fisik harian (NEAT): Targetkan minimal 8.000 hingga 10.000 langkah per hari.",
        "Latihan kardio 3–4 kali seminggu (30–45 menit per sesi) dikombinasikan dengan latihan beban untuk mempertahankan massa otot saat defisit kalori.",
      ],
      lifestyleAdvice: [
        "Hindari makan berat kurang dari 2–3 jam sebelum tidur malam.",
        "Kelola stres dan hindari makan emosional (emotional eating), karena hormon kortisol memicu penimbunan lemak visceral di perut.",
      ],
      warningNote: "Meskipun pada standar Barat (Kaukasia) BMI 24 dianggap normal, riset The Lancet (2004) membuktikan bahwa bagi orang Indonesia/Asia, BMI 23.0 ke atas sudah memerlukan perhatian aktif.",
    };
  }

  return {
    status: "obese",
    label: "Obesitas",
    badgeColor: "red",
    bmiRangeText: "≥ 25.0 kg/m² (≥ 27.0 Kemenkes Konvensional)",
    focusTitle: "Prioritas: Penurunan Lemak Bertahap, Olahraga Sendi Rendah & Skrining Biomarker",
    focusSummary: "Kategori obesitas memiliki korelasi kuat dengan risiko diabetes melitus tipe 2, hipertensi, perlemakan hati (fatty liver), dan penyakit jantung koroner. Penurunan 5–10% berat badan sudah memberikan manfaat klinis besar.",
    nutritionAdvice: [
      "Target penurunan realistis: Turunkan 5% hingga 10% dari berat badan awal dalam kurun waktu 3 hingga 6 bulan secara konsisten.",
      "Terapkan diet seimbang rendah kalori dengan bimbingan dokter atau ahli gizi; hindari diet ekstrem (crash diet) yang berisiko efek yoyo.",
      "Kurangi porsi karbohidrat dan gantikan separuh piring dengan sayuran berserat tinggi dan sumber protein tanpa lemak.",
      "Kurangi drastis gorengan, makanan bersantan kental, serta daging berlemak tinggi.",
    ],
    exerciseAdvice: [
      "Mulai dengan olahraga berintensitas rendah hingga moderat yang ramah persendian (low-impact) seperti jalan santai di permukaan rata, sepeda statis, atau berenang (30-45 menit, 4-5 kali seminggu).",
      "Lindungi persendian lutut dan pergelangan kaki dari cedera; jangan langsung melakukan olahraga lompat atau lari cepat.",
      "Tingkatkan durasi latihan secara bertahap sebelum menaikkan intensitas.",
    ],
    lifestyleAdvice: [
      "Lakukan pemeriksaan laboratorium berkala di faskes: Gula Darah Puasa, HbA1c, Kolesterol Total, LDL, HDL, dan Trigliserida.",
      "Perhatikan kualitas tidur; waspadai gejala mendengkur berat atau sleep apnea yang sering menyertai obesitas.",
      "Libatkan pasangan atau keluarga dalam komitmen makan sehat bersama di rumah.",
    ],
    warningNote: "Konsultasikan dengan dokter sebelum memulai program olahraga intensif jika memiliki riwayat keluhan dada berdebar, nyeri sendi lutut, atau hipertensi di atas 140/90 mmHg.",
  };
}

/**
 * Common active ingredients lookup to catch brand-name medicine allergy
 */
const MEDICINE_ALIAS_MAP: Record<string, string[]> = {
  paracetamol: ["tempra", "sanmol", "pamol", "panadol", "biogesic", "dumin", "bodrexin", "ottopan"],
  amoxicillin: ["amoxan", "hiconcil", "augmentin", "claneksi", "amoksisilin"],
  ibuprofen: ["proris", "bufect", "fenris", "arbupon"],
  asam_mefenamat: ["ponstan", "mefinal", "mefentan"],
  cefixime: ["cefspan", "spancef", "cefixstar"],
  cetirizine: ["ryvel", "cerini", "ozen", "cetirizina"],
};

/**
 * Check if medicine name conflicts with patient allergies
 */
export function checkAllergyRisk(medicineName: string, allergies: string[]): string | null {
  if (!medicineName || !allergies || allergies.length === 0) return null;

  const medLower = medicineName.toLowerCase();

  for (const allergy of allergies) {
    const allergyLower = allergy.toLowerCase().trim();
    if (!allergyLower) continue;

    // Direct match
    if (medLower.includes(allergyLower) || allergyLower.includes(medLower)) {
      return allergy;
    }

    // Check alias dictionary
    for (const [generic, brands] of Object.entries(MEDICINE_ALIAS_MAP)) {
      if (allergyLower.includes(generic.replace("_", " "))) {
        for (const brand of brands) {
          if (medLower.includes(brand)) {
            return `${allergy} (terkandung dalam ${brand})`;
          }
        }
      }
    }
  }

  return null;
}

