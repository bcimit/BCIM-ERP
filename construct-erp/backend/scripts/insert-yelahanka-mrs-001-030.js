#!/usr/bin/env node
/**
 * insert-yelahanka-mrs-001-030.js
 *
 * Inserts MR-001 and MR-007 through MR-030 into WDIRY0151.
 * Source: "Materials request formet.xlsx" (all sheets for 001-030).
 * Missing from file: MR-002, 003, 004, 005, 006, 013.
 *
 *   node scripts/insert-yelahanka-mrs-001-030.js            # DRY RUN
 *   railway run node scripts/insert-yelahanka-mrs-001-030.js --create
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Pool } = require('pg');

const pool = new Pool(
  process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }
    : {
        host:     process.env.DB_HOST     || 'localhost',
        port:     parseInt(process.env.DB_PORT) || 5432,
        database: process.env.DB_NAME     || 'construct_erp',
        user:     process.env.DB_USER     || 'postgres',
        password: process.env.DB_PASSWORD || '',
      }
);

const DO_CREATE = process.argv.includes('--create');
const DEPT = 'Projects';

const MRS = [

  // ── MR-001 ──────────────────────────────────────────────────────────────────
  {
    serial:   'BCIM-TQS-BLR-MR-001',
    date:     '2025-12-10',
    required: '2025-12-17',
    narration: 'Initial tools, safety PPE and equipment. Physical MR BCIM-TQS-BLR-MR-001 dated 10-12-2025.',
    items: [
      { material: 'Hand Gloves (Cotton)',                       qty: 50,  unit: 'pair' },
      { material: 'Weight Machine 50kg',                        qty: 1,   unit: 'nos'  },
      { material: 'Rubber Gloves Mason',                        qty: 25,  unit: 'pair' },
      { material: 'Concrete Finishing Wheel',                   qty: 25,  unit: 'nos'  },
      { material: 'Chisel',                                     qty: 5,   unit: 'nos'  },
      { material: 'MS Binding Wire 50kg',                       qty: 1,   unit: 'nos'  },
      { material: 'Hessian Cloth 300 Mtr',                      qty: 1,   unit: 'nos'  },
      { material: 'SS Drill Bit 5mm',                           qty: 25,  unit: 'nos'  },
      { material: 'Fosroc Conbextra GP2',                       qty: 5,   unit: 'bags' },
      { material: 'Concrete Nail 1.5 inch',                     qty: 10,  unit: 'nos'  },
      { material: 'Sponge (Mason)',                             qty: 50,  unit: 'nos'  },
      { material: 'Bond (Mason)',                               qty: 10,  unit: 'nos'  },
      { material: 'Grinding Machine 4 inch',                    qty: 1,   unit: 'nos'  },
      { material: 'Steel Cutting Wheel 4 and 5 inch',          qty: 20,  unit: 'nos'  },
      { material: '16 AMP Male and Female Socket 3 Pin',        qty: 10,  unit: 'nos'  },
      { material: '2 Core 1.0 sqmm Cable',                     qty: 200, unit: 'mtr'  },
      { material: '32 AMP Male and Female Socket',              qty: 5,   unit: 'nos'  },
      { material: 'Halogen Light 200 Watts',                    qty: 5,   unit: 'nos'  },
      { material: 'Hammer 5 LB',                                qty: 5,   unit: 'nos'  },
      { material: 'Ply Cutting Machine',                        qty: 1,   unit: 'nos'  },
      { material: 'Vibrator Machine',                           qty: 1,   unit: 'nos'  },
      { material: 'Ply Cutting Wheel 7 inch',                   qty: 25,  unit: 'nos'  },
      { material: 'Concrete Drill Bit 10mm',                    qty: 10,  unit: 'nos'  },
      { material: 'Ply Drilling Machine',                       qty: 1,   unit: 'nos'  },
      { material: 'PVC Tie Rod Cone',                           qty: 300, unit: 'nos'  },
      { material: 'Nito Bond EP',                               qty: 5,   unit: 'ltr'  },
    ],
  },

  // ── MR-007 ──────────────────────────────────────────────────────────────────
  {
    serial:   'BCIM-TQS-BLR-MR-007',
    date:     '2026-05-01',
    required: '2026-05-08',
    narration: 'Cement supply. Physical MR BCIM-TQS-BLR-MR-007 dated 01-05-2026.',
    items: [
      { material: 'Cement Bags', qty: 60, unit: 'bags' },
    ],
  },

  // ── MR-008 ──────────────────────────────────────────────────────────────────
  {
    serial:   'BCIM-TQS-BLR-MR-008',
    date:     '2026-10-01',
    required: '2026-10-08',
    narration: 'Kitchen appliances for site. Physical MR BCIM-TQS-BLR-MR-008 dated 01-10-2026.',
    items: [
      { material: 'Refrigerator', qty: 1, unit: 'nos' },
      { material: 'Grinder 3 Ltr', qty: 1, unit: 'nos' },
    ],
  },

  // ── MR-009 ──────────────────────────────────────────────────────────────────
  {
    serial:   'BCIM-TQS-BLR-MR-009',
    date:     '2026-10-01',
    required: '2026-10-08',
    narration: 'Reinforcement steel (TMT bars). Physical MR BCIM-TQS-BLR-MR-009 dated 01-10-2026.',
    items: [
      { material: 'TMT Steel 8mm dia',  qty: 3.506,  unit: 'mt' },
      { material: 'TMT Steel 10mm dia', qty: 35.68,  unit: 'mt' },
      { material: 'TMT Steel 12mm dia', qty: 18.778, unit: 'mt' },
      { material: 'TMT Steel 16mm dia', qty: 15.262, unit: 'mt' },
    ],
  },

  // ── MR-010 ──────────────────────────────────────────────────────────────────
  {
    serial:   'BCIM-TQS-BLR-MR-010',
    date:     '2026-01-12',
    required: '2026-01-19',
    narration: 'Tools, equipment and consumables for site. Physical MR BCIM-TQS-BLR-MR-010 dated 12-01-2026.',
    items: [
      { material: 'Hand Oil Pump',                            qty: 1,   unit: 'nos' },
      { material: 'Orange Safety Jacket',                     qty: 50,  unit: 'nos' },
      { material: '16 Amp Male and Female Socket',            qty: 5,   unit: 'nos' },
      { material: 'MS Binding Wire',                          qty: 50,  unit: 'kg'  },
      { material: '5 inch Concrete Finishing Wheel',          qty: 10,  unit: 'nos' },
      { material: '25mm Ply Drilling Bit (Flat Drill Bit)',   qty: 10,  unit: 'nos' },
      { material: '60mm Needle Vibrator',                     qty: 1,   unit: 'nos' },
      { material: '40mm Needle Vibrator',                     qty: 1,   unit: 'nos' },
      { material: '2 Core 1.0 sqmm Flexible Cable',          qty: 200, unit: 'mtr' },
      { material: 'SS Drill Bit 5mm',                         qty: 25,  unit: 'nos' },
      { material: 'Bond Mason Pan',                           qty: 10,  unit: 'nos' },
      { material: 'Ply Cutting Machine 7 inch',               qty: 1,   unit: 'nos' },
      { material: 'Ply Cutting Wheel 7 inch',                 qty: 15,  unit: 'nos' },
      { material: 'Cut Off Machine 14 inch',                  qty: 1,   unit: 'nos' },
      { material: 'Angle Grinder 4 inch',                     qty: 1,   unit: 'nos' },
      { material: 'Concrete Drill Bit 20mm',                  qty: 5,   unit: 'nos' },
      { material: '21mm x 23mm Ring Spanners',                qty: 5,   unit: 'nos' },
      { material: '5mm Drill Bit',                            qty: 20,  unit: 'nos' },
      { material: 'Carpenter Pair Crow Bar',                  qty: 5,   unit: 'nos' },
      { material: 'Concrete Nail 3 inch',                     qty: 5,   unit: 'kg'  },
      { material: 'Wire Nails 4, 3, 2.5, 2 inch (each 25kg)',qty: 25,  unit: 'kg'  },
      { material: 'Runner Swen Wood 4x3 inch',                qty: 500, unit: 'cft' },
      { material: 'GI Binding Wire',                          qty: 500, unit: 'kg'  },
      { material: '200 Watts LED Flood Light',                qty: 5,   unit: 'nos' },
    ],
  },

  // ── MR-011 ──────────────────────────────────────────────────────────────────
  {
    serial:   'BCIM-TQS-BLR-MR-011',
    date:     '2026-01-19',
    required: '2026-01-26',
    narration: 'IT equipment for site office. Physical MR BCIM-TQS-BLR-MR-011 dated 19-01-2026.',
    items: [
      { material: 'Desktop Computer', qty: 2, unit: 'nos' },
      { material: 'Printer',          qty: 1, unit: 'nos' },
    ],
  },

  // ── MR-012 ──────────────────────────────────────────────────────────────────
  {
    serial:   'BCIM-TQS-BLR-MR-012',
    date:     '2026-01-22',
    required: '2026-01-29',
    narration: 'Tools and construction consumables. Physical MR BCIM-TQS-BLR-MR-012 dated 22-01-2026.',
    items: [
      { material: 'Steel Cutting Wheel TIK 5mm',                  qty: 25,  unit: 'nos' },
      { material: 'Wing Nut with Washer Plate',                    qty: 300, unit: 'nos' },
      { material: 'Cover Block 50mm',                             qty: 1000, unit: 'nos' },
      { material: 'Cover Block 38mm',                             qty: 500,  unit: 'nos' },
      { material: 'Cover Block 75mm',                             qty: 500,  unit: 'nos' },
      { material: 'Nito Bond SBR',                                qty: 50,   unit: 'ltr' },
      { material: 'Ply Drill Flat Bit 25mm',                      qty: 25,   unit: 'nos' },
      { material: 'Solid Block 150mm',                            qty: 450,  unit: 'nos' },
      { material: 'Box Section 6 Mtr 2/1 inch',                   qty: 50,   unit: 'nos' },
      { material: 'Chisel Flat',                                   qty: 5,    unit: 'nos' },
      { material: 'Spray Paint Red and Yellow (5 each)',           qty: 10,   unit: 'nos' },
    ],
  },

  // ── MR-014 ──────────────────────────────────────────────────────────────────
  {
    serial:   'BCIM-TQS-BLR-MR-014',
    date:     '2026-01-31',
    required: '2026-02-07',
    narration: 'Kerb stone supply. Physical MR BCIM-TQS-BLR-MR-014 dated 31-01-2026.',
    items: [
      { material: 'Kerb Stone 600*300*100mm', qty: 0, unit: 'nos', remarks: 'Qty not filled in physical MR' },
    ],
  },

  // ── MR-015 ──────────────────────────────────────────────────────────────────
  {
    serial:   'BCIM-TQS-BLR-MR-015',
    date:     '2026-01-31',
    required: '2026-02-07',
    narration: 'Shuttering materials. Physical MR BCIM-TQS-BLR-MR-015 dated 31-01-2026.',
    items: [
      { material: 'Ply Wood 12mm',           qty: 30,  unit: 'nos' },
      { material: 'Runner 3x4 inch',         qty: 300, unit: 'cft' },
      { material: 'Wing Nut with Washer Plate', qty: 250, unit: 'nos' },
    ],
  },

  // ── MR-016 ──────────────────────────────────────────────────────────────────
  {
    serial:   'BCIM-TQS-BLR-MR-016',
    date:     '2026-01-31',
    required: '2026-02-07',
    narration: 'Plastering sand. Physical MR BCIM-TQS-BLR-MR-016 dated 31-01-2026.',
    items: [
      { material: 'M Plastering Sand', qty: 15, unit: 'mt' },
    ],
  },

  // ── MR-017 ──────────────────────────────────────────────────────────────────
  {
    serial:   'BCIM-TQS-BLR-MR-017',
    date:     '2026-01-31',
    required: '2026-02-07',
    narration: 'Curing compound. Physical MR BCIM-TQS-BLR-MR-017 dated 31-01-2026.',
    items: [
      { material: 'Curing Compound', qty: 200, unit: 'ltr' },
    ],
  },

  // ── MR-018 ──────────────────────────────────────────────────────────────────
  {
    serial:   'BCIM-TQS-BLR-MR-018',
    date:     '2026-04-02',
    required: '2026-04-09',
    narration: 'Labour rate approval — carpenter, mason, unskilled, supervisor. Physical MR BCIM-TQS-BLR-MR-018 dated 02-04-2026.',
    items: [
      { material: 'Labour Charges — Carpenter / Fitter / Mason (8 Hours/day)', qty: 500,  unit: 'days'  },
      { material: 'Labour Charges — Unskilled Labour (8 Hours/day)',            qty: 1000, unit: 'days'  },
      { material: 'Overtime Charges — Carpenter / Helper / Fitter',             qty: 1500, unit: 'hours' },
      { material: 'Overtime Charges — Unskilled Labour',                         qty: 3000, unit: 'hours' },
      { material: 'Labour Charges — Supervisor (8 Hours/shift)',                qty: 100,  unit: 'days'  },
      { material: 'Overtime Charges — Supervisor',                               qty: 300,  unit: 'hours' },
    ],
  },

  // ── MR-019 ──────────────────────────────────────────────────────────────────
  {
    serial:   'BCIM-TQS-BLR-MR-019',
    date:     '2026-04-02',
    required: '2026-04-09',
    narration: 'Labour for reinforcement work. Physical MR BCIM-TQS-BLR-MR-019 dated 02-04-2026.',
    items: [
      { material: 'Labour Charges — Fabrication, Shifting and Fixing of Reinforcement Work', qty: 100, unit: 'mt' },
    ],
  },

  // ── MR-020 ──────────────────────────────────────────────────────────────────
  {
    serial:   'BCIM-TQS-BLR-MR-020',
    date:     '2026-04-02',
    required: '2026-04-09',
    narration: 'Concrete supply for security cabin and compound wall. Physical MR BCIM-TQS-BLR-MR-020 dated 02-04-2026.',
    items: [
      { material: 'Concrete M25 Grade', qty: 50, unit: 'cum', remarks: 'Security cabin + Compound wall' },
    ],
  },

  // ── MR-021 ──────────────────────────────────────────────────────────────────
  {
    serial:   'BCIM-TQS-BLR-MR-021',
    date:     '2026-04-02',
    required: '2026-04-09',
    narration: 'Cement supply. Physical MR BCIM-TQS-BLR-MR-021 dated 02-04-2026.',
    items: [
      { material: 'Cement Bags', qty: 100, unit: 'bags' },
    ],
  },

  // ── MR-022 ──────────────────────────────────────────────────────────────────
  {
    serial:   'BCIM-TQS-BLR-MR-022',
    date:     '2026-09-02',
    required: '2026-09-09',
    narration: 'Safety PPE and protective equipment. Physical MR BCIM-TQS-BLR-MR-022 dated 02-09-2026.',
    items: [
      { material: 'Green Safety Vests',                qty: 20, unit: 'nos'  },
      { material: 'Blue Safety Vests',                 qty: 10, unit: 'nos'  },
      { material: 'Safety Shoes (various sizes)',       qty: 10, unit: 'nos', remarks: 'Size details to be updated' },
      { material: 'Safety Shoes (various sizes)',       qty: 10, unit: 'nos', remarks: 'Size details to be updated' },
      { material: 'Safety Shoes (various sizes)',       qty: 10, unit: 'nos', remarks: 'Size details to be updated' },
      { material: 'Safety Shoes (various sizes)',       qty: 10, unit: 'nos', remarks: 'Size details to be updated' },
      { material: 'Safety Shoes (various sizes)',       qty: 10, unit: 'nos', remarks: 'Size details to be updated' },
      { material: 'Dust Mask',                         qty: 1,  unit: 'bnd'  },
      { material: 'Ear Plug',                           qty: 30, unit: 'nos'  },
      { material: 'Cut Resistant Gloves',              qty: 30, unit: 'nos'  },
      { material: 'Shoulder Pad',                       qty: 30, unit: 'nos'  },
      { material: 'Electrical Gloves 1000V',            qty: 2,  unit: 'nos'  },
      { material: 'Cotton Hand Gloves',                 qty: 0,  unit: 'pair', remarks: 'Qty not filled in physical MR' },
    ],
  },

  // ── MR-023 ──────────────────────────────────────────────────────────────────
  {
    serial:   'BCIM-TQS-BLR-MR-023',
    date:     '2026-09-02',
    required: '2026-09-09',
    narration: 'Electrical panel and cable. Physical MR BCIM-TQS-BLR-MR-023 dated 02-09-2026.',
    items: [
      { material: '63 AMP MCB',                                      qty: 1, unit: 'nos' },
      { material: '32 AMP MCB',                                      qty: 2, unit: 'nos' },
      { material: '12 Model MCB Box',                                qty: 1, unit: 'nos' },
      { material: 'Single Core 4 sqmm Flexible Cable', qty: 0, unit: 'mtr', remarks: 'Length not filled in physical MR' },
    ],
  },

  // ── MR-024 ──────────────────────────────────────────────────────────────────
  {
    serial:   'BCIM-TQS-BLR-MR-024',
    date:     '2026-09-02',
    required: '2026-09-09',
    narration: 'Solid blocks supply. Physical MR BCIM-TQS-BLR-MR-024 dated 02-09-2026.',
    items: [
      { material: 'Solid Blocks 300*200*200mm', qty: 450, unit: 'nos' },
    ],
  },

  // ── MR-025 ──────────────────────────────────────────────────────────────────
  {
    serial:   'BCIM-TQS-BLR-MR-025',
    date:     '2026-12-02',
    required: '2026-12-09',
    narration: 'Nails, plywood and earth plate compactor. Physical MR BCIM-TQS-BLR-MR-025 dated 02-12-2026.',
    items: [
      { material: 'Nails 4 inch',            qty: 25, unit: 'kg'  },
      { material: 'Nails 3 inch',            qty: 25, unit: 'kg'  },
      { material: 'Nails 2 inch',            qty: 25, unit: 'kg'  },
      { material: 'Nails 1.5 inch',          qty: 25, unit: 'kg'  },
      { material: 'Earth Plate Compactor',   qty: 1,  unit: 'nos' },
      { material: 'Nito Bond EP',            qty: 25, unit: 'ltr' },
      { material: 'Plywood 12mm',            qty: 50, unit: 'nos' },
    ],
  },

  // ── MR-026 ──────────────────────────────────────────────────────────────────
  {
    serial:   'BCIM-TQS-BLR-MR-026',
    date:     '2026-02-13',
    required: '2026-02-20',
    narration: 'Safety PPE, fire extinguishers and welding equipment. Physical MR BCIM-TQS-BLR-MR-026 dated 13-02-2026.',
    items: [
      { material: 'Safety Helmets Yellow',                                    qty: 25, unit: 'nos'  },
      { material: 'Reflective Jackets Orange',                                qty: 30, unit: 'nos'  },
      { material: 'Safety Shoes size 7',                                      qty: 20, unit: 'pair' },
      { material: 'Safety Shoes size 8',                                      qty: 20, unit: 'pair' },
      { material: 'Safety Shoes size 9',                                      qty: 20, unit: 'pair' },
      { material: 'Safety Shoes size 10',                                     qty: 10, unit: 'pair' },
      { material: 'Cotton Hand Gloves',                                        qty: 200,unit: 'pair' },
      { material: 'Safety Goggles White',                                     qty: 30, unit: 'nos'  },
      { material: 'Ear Plugs',                                                 qty: 40, unit: 'nos'  },
      { material: 'Dust Masks',                                                qty: 50, unit: 'nos'  },
      { material: 'Full Body Harness',                                        qty: 20, unit: 'nos'  },
      { material: 'Barricade Tape',                                            qty: 10, unit: 'roll' },
      { material: 'Fire Extinguisher (Dry Powder)',                           qty: 2,  unit: 'nos'  },
      { material: 'Fire Extinguisher (CO2)',                                  qty: 2,  unit: 'nos'  },
      { material: 'Industrial Plug Top 3-pin Male & Female (10 each)',        qty: 20, unit: 'nos'  },
      { material: 'Industrial Plug Top 5-pin Male & Female (10 each)',        qty: 20, unit: 'nos'  },
      { material: 'Oil Spill Tray (Long)',                                    qty: 1,  unit: 'nos'  },
      { material: 'Welding Holder',                                            qty: 2,  unit: 'nos'  },
      { material: 'ARC Welding Black & White Square Glass Shade 11',         qty: 5,  unit: 'nos'  },
      { material: 'Welding Cable',                                             qty: 20, unit: 'mtr'  },
    ],
  },

  // ── MR-027 ──────────────────────────────────────────────────────────────────
  {
    serial:   'BCIM-TQS-BLR-MR-027',
    date:     '2026-02-13',
    required: '2026-02-20',
    narration: 'Site office container. Physical MR BCIM-TQS-BLR-MR-027 dated 13-02-2026.',
    items: [
      { material: 'Office Container', qty: 1, unit: 'nos' },
    ],
  },

  // ── MR-028 ──────────────────────────────────────────────────────────────────
  {
    serial:   'BCIM-TQS-BLR-MR-028',
    date:     '2026-02-23',
    required: '2026-02-25',
    narration: 'Electrical cable, lighting and small tools. Physical MR BCIM-TQS-BLR-MR-028 dated 23-02-2026.',
    items: [
      { material: '2C x 1 sqmm Flexible Cable',        qty: 200, unit: 'mtr' },
      { material: '4C x 6 sqmm Flexible Cable',        qty: 100, unit: 'mtr' },
      { material: '200 Watt LED Flood Light',           qty: 10,  unit: 'nos' },
      { material: 'Form Sheet',                         qty: 1,   unit: 'roll'},
      { material: 'MS Motor Pan',                       qty: 10,  unit: 'nos' },
      { material: 'MS Binding Wire',                    qty: 50,  unit: 'kg'  },
      { material: 'Sponge',                             qty: 50,  unit: 'nos' },
      { material: 'Paint Brush 2 inch',                 qty: 10,  unit: 'nos' },
      { material: 'Paint Brush 4 inch',                 qty: 10,  unit: 'nos' },
      { material: 'Concrete Grinding Wheel 5 inch',     qty: 50,  unit: 'nos' },
      { material: 'Cover Block 50mm',                  qty: 500, unit: 'nos' },
      { material: 'Cover Block 40mm',                  qty: 500, unit: 'nos' },
      { material: 'Thinner',                            qty: 50,  unit: 'ltr' },
      { material: 'Plumb Bob',                          qty: 5,   unit: 'nos' },
      { material: 'Roller Brush 4 inch',                qty: 10,  unit: 'nos' },
      { material: 'Roller Brush 8 inch',                qty: 10,  unit: 'nos' },
      { material: 'Insulation Tape',                    qty: 20,  unit: 'nos' },
      { material: 'Continuity Tester',                  qty: 1,   unit: 'nos' },
      { material: 'Clamp Meter',                        qty: 1,   unit: 'nos' },
    ],
  },

  // ── MR-029 ──────────────────────────────────────────────────────────────────
  {
    serial:   'BCIM-TQS-BLR-MR-029',
    date:     '2026-02-23',
    required: '2026-02-25',
    narration: 'Cement and M Sand supply. Physical MR BCIM-TQS-BLR-MR-029 dated 23-02-2026.',
    items: [
      { material: 'Cement',  qty: 60, unit: 'bags' },
      { material: 'M Sand',  qty: 15, unit: 'mt'   },
    ],
  },

  // ── MR-030 ──────────────────────────────────────────────────────────────────
  {
    serial:   'BCIM-TQS-BLR-MR-030',
    date:     '2026-02-27',
    required: '2026-02-28',
    narration: 'Soil backfilling and concreting work orders. Physical MR BCIM-TQS-BLR-MR-030 dated 27-02-2026.',
    items: [
      { material: 'Soil Back Filling',  qty: 2000, unit: 'cum', remarks: 'Bahulya Buildcast Pvt Ltd' },
      { material: 'Concreting Work',    qty: 500,  unit: 'cum' },
    ],
  },

];

// ── Main ──────────────────────────────────────────────────────────────────────
(async () => {
  const client = await pool.connect();
  try {
    const projRes = await client.query(
      `SELECT id, name, project_code, company_id FROM projects
       WHERE is_active = true AND LOWER(project_code) = 'wdiry0151'`
    );
    if (!projRes.rows.length) { console.error('❌ Project WDIRY0151 not found.'); process.exit(1); }
    const proj = projRes.rows[0];
    console.log(`\nTarget project: "${proj.name}"  (${proj.id})\n`);

    const userRes = await client.query(
      `SELECT id, name FROM users
       WHERE company_id = $1 AND is_active = true AND role IN ('super_admin','admin')
       ORDER BY created_at ASC LIMIT 1`,
      [proj.company_id]
    );
    if (!userRes.rows.length) { console.error('❌ No admin user found.'); process.exit(1); }
    const raisedBy = userRes.rows[0];
    console.log(`Raised by: ${raisedBy.name}\n`);

    const skipped = [], toInsert = [];
    for (const mr of MRS) {
      const dup = await client.query(
        `SELECT id FROM material_requisitions WHERE serial_no_formatted = $1`, [mr.serial]
      );
      if (dup.rows.length) skipped.push(mr.serial);
      else toInsert.push(mr);
    }

    if (skipped.length) console.log(`⚠️  Already exist (will skip): ${skipped.join(', ')}\n`);

    console.log('MRs to insert:');
    toInsert.forEach(mr => console.log(`  ${mr.serial}  ${mr.date}  (${mr.items.length} items)`));
    console.log(`\nTotal: ${toInsert.length} MRs, ${toInsert.reduce((s, m) => s + m.items.length, 0)} line items`);

    if (!DO_CREATE) {
      console.log('\n(DRY RUN — nothing inserted. Re-run with --create to commit.)\n');
      return;
    }

    await client.query('BEGIN');
    for (const mr of toInsert) {
      const mrRes = await client.query(
        `INSERT INTO material_requisitions (
           project_id, mrs_number, serial_no_formatted, department,
           head_office_project_name, required_by, priority, remarks,
           raised_by, status, created_at
         ) VALUES ($1,$2,$3,$4,$5,$6,'medium',$7,$8,'pending',$9) RETURNING id`,
        [proj.id, mr.serial, mr.serial, DEPT, proj.name,
         mr.required, mr.narration, raisedBy.id, mr.date]
      );
      const mrId = mrRes.rows[0].id;

      for (let i = 0; i < mr.items.length; i++) {
        const { material, qty, unit, remarks } = mr.items[i];
        await client.query(
          `INSERT INTO mrs_items (mrs_id, material_name, quantity, unit, sort_order, remarks)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [mrId, material, qty, unit, i + 1, remarks || null]
        );
      }
      console.log(`  ✅ ${mr.serial}  (${mr.items.length} items)`);
    }
    await client.query('COMMIT');

    console.log(`\n✅ Done — inserted ${toInsert.length} MRs, ${toInsert.reduce((s, m) => s + m.items.length, 0)} line items.`);
    if (skipped.length) console.log(`   Skipped (already existed): ${skipped.join(', ')}`);
    console.log(`   Note: MR-002, 003, 004, 005, 006, 013 are not in source Excel file.\n`);

  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('\n❌ Error:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
})();
