import assert from "node:assert/strict";
import {
  formatGoldGram,
  parseGoldInput,
  sanitizeGoldInputString,
  calculateNextGoldBalance,
  roundGoldGram,
} from "../lib/saku-utils.ts";

let passed = 0;

function test(name, fn) {
  fn();
  passed += 1;
  console.log(`  [PASS] ${name}`);
}

console.log("Running Saku Emas unit tests...\n");

test("TC-SE-01: Format berat emas < 1.000 gr tanpa trailing zero", () => {
  assert.equal(formatGoldGram(0), "0 gr");
  assert.equal(formatGoldGram(0.5), "0,5 gr");
  assert.equal(formatGoldGram(2.25), "2,25 gr");
  assert.equal(formatGoldGram(0.0005), "0,0005 gr");
  assert.equal(formatGoldGram(10.5000), "10,5 gr");
});

test("TC-SE-02: Format berat emas >= 1.000 gr tetap gram (tidak dikonversi ke kg)", () => {
  assert.equal(formatGoldGram(1000), "1.000 gr");
  assert.equal(formatGoldGram(1250.5), "1.250,5 gr");
  assert.equal(formatGoldGram(10000.0125), "10.000,0125 gr");
  assert.equal(formatGoldGram(2500).includes("kg"), false);
});

test("TC-SE-03: Bebas floating-point drift pada penjumlahan desimal (0.1 + 0.2)", () => {
  const res = calculateNextGoldBalance(0.1, "in", 0.2);
  assert.equal(res.ok, true);
  if (res.ok) {
    assert.equal(res.nextBalance, 0.3);
    assert.equal(formatGoldGram(res.nextBalance), "0,3 gr");
  }
});

test("TC-SE-04: Pengeluaran emas tepat menghabiskan saldo ke 0", () => {
  const res = calculateNextGoldBalance(1.25, "out", 1.25);
  assert.equal(res.ok, true);
  if (res.ok) {
    assert.equal(res.nextBalance, 0);
  }
});

test("TC-SE-05: Pengeluaran emas melebihi saldo ditolak (tidak boleh defisit)", () => {
  const res = calculateNextGoldBalance(0.5, "out", 0.5001);
  assert.equal(res.ok, false);
  if (!res.ok) {
    assert.match(res.error, /tidak mencukupi/i);
  }
});

test("TC-SE-06: Input nol, negatif, atau invalid ditolak", () => {
  assert.equal(parseGoldInput(""), 0);
  assert.equal(parseGoldInput("0"), 0);
  assert.equal(parseGoldInput("-1.5"), 0);
  assert.equal(parseGoldInput("abc"), 0);

  const resZero = calculateNextGoldBalance(1, "in", 0);
  assert.equal(resZero.ok, false);

  const resNeg = calculateNextGoldBalance(1, "out", -0.5);
  assert.equal(resNeg.ok, false);
});

test("Parse & sanitize input lokal Indonesia & internasional (maks 4 desimal)", () => {
  assert.equal(sanitizeGoldInputString("0.052599"), "0,0525");
  assert.equal(sanitizeGoldInputString("0012,5"), "12,5");
  assert.equal(sanitizeGoldInputString(",75"), "0,75");
  assert.equal(parseGoldInput("0,5"), 0.5);
  assert.equal(parseGoldInput("1.250,25"), 1250.25);
  assert.equal(parseGoldInput("1250.25"), 1250.25);
  assert.equal(roundGoldGram(0.123456), 0.1235);
});

console.log(`\nAll ${passed} tests passed!`);
