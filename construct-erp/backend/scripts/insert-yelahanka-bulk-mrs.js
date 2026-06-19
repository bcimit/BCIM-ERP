#!/usr/bin/env node
/**
 * insert-yelahanka-bulk-mrs.js
 *
 * Inserts 10 physical MRs (MR-031 to MR-048, excl. MR-034 unreadable)
 * into Residential Apartments - Yelahanka (Retaining Wall & STP) — WDIRY0151.
 *
 * Modes:
 *   node scripts/insert-yelahanka-bulk-mrs.js            # DRY RUN
 *   node scripts/insert-yelahanka-bulk-mrs.js --create   # Insert
 *
 * Run against production:
 *   railway run node scripts/insert-yelahanka-bulk-mrs.js --create
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

// ── MR definitions ────────────────────────────────────────────────────────────
const MRS = [

  // ── MR-031 ──────────────────────────────────────────────────────────────────
  {
    serial:    'BCIM-TQS-BLR-MR-031',
    date:      '2026-03-05',
    required:  '2026-03-07',
    narration: 'Supply & Fixing of Drain Cover Slab 900x600x75mm (capacity load 10MT). Physical MR BCIM-TQS-BLR-MR-031 dated 05-03-2026.',
    items: [
      { material: 'Drain Cover Slab (Supply & Fixing) 900*600*75MM, capacity load 10MT', qty: 160, unit: 'nos', remarks: 'H4S - 15 Restaurant' },
    ],
  },

  // ── MR-032 ──────────────────────────────────────────────────────────────────
  {
    serial:    'BCIM-TQS-BLR-MR-032',
    date:      '2026-03-05',
    required:  '2026-03-10',
    narration: 'Supply of C Channel 200*100*10mm. Physical MR BCIM-TQS-BLR-MR-032 dated 05-03-2026.',
    items: [
      { material: '"C" Channel 200*100*10MM', qty: 24, unit: 'rmt', remarks: '' },
    ],
  },

  // ── MR-033 ──────────────────────────────────────────────────────────────────
  {
    serial:    'BCIM-TQS-BLR-MR-033',
    date:      '2026-03-05',
    required:  '2026-03-07',
    narration: 'Paver Blocks Laying Work and M Sand supply. Physical MR BCIM-TQS-BLR-MR-033 dated 05-03-2026.',
    items: [
      { material: 'Paver Blocks Laying Work', qty: 350, unit: 'sqm', remarks: '' },
      { material: 'M Sand (Supply & Laying)',  qty: 25,  unit: 'mt',  remarks: '' },
    ],
  },

  // ── MR-036 ──────────────────────────────────────────────────────────────────
  {
    serial:    'BCIM-TQS-BLR-MR-036',
    date:      '2026-03-17',
    required:  '2026-03-18',
    narration: 'Construction materials for labour camp work. Physical MR BCIM-TQS-BLR-MR-036 dated 17-03-2026.',
    items: [
      { material: 'Concrete M10 Grade',               qty: 115,   unit: 'cum',  remarks: 'labour camp work — SCP' },
      { material: 'Concrete M20 Grade',               qty: 25,    unit: 'cum',  remarks: 'labour camp work — SCP' },
      { material: 'Solid Block 200MM',                qty: 4000,  unit: 'nos',  remarks: 'labour camp work' },
      { material: 'Solid Block 150MM',                qty: 2500,  unit: 'nos',  remarks: 'labour camp work' },
      { material: 'M Sand',                           qty: 95,    unit: 'mt',   remarks: 'labour camp work' },
      { material: 'P Sand',                           qty: 20,    unit: 'mt',   remarks: 'labour camp work' },
      { material: 'RO Plant',                         qty: 0.1,   unit: 'nos',  remarks: 'labour camp work' },
      { material: 'MS Items — Box Section 60*40*2.6', qty: 2,     unit: 'mt',   remarks: 'Sub Contract' },
      { material: 'MS Items — Box Section 25*25*2.6', qty: 3.656, unit: 'mt',   remarks: 'labour camp work' },
      { material: 'MS Items — Box Section 50*50*2.3', qty: 1.2,   unit: 'mt',   remarks: 'labour camp work' },
      { material: 'MS Plate 12mm',                    qty: 0.1,   unit: 'mt',   remarks: 'labour camp work' },
      { material: 'MS Plate 10mm',                    qty: 0.1,   unit: 'mt',   remarks: 'labour camp work' },
      { material: 'MS Plate 16mm',                    qty: 0.2,   unit: 'mt',   remarks: 'labour camp work' },
      { material: 'GI Purlin Sheet',                  qty: 2750,  unit: 'sqm',  remarks: 'partition + Roof' },
      { material: 'Cement',                           qty: 150,   unit: 'bags', remarks: 'labour camp work' },
    ],
  },

  // ── MR-039 ──────────────────────────────────────────────────────────────────
  {
    serial:    'BCIM-TQS-BLR-MR-039',
    date:      '2026-03-25',
    required:  '2026-03-25',
    narration: 'QC Lab Equipment. Physical MR BCIM-TQS-BLR-MR-039 dated 25-03-2026.',
    items: [
      { material: 'Compression Testing Machine (2000KN)',                         qty: 1,  unit: 'nos', remarks: 'QC Lab Equipment' },
      { material: 'Cube Moulds 150*150*150 MM ISI',                               qty: 30, unit: 'nos', remarks: 'QC Lab Equipment' },
      { material: 'Vernier Caliper (Digital)',                                     qty: 1,  unit: 'nos', remarks: 'QC Lab Equipment' },
      { material: 'Weighing Balance 10 KG',                                       qty: 1,  unit: 'nos', remarks: 'QC Lab Equipment' },
      { material: 'Weighing Balance 100 KG',                                      qty: 1,  unit: 'nos', remarks: 'QC Lab Equipment' },
      { material: 'Fine Aggregate Sieve Set (4.75mm to 75 micron) with pan Brass',qty: 1,  unit: 'nos', remarks: 'QC Lab Equipment' },
      { material: 'Coarse Aggregate Sieve Set (40mm to 4.75) with pan GI',        qty: 1,  unit: 'nos', remarks: 'QC Lab Equipment' },
      { material: 'Slump Cone with Tamping Rod',                                  qty: 2,  unit: 'nos', remarks: 'QC Lab Equipment' },
      { material: 'Sieve 45 Micron & 90 Micron (Brass)',                          qty: 1,  unit: 'nos', remarks: 'QC Lab Equipment' },
      { material: 'Degitel Thermometer',                                           qty: 1,  unit: 'nos', remarks: 'QC Lab Equipment' },
      { material: 'Measuring Jar 250 ml (PVC)',                                   qty: 1,  unit: 'nos', remarks: 'QC Lab Equipment' },
      { material: 'Measuring Jar 500 ml (PVC)',                                   qty: 1,  unit: 'nos', remarks: 'QC Lab Equipment' },
      { material: 'Measuring Jar 1000 ml (PVC)',                                  qty: 1,  unit: 'nos', remarks: 'QC Lab Equipment' },
      { material: 'Soil Core Cutter 1no Rammer & 6 Nos Core Cutter',             qty: 1,  unit: 'nos', remarks: 'QC Lab Equipment' },
      { material: 'Rapid Moisture Meter Soil Test',                               qty: 1,  unit: 'nos', remarks: 'QC Lab Equipment' },
      { material: 'Concrete Flow Table With Cone',                                qty: 1,  unit: 'nos', remarks: 'QC Lab Equipment' },
      { material: 'Vicat Apparatus',                                              qty: 1,  unit: 'nos', remarks: 'QC Lab Equipment' },
    ],
  },

  // ── MR-043 ──────────────────────────────────────────────────────────────────
  {
    serial:    'BCIM-TQS-BLR-MR-043',
    date:      '2026-04-30',
    required:  '2026-05-01',
    narration: 'IDC Returnable machinery items for BCIM (scaffolding, store, ID card). Physical MR BCIM-TQS-BLR-MR-043 dated 30-04-2026.',
    items: [
      { material: 'Laminator KL 320',                qty: 1,   unit: 'nos', remarks: 'IDC — for ID card & signage board lamination (Returnable)' },
      { material: 'Swivel Clamp 40*40mm',            qty: 500, unit: 'nos', remarks: 'IDC — for scaffolding work (Returnable)' },
      { material: 'Joint Pin for scaffolding',       qty: 500, unit: 'nos', remarks: 'IDC — for scaffolding work (Returnable)' },
      { material: 'Weighing Machine 100 kg capacity',qty: 1,   unit: 'nos', remarks: 'IDC — for store (Returnable)' },
      { material: 'Air Cooler 45 litre capacity',    qty: 2,   unit: 'nos', remarks: 'IDC — for store (Returnable)' },
    ],
  },

  // ── MR-044 ──────────────────────────────────────────────────────────────────
  {
    serial:    'BCIM-TQS-BLR-MR-044',
    date:      '2026-04-06',
    required:  '2026-04-13',
    narration: 'Civil works material requirements for April 2026 — concrete, steel, shuttering, waterproofing. Physical MR BCIM-TQS-BLR-MR-044 dated 06-04-2026.',
    items: [
      { material: 'Reinforcement Steel 12mm dia', qty: 9.5,  unit: 'mt',   remarks: 'RW + STP + UG sump+podium column' },
      { material: 'Reinforcement Steel 8mm dia',  qty: 2.5,  unit: 'mt',   remarks: 'RW + STP + UG sump' },
      { material: 'Reinforcement Steel 10mm dia', qty: 2.5,  unit: 'mt',   remarks: 'RW + STP + UG sump' },
      { material: 'Reinforcement Steel 16mm dia', qty: 2,    unit: 'mt',   remarks: 'Relinquish road trench work' },
      { material: 'Reinforcement Steel 20mm dia', qty: 1.5,  unit: 'mt',   remarks: 'RW + UG sump + trench' },
      { material: 'Reinforcement Steel 25mm dia', qty: 1.5,  unit: 'mt',   remarks: '' },
      { material: 'Concrete M10 Grade',           qty: 40,   unit: 'cum',  remarks: 'RW + STP + UG sump' },
      { material: 'Concrete M35 Grade',           qty: 30,   unit: 'cum',  remarks: 'RW + STP + UG sump+podium column' },
      { material: 'Concrete M30 Grade',           qty: 375,  unit: 'cum',  remarks: 'RW + STP + UG sump' },
      { material: 'Concrete M25 Grade',           qty: 30,   unit: 'cum',  remarks: 'UG Sump Raft, footing + column starter bar' },
      { material: 'Cement',                       qty: 100,  unit: 'bags', remarks: 'Secrty cabin + other infrastructure work' },
      { material: 'M Sand',                       qty: 30,   unit: 'mt',   remarks: 'Secrty cabin + other infrastructure work' },
      { material: 'Shuttering Ply Wood 12mm thick filmfaced finish', qty: 150,  unit: 'nos',  remarks: 'STP slab + RW + UG sump shuttering' },
      { material: 'Runners 4x3 Inch for shuttering',               qty: 300,  unit: 'cft',  remarks: 'STP slab + RW + UG sump shuttering' },
      { material: 'Tie Rod Water Stopper 16mm dia',                qty: 1000, unit: 'nos',  remarks: 'STP slab + RW + UG sump shuttering' },
      { material: 'White Tank Penetron Admix for integrated waterproofing', qty: 405, unit: 'ltr', remarks: '1215 cum/pop — STP slab + RW + UG sump shuttering' },
      { material: 'Runners 40*40mm Silver Wood for shuttering',    qty: 150,  unit: 'cft',  remarks: 'STP slab + RW + UG sump shuttering' },
    ],
  },

  // ── MR-044A ─────────────────────────────────────────────────────────────────
  {
    serial:    'BCIM-TQS-BLR-MR-044A',
    date:      '2026-04-30',
    required:  '2026-05-10',
    narration: 'Tools, consumables and small materials for May 2026 DC (MIS 111). Supplement to MR-044. Physical MR BCIM-TQS-BLR-MR-044A dated 30-04-2026.',
    items: [
      { material: 'Industrial Plug 5-pin Male and Female',    qty: 10,  unit: 'nos',     remarks: 'For site electrical work' },
      { material: 'Earthing Cable 4 sqmm single core',        qty: 100, unit: 'rmt',     remarks: 'For site electrical work' },
      { material: 'Scaffolding Red with Green tag holder',    qty: 50,  unit: 'nos',     remarks: 'For scaffolding work' },
      { material: 'Cable Tie 200*2.5mm',                      qty: 1,   unit: 'packets', remarks: 'For site electrical work' },
      { material: 'Duct Tape for shuttering work',            qty: 100, unit: 'nos',     remarks: 'For shuttering work' },
      { material: 'Acrylic Curing Compound',                  qty: 200, unit: 'ltr',     remarks: 'For RCC structure curing' },
      { material: 'Wire Nails 4 inch for scaffolding',        qty: 25,  unit: 'kg',      remarks: 'For scaffolding work' },
      { material: 'Wire Nails 3 inch for scaffolding',        qty: 25,  unit: 'kg',      remarks: 'For scaffolding work' },
      { material: 'MS Binding Wire for scaffolding',          qty: 50,  unit: 'kg',      remarks: 'For scaffolding work' },
      { material: 'Hessian Cloth for curing',                 qty: 200, unit: 'rmt',     remarks: 'For horizontal element curing' },
      { material: 'Sponge',                                   qty: 20,  unit: 'nos',     remarks: 'For masonry work' },
      { material: 'Cut-resistant Hand Gloves',                qty: 20,  unit: 'pairs',   remarks: 'For workers' },
      { material: 'Safety Helmets Nape Yellow',               qty: 50,  unit: 'nos',     remarks: 'For workers' },
      { material: 'Concrete Wire Nails 3 inch',               qty: 25,  unit: 'kg',      remarks: 'For steel work' },
      { material: 'Concrete Wire Nails 2 inch',               qty: 25,  unit: 'kg',      remarks: 'For steel work' },
      { material: 'Steel Cutting Blade 4 inch',               qty: 20,  unit: 'nos',     remarks: 'For shuttering work' },
      { material: 'Cover Block 75mm',                         qty: 500, unit: 'nos',     remarks: 'For steel work' },
      { material: 'Flat Drill BT 25mm',                       qty: 25,  unit: 'nos',     remarks: 'For welding & grinding' },
      { material: 'Spade (Big) for Masonry work',             qty: 5,   unit: 'nos',     remarks: 'For workers' },
      { material: 'Roller Brush 4 inch',                      qty: 10,  unit: 'nos',     remarks: 'Finishing work' },
      { material: 'Roller Brush 8 inch',                      qty: 10,  unit: 'nos',     remarks: 'For curing compound applying' },
      { material: 'White Paint',                              qty: 50,  unit: 'ltr',     remarks: 'For curing compound applying' },
      { material: 'Fosroc Conbextra GP-2',                    qty: 50,  unit: 'nos',     remarks: 'For barcade & fencing painting' },
    ],
  },

  // ── MR-045 ──────────────────────────────────────────────────────────────────
  {
    serial:    'BCIM-TQS-BLR-MR-045',
    date:      '2026-04-30',
    required:  '2026-05-01',
    narration: 'Work Orders — civil labour for STP, Retaining Wall, UG sump, security cabin (WRF 119). Physical MR BCIM-TQS-BLR-MR-045 dated 30-04-2026.',
    items: [
      { material: 'Shuttering Work (WO) — STP + RW + UG sump RCC',      qty: 1480, unit: 'sqm',   remarks: 'For STP+RW+UG sump RCC work' },
      { material: 'Steel Work (WO) — STP + RW + UG sump',               qty: 45,   unit: 'mt',    remarks: 'For STP+RW+UG sump' },
      { material: 'Concreting Work (WO) — STP + RW + UG sump',          qty: 500,  unit: 'cum',   remarks: 'For STP+RW+UG sump' },
      { material: 'Block Work 200mm (WO) — Security cabin',              qty: 75,   unit: 'sqm',   remarks: 'For security cabin work' },
      { material: 'Plastering Work WO (material + labour)',              qty: 150,  unit: 'sqm',   remarks: 'For back filling and excavation' },
      { material: 'JCB Hiring for backfilling and Excavation (WO)',      qty: 150,  unit: 'hours', remarks: 'Rental — for back filling and excavation' },
      { material: 'Tractor Hiring for backfilling and Excavation (WO)',  qty: 20,   unit: 'days',  remarks: 'Rental — for back filling and excavation' },
      { material: 'Bobcat Machine Hiring for STP backfilling (WO)',      qty: 15,   unit: 'days',  remarks: 'Rental — stp back filling' },
      { material: 'Skilled Worker (rate approval on daily basis)',        qty: 1,    unit: 'ro',    remarks: 'Claiming as per JMR' },
      { material: 'Unskilled Worker (rate approval on daily basis)',      qty: 1,    unit: 'ro',    remarks: 'Claiming as per JMR' },
    ],
  },

  // ── MR-048 ──────────────────────────────────────────────────────────────────
  {
    serial:    'BCIM-TQS-BLR-MR-048',
    date:      '2026-06-04',
    required:  '2026-06-10',
    narration: 'Safety equipment, PPE, tools and consumables (104 items). Physical MR BCIM-TQS-BLR-MR-048 dated 04-06-2026.',
    items: [
      { material: '16 Amp Male Plug 3 PIN',                                    qty: 20,  unit: 'nos',  remarks: '' },
      { material: '16 Amp Female Plug 3 PIN',                                  qty: 20,  unit: 'nos',  remarks: '' },
      { material: 'Steel Cutting Wheel AG-4',                                  qty: 50,  unit: 'nos',  remarks: '' },
      { material: 'Steel Cutting Wheel AG-5',                                  qty: 50,  unit: 'nos',  remarks: '' },
      { material: 'Ply Drill Bit 25mm',                                        qty: 50,  unit: 'nos',  remarks: '' },
      { material: 'PVC Pipe 25mm',                                             qty: 200, unit: 'nos',  remarks: '' },
      { material: 'Gurumala (Wood)',                                           qty: 10,  unit: 'nos',  remarks: '' },
      { material: 'Masson Trowel Small',                                       qty: 15,  unit: 'nos',  remarks: '' },
      { material: 'Masson Trowel Big',                                         qty: 15,  unit: 'nos',  remarks: '' },
      { material: 'Line Dori',                                                 qty: 50,  unit: 'nos',  remarks: '' },
      { material: 'Wire Nails 2 inch',                                         qty: 50,  unit: 'kg',   remarks: '' },
      { material: 'Straight Edge (Fanti) 6 feet',                             qty: 20,  unit: 'nos',  remarks: '' },
      { material: 'Plum Bob',                                                  qty: 12,  unit: 'nos',  remarks: '' },
      { material: 'Paint Brush 4 inch',                                        qty: 10,  unit: 'nos',  remarks: '' },
      { material: 'Paint Brush 2 inch',                                        qty: 10,  unit: 'nos',  remarks: '' },
      { material: 'Paint Brush 0.5 inch',                                      qty: 5,   unit: 'nos',  remarks: '' },
      { material: 'Paint Brush 1.0 inch',                                      qty: 5,   unit: 'nos',  remarks: '' },
      { material: 'Curing Compound',                                           qty: 200, unit: 'ltr',  remarks: '' },
      { material: 'Shuttering Oil',                                            qty: 200, unit: 'ltr',  remarks: '' },
      { material: 'Hammer 2LB (Normal)',                                       qty: 10,  unit: 'nos',  remarks: '' },
      { material: 'Hammer 5LB (Normal)',                                       qty: 10,  unit: 'nos',  remarks: '' },
      { material: 'Umbrella Small',                                            qty: 10,  unit: 'nos',  remarks: '' },
      { material: 'Umbrella Big',                                              qty: 2,   unit: 'nos',  remarks: '' },
      { material: 'Raincoat Staff',                                            qty: 20,  unit: 'nos',  remarks: '' },
      { material: 'Raincoat Labour (Yellow colour)',                           qty: 100, unit: 'nos',  remarks: '' },
      { material: 'Flat Chisel',                                               qty: 10,  unit: 'nos',  remarks: '' },
      { material: 'Pointed Chisel',                                            qty: 10,  unit: 'nos',  remarks: '' },
      { material: 'Curing Pipe 1 inch White',                                  qty: 300, unit: 'rm',   remarks: '' },
      { material: 'Welding Rod 3.15',                                          qty: 10,  unit: 'pkt',  remarks: '' },
      { material: 'Helmet Refill (Labour)',                                    qty: 50,  unit: 'nos',  remarks: '' },
      { material: 'Helmet Refill (Staff)',                                     qty: 20,  unit: 'nos',  remarks: '' },
      { material: 'Tarpauline (24 to 30 feet)',                               qty: 10,  unit: 'nos',  remarks: '' },
      { material: 'Gamboot Long Height 35cm size-9',                          qty: 30,  unit: 'pair', remarks: '' },
      { material: '16mm Concrete Drill Bit 400 Length',                       qty: 5,   unit: 'nos',  remarks: '' },
      { material: 'Hacksaw Blade',                                             qty: 2,   unit: 'pkt',  remarks: '' },
      { material: 'Masion Rubber Hand Gloves (Orange)',                       qty: 50,  unit: 'pair', remarks: '' },
      { material: 'First Aid Kit (Big Size)',                                  qty: 1,   unit: 'nos',  remarks: '' },
      { material: 'Insulation Tape for safety harness — Green',               qty: 10,  unit: 'nos',  remarks: '' },
      { material: 'Insulation Tape for safety harness — Yellow',              qty: 10,  unit: 'nos',  remarks: '' },
      { material: 'Insulation Tape for safety harness — Blue',                qty: 10,  unit: 'nos',  remarks: '' },
      { material: 'Insulation Tape for safety harness — Black',               qty: 10,  unit: 'nos',  remarks: '' },
      { material: 'Safety Shoe for Labour size 6',                            qty: 20,  unit: 'pair', remarks: '' },
      { material: 'Safety Shoe for Labour size 7',                            qty: 15,  unit: 'pair', remarks: '' },
      { material: 'Safety Shoe for Labour size 8',                            qty: 25,  unit: 'pair', remarks: '' },
      { material: 'Safety Shoe for Labour size 9',                            qty: 15,  unit: 'pair', remarks: '' },
      { material: 'Safety Shoe for Labour size 10',                           qty: 5,   unit: 'pair', remarks: '' },
      { material: 'Safety Shoe for Labour size 11',                           qty: 5,   unit: 'pair', remarks: '' },
      { material: 'Safety Helmet White',                                       qty: 20,  unit: 'nos',  remarks: '' },
      { material: 'Safety Helmet Yellow',                                      qty: 30,  unit: 'nos',  remarks: '' },
      { material: 'Safety Helmet Blue',                                        qty: 10,  unit: 'nos',  remarks: '' },
      { material: 'Cotton Hand Gloves',                                        qty: 100, unit: 'pair', remarks: '' },
      { material: 'Cut Resistance Hand Gloves',                               qty: 50,  unit: 'pair', remarks: '' },
      { material: 'Orange Safety Jacket',                                      qty: 50,  unit: 'nos',  remarks: '' },
      { material: 'Staff Jacket Green with company logo',                     qty: 30,  unit: 'nos',  remarks: '' },
      { material: 'Black Goggles (for Welder)',                               qty: 5,   unit: 'nos',  remarks: '' },
      { material: 'Welding Hood Lens Weld Crft 8 (11x8.5x0.5cm)',            qty: 10,  unit: 'nos',  remarks: '' },
      { material: 'Alcohol Detector',                                          qty: 1,   unit: 'nos',  remarks: '' },
      { material: 'Right Angle',                                               qty: 10,  unit: 'nos',  remarks: '' },
      { material: 'Coconut Broom',                                             qty: 30,  unit: 'nos',  remarks: '' },
      { material: 'Soft Broom',                                                qty: 15,  unit: 'nos',  remarks: '' },
      { material: 'Allen Key Box',                                             qty: 1,   unit: 'set',  remarks: '' },
      { material: 'Sheet Screw 25mm',                                          qty: 10,  unit: 'box',  remarks: '' },
      { material: 'Shovel (Belcha)',                                           qty: 15,  unit: 'nos',  remarks: '' },
      { material: 'Waterproofing Tape',                                        qty: 20,  unit: 'nos',  remarks: '' },
      { material: 'PVC Bond',                                                  qty: 20,  unit: 'nos',  remarks: '' },
      { material: 'MS Bond',                                                   qty: 20,  unit: 'nos',  remarks: '' },
      { material: 'Wheel Barrow',                                              qty: 5,   unit: 'nos',  remarks: '' },
      { material: 'Wheel Barrow Bearing',                                      qty: 10,  unit: 'nos',  remarks: '' },
      { material: 'Carpenter Hammer',                                          qty: 10,  unit: 'nos',  remarks: '' },
      { material: 'Wire Bush',                                                 qty: 30,  unit: 'nos',  remarks: '' },
      { material: 'GI Bucket 5 Ltr',                                          qty: 15,  unit: 'nos',  remarks: '' },
      { material: 'Reflector Sheet for Total Station',                        qty: 5,   unit: 'sheet',remarks: '' },
      { material: 'Crow Bar',                                                  qty: 5,   unit: 'nos',  remarks: '' },
      { material: 'Water Level 30 mtr',                                        qty: 10,  unit: 'roll', remarks: '' },
      { material: 'Spirit Level 30 mtr',                                       qty: 6,   unit: 'nos',  remarks: '' },
      { material: 'Measurement Tape 5 mtr',                                   qty: 6,   unit: 'nos',  remarks: '' },
      { material: 'Measurement Tape 30 mtr',                                  qty: 2,   unit: 'nos',  remarks: '' },
      { material: '2 inch Delivery Hose with Hose Roll',                      qty: 300, unit: 'mtr',  remarks: '' },
      { material: '2 inch Hose Roll',                                          qty: 300, unit: 'mtr',  remarks: '' },
      { material: '2 inch Hose Connector with clip',                          qty: 10,  unit: 'nos',  remarks: '' },
      { material: '1.25 inch Hose Pipe',                                       qty: 300, unit: 'mtr',  remarks: '' },
      { material: '1.25 inch Hose Connector',                                  qty: 20,  unit: 'nos',  remarks: '' },
      { material: '1.25 inch Hose Clip',                                       qty: 20,  unit: 'nos',  remarks: '' },
      { material: 'Wire Rope Ceiling 3 ton 3 mtr',                            qty: 2,   unit: 'nos',  remarks: '' },
      { material: 'Wire Rope Ceiling 6 ton 6 mtr',                            qty: 2,   unit: 'nos',  remarks: '' },
      { material: 'Wire Rope Ceiling 6 ton 3 mtr',                            qty: 2,   unit: 'nos',  remarks: '' },
      { material: 'Wire Rope Ceiling 10 ton 6 mtr',                           qty: 2,   unit: 'nos',  remarks: '' },
      { material: 'D-Shackle 5.0 ton',                                         qty: 2,   unit: 'nos',  remarks: '' },
      { material: 'D-Shackle 8.0 ton',                                         qty: 2,   unit: 'nos',  remarks: '' },
      { material: 'D-Shackle 8.5 ton',                                         qty: 2,   unit: 'nos',  remarks: '' },
      { material: 'D-Shackle 6.5 ton',                                         qty: 2,   unit: 'nos',  remarks: '' },
      { material: 'Cubes Register',                                            qty: 5,   unit: 'nos',  remarks: '' },
      { material: 'Slump Register',                                            qty: 5,   unit: 'nos',  remarks: '' },
      { material: 'Full Body Safety Display Mannequin 6 feet',                qty: 1,   unit: 'nos',  remarks: 'for mock drill safety display' },
      { material: 'Fire Bucket',                                               qty: 6,   unit: 'nos',  remarks: '' },
      { material: 'Ladder Aluminium 4 mtr',                                   qty: 3,   unit: 'nos',  remarks: '' },
      { material: 'Ladder Aluminium 3 mtr',                                   qty: 2,   unit: 'nos',  remarks: '' },
      { material: 'Electrical Earth Resistance Tester',                       qty: 1,   unit: 'nos',  remarks: '' },
      { material: 'RCCB Tester',                                              qty: 1,   unit: 'nos',  remarks: '' },
      { material: 'Insulation Tape for safety harness — Red',                 qty: 10,  unit: 'nos',  remarks: '' },
      { material: 'Belt Polyester Webbing Sling 5 ton capacity 5 mtr',       qty: 2,   unit: 'nos',  remarks: '' },
      { material: '8 ton Wire Rope Sling 5 mtr length',                       qty: 2,   unit: 'nos',  remarks: '' },
      { material: '6.7 ton 4-leg Chain Sling with Shackle (installation model)', qty: 1, unit: 'nos', remarks: '' },
      { material: '8.5 ton Bow Shackle',                                       qty: 4,   unit: 'nos',  remarks: '' },
    ],
  },

];

// ── Main ──────────────────────────────────────────────────────────────────────
(async () => {
  const client = await pool.connect();
  try {
    // Find project WDIRY0151
    const projRes = await client.query(
      `SELECT id, name, project_code, company_id FROM projects
       WHERE is_active = true AND LOWER(project_code) = 'wdiry0151'`
    );
    if (!projRes.rows.length) {
      console.error('❌ Project WDIRY0151 not found.');
      process.exit(1);
    }
    const proj = projRes.rows[0];
    console.log(`\nTarget project: "${proj.name}"  (${proj.id})\n`);

    // Find admin user
    const userRes = await client.query(
      `SELECT id, name FROM users
       WHERE company_id = $1 AND is_active = true AND role IN ('super_admin','admin')
       ORDER BY created_at ASC LIMIT 1`,
      [proj.company_id]
    );
    if (!userRes.rows.length) { console.error('❌ No admin user found.'); process.exit(1); }
    const raisedBy = userRes.rows[0];
    console.log(`Raised by: ${raisedBy.name}\n`);

    // Check duplicates
    const inserted = [], skipped = [], toInsert = [];
    for (const mr of MRS) {
      const dup = await client.query(
        `SELECT id FROM material_requisitions WHERE serial_no_formatted = $1`, [mr.serial]
      );
      if (dup.rows.length) {
        skipped.push(mr.serial);
      } else {
        toInsert.push(mr);
      }
    }

    if (skipped.length) {
      console.log(`⚠️  Already exist (will skip): ${skipped.join(', ')}\n`);
    }

    console.log('MRs to insert:');
    toInsert.forEach(mr => {
      console.log(`  ${mr.serial}  ${mr.date}  (${mr.items.length} items)`);
    });
    console.log(`\nTotal: ${toInsert.length} MRs, ${toInsert.reduce((s,m)=>s+m.items.length,0)} line items`);

    if (!DO_CREATE) {
      console.log('\n(DRY RUN — nothing inserted. Re-run with --create to commit.)\n');
      return;
    }

    // Insert each MR
    await client.query('BEGIN');
    for (const mr of toInsert) {
      const mrRes = await client.query(
        `INSERT INTO material_requisitions (
           project_id, mrs_number, serial_no_formatted, department,
           head_office_project_name, required_by, priority, remarks,
           raised_by, status, created_at
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'pending',$10) RETURNING id`,
        [proj.id, mr.serial, mr.serial, DEPT, proj.name,
         mr.required, 'medium', mr.narration, raisedBy.id, mr.date]
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
      inserted.push(mr.serial);
      console.log(`  ✅ ${mr.serial}  (${mr.items.length} items)`);
    }
    await client.query('COMMIT');

    console.log(`\n✅ Done — inserted ${inserted.length} MRs, ${toInsert.reduce((s,m)=>s+m.items.length,0)} line items.`);
    if (skipped.length) console.log(`   Skipped (already existed): ${skipped.join(', ')}`);
    console.log(`   Note: MR-034 was not inserted (42-page PDF — unreadable by tool).\n`);

  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('\n❌ Error:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
})();
