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
 * WHO Asia-Pacific Standard
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

