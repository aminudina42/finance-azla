// Test script untuk memverifikasi perbaikan bug reminder pembayaran angsuran kredit baru
import {
  parseDateParts,
  calculateFirstBillDate,
  isDebtNotStartedYet,
  getDebtMonthlyStatus,
} from "../lib/debt-utils.js";

console.log("=== Testing Debt Logic ===");

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${message}`);
    failed++;
  }
}

// User Case:
// 1. Sekarang tgl 19 Nov 2026
// 2. Ajuin pinjaman baru di tgl 18 Nov 2026
// 3. Daftarin pinjaman di tgl 19 Nov 2026
// 4. Atur tagihan tgl 18
// Expected: Tidak ada reminder pembayaran angsuran (status: "not_started", bukan "overdue" atau "due_soon")

const mockDateNow = new Date("2026-11-19T10:00:00");

// Test Case 1: Kasus user persis (daftar tgl 19, ajuin tgl 18, jatuh tempo tgl 18)
const userCaseDebt = {
  id: "debt-user-case",
  name: "Kredit Mobil Baru",
  icon: "car",
  total_amount: 120000000,
  remaining_amount: 120000000,
  monthly_payment: 2500000,
  due_date: 18,
  tenor_months: 48,
  paid_months: 0,
  start_date: "2026-11-18",
  created_at: "2026-11-19T08:30:00.000Z",
  first_bill_date: "2026-12-18",
};

const notStartedCheck1 = isDebtNotStartedYet(userCaseDebt, mockDateNow);
assert(notStartedCheck1.notStarted === true, "User case debt correctly identified as notStarted");

const monthlyStatus1 = getDebtMonthlyStatus(userCaseDebt, [], [], null);
const monthlyStatusDirect = getDebtMonthlyStatus(userCaseDebt, [], [], null);
assert(monthlyStatusDirect.status === "not_started", "getDebtMonthlyStatus directly returns status 'not_started'");
assert(monthlyStatusDirect.label === "Mulai Bulan Depan", "getDebtMonthlyStatus directly returns label 'Mulai Bulan Depan'");
assert(monthlyStatusDirect.detail === "Cicilan ke-1 mulai 18 Des 2026", "getDebtMonthlyStatus directly returns detail 'Cicilan ke-1 mulai 18 Des 2026'");

// Test Case 2: Kasus tanpa first_bill_date (fallback cerdas dari start_date / created_at)
const fallbackDebt = {
  id: "debt-fallback",
  name: "Pinjaman KTA",
  icon: "wallet",
  total_amount: 10000000,
  remaining_amount: 10000000,
  monthly_payment: 1000000,
  due_date: 18,
  tenor_months: 12,
  paid_months: 0,
  start_date: "2026-11-18",
  created_at: "2026-11-19T08:30:00.000Z",
  // no first_bill_date
};
const notStartedCheck2 = isDebtNotStartedYet(fallbackDebt, mockDateNow);
assert(notStartedCheck2.notStarted === true, "Fallback debt (without first_bill_date) auto-detected as notStarted");
assert(notStartedCheck2.firstBillDateStr === "2026-12-18", "Fallback calculated first bill date is next month 2026-12-18");

// Test Case 3: Kasus jika angsuran sudah berjalan dari bulan lalu (paid_months > 0)
const ongoingDebt = {
  id: "debt-ongoing",
  name: "Cicilan Motor",
  icon: "bike",
  total_amount: 20000000,
  remaining_amount: 15000000,
  monthly_payment: 1000000,
  due_date: 18,
  tenor_months: 24,
  paid_months: 5,
  start_date: "2026-06-18",
  created_at: "2026-06-18T08:30:00.000Z",
  first_bill_date: "2026-07-18",
};
const notStartedCheck3 = isDebtNotStartedYet(ongoingDebt, mockDateNow);
assert(notStartedCheck3.notStarted === false, "Ongoing debt with paid_months=5 is NOT not_started");

// Test Case 4: Kasus di bulan berikutnya (Desember 2026) saat jatuh tempo pertama telah tiba
const decemberNow = new Date("2026-12-15T10:00:00");
const notStartedCheckDec = isDebtNotStartedYet(userCaseDebt, decemberNow);
assert(notStartedCheckDec.notStarted === false, "In December, the loan is now active (not notStarted anymore)");

// Test Case 5: calculateFirstBillDate helper
const calcNextMonth = calculateFirstBillDate("2026-11-18", 18, "next_month");
assert(calcNextMonth === "2026-12-18", "calculateFirstBillDate with next_month returns 2026-12-18");

const calcThisMonth = calculateFirstBillDate("2026-11-18", 18, "this_month");
assert(calcThisMonth === "2026-11-18", "calculateFirstBillDate with this_month returns 2026-11-18");

// Year rollover test: Des to Jan
const calcYearRollover = calculateFirstBillDate("2026-12-25", 15, "next_month");
assert(calcYearRollover === "2027-01-15", "Year rollover from Dec to Jan correctly returns 2027-01-15");

// End of month cap test (Jan 31 to Feb)
const calcFebCap = calculateFirstBillDate("2027-01-31", 31, "next_month");
assert(calcFebCap === "2027-02-28", "Feb end of month correctly capped at 2027-02-28");

console.log(`\nResults: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
