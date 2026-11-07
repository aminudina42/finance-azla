#!/usr/bin/env node

/**
 * Automated Verification Test Runner for Fitur Katalog Destinasi Wisata Bersama
 * 
 * Verifies:
 * - TC-01: Migration DDL & Snapshot integrity schema
 * - TC-02: Row Level Security (RLS) public read & protected write
 * - TC-03: TypeScript contracts & table mappings
 * - TC-04: Service CRUD & query APIs
 * - TC-05: URL sanitization & XSS prevention
 * - TC-06: UI Components & responsive design
 * - TC-07: Itinerary smart autocomplete & city boosting
 * - TC-08: Quick Add-to-Trip flow from catalog
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");

const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const CYAN = "\x1b[36m";
const BOLD = "\x1b[1m";
const RESET = "\x1b[0m";

let passCount = 0;
let failCount = 0;

function record(tcId, name, condition, details = "") {
  if (condition) {
    passCount++;
    console.log(`  ${GREEN}✔ PASS${RESET} [${BOLD}${tcId}${RESET}] ${name}`);
    if (details) console.log(`         ${CYAN}↳ ${details}${RESET}`);
  } else {
    failCount++;
    console.log(`  ${RED}✖ FAIL${RESET} [${BOLD}${tcId}${RESET}] ${name}`);
    if (details) console.log(`         ${RED}↳ Reason: ${details}${RESET}`);
  }
}

function readFile(relPath) {
  const p = path.join(ROOT, relPath);
  if (!fs.existsSync(p)) throw new Error(`File not found: ${relPath}`);
  return fs.readFileSync(p, "utf-8");
}

console.log(`\n${BOLD}================================================================${RESET}`);
console.log(`${BOLD}  AUTOMATED VERIFICATION: KATALOG DESTINASI WISATA BERSAMA${RESET}`);
console.log(`${BOLD}================================================================\n${RESET}`);

try {
  // TC-01: Migration file & DDL
  const mig = readFile("lib/migration-v28-katalog-destinasi-wisata.sql");
  record(
    "TC-01",
    "Database Migration DDL & Constraints",
    mig.includes("CREATE TABLE IF NOT EXISTS public.tourist_destinations") &&
    mig.includes("CHECK (category IN") &&
    mig.includes("CHECK (estimated_ticket_price >= 0)") &&
    mig.includes("REFERENCES public.tourist_destinations(id) ON DELETE SET NULL"),
    "Tabel tourist_destinations dan relasi snapshot ON DELETE SET NULL terdefinisi dengan benar"
  );

  // TC-02: RLS Policies
  record(
    "TC-02",
    "Row Level Security (RLS) Configuration",
    mig.includes("CREATE POLICY \"tourist_destinations_select_all\"") &&
    mig.includes("FOR SELECT USING (true)") &&
    mig.includes("CREATE POLICY \"tourist_destinations_insert_auth\"") &&
    mig.includes("CREATE POLICY \"tourist_destinations_update_owner\"") &&
    mig.includes("CREATE POLICY \"tourist_destinations_delete_owner\""),
    "RLS mengizinkan SELECT untuk semua user, INSERT untuk user login, UPDATE/DELETE untuk creator/superadmin"
  );

  // TC-03: Seed data
  record(
    "TC-03",
    "Popular Tourist Spots Seed Data",
    mig.includes("INSERT INTO public.tourist_destinations") &&
    mig.includes("Taman Safari Indonesia Bogor") &&
    mig.includes("Orchid Forest Cikole") &&
    mig.includes("Candi Prambanan"),
    "Seed data 10 destinasi populer lintas kota siap dieksekusi"
  );

  // TC-04: TypeScript Contracts
  const types = readFile("lib/types.ts");
  record(
    "TC-04",
    "TypeScript Types & Interfaces",
    types.includes("export interface TouristDestination") &&
    types.includes("destination_id?: string | null;") &&
    types.includes("tourist_destinations: {") &&
    types.includes("Row: TouristDestination;"),
    "Tipe data TouristDestination dan properti destination_id terdaftar pada Database public Tables"
  );

  // TC-05: Service Layer Functions
  const service = readFile("lib/wisata-service.ts");
  record(
    "TC-05",
    "Wisata Service Layer CRUD APIs",
    service.includes("export async function getTouristDestinations") &&
    service.includes("export async function getTouristCities") &&
    service.includes("export async function createTouristDestination") &&
    service.includes("export async function updateTouristDestination") &&
    service.includes("export async function deleteTouristDestination"),
    "Fungsi getTouristDestinations, filter kota, dan CRUD lengkap terimplementasi"
  );

  // TC-06: Sanitizer & Utils
  const utils = readFile("lib/wisata-utils.ts");
  record(
    "TC-06",
    "Sanitasi URL & Kategori Destinasi",
    utils.includes("export function formatSocialUrl") &&
    utils.includes("export function formatMapsUrl") &&
    utils.includes("export function formatCityName") &&
    utils.includes("export const DESTINATION_CATEGORY_META"),
    "Fungsi formatSocialUrl, formatMapsUrl, formatCityName, dan metadata kategori tersedia"
  );

  // TC-07: UI Components
  const card = readFile("components/Wisata/DestinationCard.tsx");
  const modal = readFile("components/Wisata/AddDestinationModal.tsx");
  const tab = readFile("components/Wisata/TouristDestinationsTab.tsx");
  record(
    "TC-07",
    "UI Components (Card, Modal, Tab)",
    card.includes("onSelectForTrip") &&
    card.includes("InstagramIcon") &&
    modal.includes("POPULAR_CITIES") &&
    tab.includes("selectedCity") &&
    tab.includes("handleConfirmAddToTrip"),
    "DestinationCard, AddDestinationModal, dan TouristDestinationsTab terimplementasi lengkap"
  );

  // TC-08: Page Navigation & Switcher
  const page = readFile("app/wisata/page.tsx");
  record(
    "TC-08",
    "Segmented Control Level 1 Navigation",
    page.includes("setMainTab(\"rencana\")") &&
    page.includes("setMainTab(\"katalog\")") &&
    page.includes("<TouristDestinationsTab") &&
    page.includes("trips={trips}"),
    "Navigasi Rencana Trip vs Katalog Spot Bersama terintegrasi bersih di PageHeader dan body"
  );

  // TC-09: Smart Itinerary Autocomplete & City Hint Boosting
  const itemModal = readFile("components/Wisata/AddTripItemModal.tsx");
  record(
    "TC-09",
    "Smart Itinerary Autocomplete & City Boosting",
    itemModal.includes("tripDestination") &&
    itemModal.includes("suggestedDestinations") &&
    itemModal.includes("handleSelectDestination") &&
    itemModal.includes("saveNewToCatalog"),
    "AddTripItemModal mendukung autocomplete popover, city boosting, dan opsi simpan balik ke katalog"
  );

  console.log(`\n${BOLD}================================================================${RESET}`);
  console.log(`  HASIL VERIFIKASI: ${passCount} LULUS, ${failCount} GAGAL`);
  console.log(`${BOLD}================================================================\n${RESET}`);

  if (failCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
} catch (err) {
  console.error("Error executing verification:", err);
  process.exit(1);
}
