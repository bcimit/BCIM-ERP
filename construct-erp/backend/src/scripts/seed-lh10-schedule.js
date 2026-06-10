/**
 * Seed script — LH-10 Project Planning Schedule
 * Project : Lanco Hills LH-10
 * Source  : LH10 Schedule Dt.13-05-26.pdf
 *
 * Run from backend/  folder:
 *   node src/scripts/seed-lh10-schedule.js
 *
 * What it does:
 *   1. Finds the LH-10 project in the DB
 *   2. Deletes ALL existing project_activities for that project
 *   3. Inserts the full schedule from the PDF (per-floor + building-wide)
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool(
  process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }
    : {
        host:     process.env.DB_HOST     || 'localhost',
        port:     process.env.DB_PORT     || 5432,
        database: process.env.DB_NAME     || 'constructerp',
        user:     process.env.DB_USER     || 'postgres',
        password: process.env.DB_PASSWORD || '',
      }
);

// ─── Schedule data parsed from PDF ───────────────────────────────────────────
// Columns:  floor | code | name | activity_type | start (YYYY-MM-DD) | end
//
// Work type mapping:
//   SCAFFOLD   = Scaffolding & Safety Net Works
//   DEBRIS     = Existing Debris Removal
//   DISMANTLE  = Blockwork Dismantling Works & removal from floor
//   BLOCKWORK  = Blockwork
//   PLASTER    = Plastering
//   EXT-LH09   = External Plastering – Towards LH09 Side
//   EXT-POOL   = External Plastering – Towards Pool Side
//   EXT-RAMP   = External Plastering – Towards Basement Ramp Side
//   EXT-LH08   = External Plastering – Towards LH08 Side
//   WP-1/WP-2  = Waterproofing (Sunken & Non-Sunken Areas) phases
//   SCREED-1/2 = Screed (Sunken Filling Areas) phases

const SCHEDULE = [
  // ── Terrace Floor (Blockwork + Plastering + External LH09) ──────────────
  ['Terrace Floor','TERR-BLOCKWORK',  'Blockwork',                             'structural', '2026-09-02','2026-09-05'],
  ['Terrace Floor','TERR-PLASTER',    'Plastering',                            'finishing',  '2026-10-17','2026-11-05'],
  ['Terrace Floor','TERR-EXT-LH09',   'External Plastering – LH09 Side',       'finishing',  '2026-11-15','2026-12-01'],

  // ── 29th Floor ─────────────────────────────────────────────────────────
  ['29th Floor','F29-SCAFFOLD',   'Scaffolding & Safety Net Works',            'other',      '2026-08-29','2026-09-01'],
  ['29th Floor','F29-BLOCKWORK',  'Blockwork',                                 'structural', '2026-10-01','2026-10-19'],
  ['29th Floor','F29-PLASTER',    'Plastering',                                'finishing',  '2026-10-30','2026-11-14'],
  ['29th Floor','F29-EXT-LH09',   'External Plastering – LH09 Side',           'finishing',  '2026-11-03','2026-11-16'],
  ['29th Floor','F29-EXT-LH08',   'External Plastering – LH08 Side',           'finishing',  '2026-10-31','2026-11-02'],

  // ── 28th Floor ─────────────────────────────────────────────────────────
  ['28th Floor','F28-SCAFFOLD',   'Scaffolding & Safety Net Works',            'other',      '2026-08-25','2026-08-28'],
  ['28th Floor','F28-BLOCKWORK',  'Blockwork',                                 'structural', '2026-10-11','2026-10-29'],
  ['28th Floor','F28-PLASTER',    'Plastering',                                'finishing',  '2026-11-06','2026-11-21'],
  ['28th Floor','F28-EXT-LH09',   'External Plastering – LH09 Side',           'finishing',  '2026-11-10','2026-11-23'],
  ['28th Floor','F28-EXT-LH08',   'External Plastering – LH08 Side',           'finishing',  '2026-11-06','2026-11-07'],

  // ── 27th Floor ─────────────────────────────────────────────────────────
  ['27th Floor','F27-SCAFFOLD',   'Scaffolding & Safety Net Works',            'other',      '2026-08-21','2026-08-24'],
  ['27th Floor','F27-BLOCKWORK',  'Blockwork',                                 'structural', '2026-09-24','2026-10-12'],
  ['27th Floor','F27-PLASTER',    'Plastering',                                'finishing',  '2026-10-19','2026-11-05'],
  ['27th Floor','F27-EXT-LH09',   'External Plastering – LH09 Side',           'finishing',  '2026-10-25','2026-11-06'],
  ['27th Floor','F27-EXT-LH08',   'External Plastering – LH08 Side',           'finishing',  '2026-10-21','2026-10-22'],

  // ── 26th Floor ─────────────────────────────────────────────────────────
  ['26th Floor','F26-SCAFFOLD',   'Scaffolding & Safety Net Works',            'other',      '2026-08-18','2026-08-20'],
  ['26th Floor','F26-BLOCKWORK',  'Blockwork',                                 'structural', '2026-10-20','2026-11-06'],
  ['26th Floor','F26-PLASTER',    'Plastering',                                'finishing',  '2026-11-14','2026-12-01'],
  ['26th Floor','F26-EXT-LH09',   'External Plastering – LH09 Side',           'finishing',  '2026-11-21','2026-12-05'],
  ['26th Floor','F26-EXT-LH08',   'External Plastering – LH08 Side',           'finishing',  '2026-11-17','2026-11-18'],

  // ── 25th Floor ─────────────────────────────────────────────────────────
  ['25th Floor','F25-SCAFFOLD',   'Scaffolding & Safety Net Works',            'other',      '2026-08-13','2026-08-17'],
  ['25th Floor','F25-BLOCKWORK',  'Blockwork',                                 'structural', '2026-10-03','2026-10-22'],
  ['25th Floor','F25-PLASTER',    'Plastering',                                'finishing',  '2026-10-29','2026-11-13'],
  ['25th Floor','F25-EXT-LH09',   'External Plastering – LH09 Side',           'finishing',  '2026-11-02','2026-11-14'],
  ['25th Floor','F25-EXT-LH08',   'External Plastering – LH08 Side',           'finishing',  '2026-10-29','2026-10-30'],

  // ── 24th Floor ─────────────────────────────────────────────────────────
  ['24th Floor','F24-SCAFFOLD',   'Scaffolding & Safety Net Works',            'other',      '2026-08-10','2026-08-12'],
  ['24th Floor','F24-BLOCKWORK',  'Blockwork',                                 'structural', '2026-09-22','2026-10-09'],
  ['24th Floor','F24-PLASTER',    'Plastering',                                'finishing',  '2026-10-18','2026-11-04'],
  ['24th Floor','F24-EXT-LH09',   'External Plastering – LH09 Side',           'finishing',  '2026-10-25','2026-11-06'],
  ['24th Floor','F24-EXT-LH08',   'External Plastering – LH08 Side',           'finishing',  '2026-10-21','2026-10-22'],

  // ── 23rd Floor (full 7 work types) ─────────────────────────────────────
  ['23rd Floor','F23-SCAFFOLD',   'Scaffolding & Safety Net Works',            'other',      '2026-08-06','2026-08-08'],
  ['23rd Floor','F23-DEBRIS',     'Existing Debris Removal',                   'civil',      '2026-07-16','2026-07-22'],
  ['23rd Floor','F23-DISMANTLE',  'Blockwork Dismantling Works',               'civil',      '2026-08-06','2026-08-17'],
  ['23rd Floor','F23-BLOCKWORK',  'Blockwork',                                 'structural', '2026-09-07','2026-09-24'],
  ['23rd Floor','F23-PLASTER',    'Plastering',                                'finishing',  '2026-10-01','2026-10-17'],
  ['23rd Floor','F23-EXT-LH09',   'External Plastering – LH09 Side',           'finishing',  '2026-10-06','2026-10-19'],
  ['23rd Floor','F23-EXT-LH08',   'External Plastering – LH08 Side',           'finishing',  '2026-10-02','2026-10-03'],

  // ── 22nd Floor ─────────────────────────────────────────────────────────
  ['22nd Floor','F22-SCAFFOLD',   'Scaffolding & Safety Net Works',            'other',      '2026-08-03','2026-08-05'],
  ['22nd Floor','F22-DEBRIS',     'Existing Debris Removal',                   'civil',      '2026-07-15','2026-07-21'],
  ['22nd Floor','F22-DISMANTLE',  'Blockwork Dismantling Works',               'civil',      '2026-08-16','2026-08-24'],
  ['22nd Floor','F22-BLOCKWORK',  'Blockwork',                                 'structural', '2026-09-11','2026-09-29'],
  ['22nd Floor','F22-PLASTER',    'Plastering',                                'finishing',  '2026-10-10','2026-10-28'],
  ['22nd Floor','F22-EXT-LH09',   'External Plastering – LH09 Side',           'finishing',  '2026-10-17','2026-11-02'],
  ['22nd Floor','F22-EXT-LH08',   'External Plastering – LH08 Side',           'finishing',  '2026-10-13','2026-10-14'],

  // ── 21st Floor ─────────────────────────────────────────────────────────
  ['21st Floor','F21-SCAFFOLD',   'Scaffolding & Safety Net Works',            'other',      '2026-07-30','2026-08-01'],
  ['21st Floor','F21-DEBRIS',     'Existing Debris Removal',                   'civil',      '2026-07-12','2026-07-17'],
  ['21st Floor','F21-DISMANTLE',  'Blockwork Dismantling Works',               'civil',      '2026-08-06','2026-08-17'],
  ['21st Floor','F21-BLOCKWORK',  'Blockwork',                                 'structural', '2026-08-25','2026-09-12'],
  ['21st Floor','F21-PLASTER',    'Plastering',                                'finishing',  '2026-09-23','2026-10-09'],
  ['21st Floor','F21-EXT-LH09',   'External Plastering – LH09 Side',           'finishing',  '2026-09-28','2026-10-12'],
  ['21st Floor','F21-EXT-LH08',   'External Plastering – LH08 Side',           'finishing',  '2026-09-25','2026-09-26'],

  // ── 20th Floor ─────────────────────────────────────────────────────────
  ['20th Floor','F20-SCAFFOLD',   'Scaffolding & Safety Net Works',            'other',      '2026-07-27','2026-07-29'],
  ['20th Floor','F20-DEBRIS',     'Existing Debris Removal',                   'civil',      '2026-07-08','2026-07-14'],
  ['20th Floor','F20-DISMANTLE',  'Blockwork Dismantling Works',               'civil',      '2026-07-28','2026-08-05'],
  ['20th Floor','F20-BLOCKWORK',  'Blockwork',                                 'structural', '2026-09-05','2026-09-23'],
  ['20th Floor','F20-PLASTER',    'Plastering',                                'finishing',  '2026-10-02','2026-10-17'],
  ['20th Floor','F20-EXT-LH09',   'External Plastering – LH09 Side',           'finishing',  '2026-10-06','2026-10-19'],
  ['20th Floor','F20-EXT-LH08',   'External Plastering – LH08 Side',           'finishing',  '2026-10-02','2026-10-03'],

  // ── 19th Floor ─────────────────────────────────────────────────────────
  ['19th Floor','F19-SCAFFOLD',   'Scaffolding & Safety Net Works',            'other',      '2026-07-23','2026-07-25'],
  ['19th Floor','F19-DEBRIS',     'Existing Debris Removal',                   'civil',      '2026-07-04','2026-07-10'],
  ['19th Floor','F19-DISMANTLE',  'Blockwork Dismantling Works',               'civil',      '2026-07-22','2026-07-30'],
  ['19th Floor','F19-BLOCKWORK',  'Blockwork',                                 'structural', '2026-08-19','2026-09-07'],
  ['19th Floor','F19-PLASTER',    'Plastering',                                'finishing',  '2026-09-16','2026-10-01'],
  ['19th Floor','F19-EXT-LH09',   'External Plastering – LH09 Side',           'finishing',  '2026-09-21','2026-10-05'],
  ['19th Floor','F19-EXT-LH08',   'External Plastering – LH08 Side',           'finishing',  '2026-09-17','2026-09-18'],

  // ── 18th Floor ─────────────────────────────────────────────────────────
  ['18th Floor','F18-SCAFFOLD',   'Scaffolding & Safety Net Works',            'other',      '2026-07-20','2026-07-22'],
  ['18th Floor','F18-DEBRIS',     'Existing Debris Removal',                   'civil',      '2026-07-06','2026-07-11'],
  ['18th Floor','F18-DISMANTLE',  'Blockwork Dismantling Works',               'civil',      '2026-07-28','2026-08-05'],
  ['18th Floor','F18-BLOCKWORK',  'Blockwork',                                 'structural', '2026-09-16','2026-10-03'],
  ['18th Floor','F18-PLASTER',    'Plastering',                                'finishing',  '2026-10-11','2026-10-28'],
  ['18th Floor','F18-EXT-LH09',   'External Plastering – LH09 Side',           'finishing',  '2026-10-17','2026-11-02'],
  ['18th Floor','F18-EXT-LH08',   'External Plastering – LH08 Side',           'finishing',  '2026-10-13','2026-10-14'],

  // ── 17th Floor ─────────────────────────────────────────────────────────
  ['17th Floor','F17-SCAFFOLD',   'Scaffolding & Safety Net Works',            'other',      '2026-07-16','2026-07-18'],
  ['17th Floor','F17-DEBRIS',     'Existing Debris Removal',                   'civil',      '2026-07-02','2026-07-08'],
  ['17th Floor','F17-DISMANTLE',  'Blockwork Dismantling Works',               'civil',      '2026-07-22','2026-07-30'],
  ['17th Floor','F17-BLOCKWORK',  'Blockwork',                                 'structural', '2026-08-29','2026-09-17'],
  ['17th Floor','F17-PLASTER',    'Plastering',                                'finishing',  '2026-09-24','2026-10-10'],
  ['17th Floor','F17-EXT-LH09',   'External Plastering – LH09 Side',           'finishing',  '2026-09-29','2026-10-13'],
  ['17th Floor','F17-EXT-LH08',   'External Plastering – LH08 Side',           'finishing',  '2026-09-25','2026-09-26'],

  // ── 16th Floor ─────────────────────────────────────────────────────────
  ['16th Floor','F16-SCAFFOLD',   'Scaffolding & Safety Net Works',            'other',      '2026-07-13','2026-07-15'],
  ['16th Floor','F16-DEBRIS',     'Existing Debris Removal',                   'civil',      '2026-06-27','2026-07-03'],
  ['16th Floor','F16-DISMANTLE',  'Blockwork Dismantling Works',               'civil',      '2026-07-13','2026-07-21'],
  ['16th Floor','F16-BLOCKWORK',  'Blockwork',                                 'structural', '2026-08-18','2026-09-05'],
  ['16th Floor','F16-PLASTER',    'Plastering',                                'finishing',  '2026-09-13','2026-09-29'],
  ['16th Floor','F16-EXT-LH09',   'External Plastering – LH09 Side',           'finishing',  '2026-09-18','2026-10-01'],
  ['16th Floor','F16-EXT-LH08',   'External Plastering – LH08 Side',           'finishing',  '2026-09-14','2026-09-15'],

  // ── 15th Floor ─────────────────────────────────────────────────────────
  ['15th Floor','F15-SCAFFOLD',   'Scaffolding & Safety Net Works',            'other',      '2026-07-09','2026-07-11'],
  ['15th Floor','F15-DEBRIS',     'Existing Debris Removal',                   'civil',      '2026-06-22','2026-06-29'],
  ['15th Floor','F15-DISMANTLE',  'Blockwork Dismantling Works',               'civil',      '2026-07-07','2026-07-15'],
  ['15th Floor','F15-BLOCKWORK',  'Blockwork',                                 'structural', '2026-07-31','2026-08-19'],
  ['15th Floor','F15-PLASTER',    'Plastering',                                'finishing',  '2026-08-26','2026-09-11'],
  ['15th Floor','F15-EXT-LH09',   'External Plastering – LH09 Side',           'finishing',  '2026-08-31','2026-09-15'],
  ['15th Floor','F15-EXT-LH08',   'External Plastering – LH08 Side',           'finishing',  '2026-08-27','2026-08-28'],

  // ── 14th Floor ─────────────────────────────────────────────────────────
  ['14th Floor','F14-SCAFFOLD',   'Scaffolding & Safety Net Works',            'other',      '2026-07-06','2026-07-08'],
  ['14th Floor','F14-DEBRIS',     'Existing Debris Removal',                   'civil',      '2026-06-24','2026-07-01'],
  ['14th Floor','F14-DISMANTLE',  'Blockwork Dismantling Works',               'civil',      '2026-07-13','2026-07-21'],
  ['14th Floor','F14-BLOCKWORK',  'Blockwork',                                 'structural', '2026-08-05','2026-08-24'],
  ['14th Floor','F14-PLASTER',    'Plastering',                                'finishing',  '2026-09-04','2026-09-21'],
  ['14th Floor','F14-EXT-LH09',   'External Plastering – LH09 Side',           'finishing',  '2026-09-10','2026-09-24'],
  ['14th Floor','F14-EXT-LH08',   'External Plastering – LH08 Side',           'finishing',  '2026-09-06','2026-09-07'],

  // ── 13th Floor ─────────────────────────────────────────────────────────
  ['13th Floor','F13-SCAFFOLD',   'Scaffolding & Safety Net Works',            'other',      '2026-07-02','2026-07-04'],
  ['13th Floor','F13-DEBRIS',     'Existing Debris Removal',                   'civil',      '2026-06-17','2026-06-23'],
  ['13th Floor','F13-DISMANTLE',  'Blockwork Dismantling Works',               'civil',      '2026-07-07','2026-07-15'],
  ['13th Floor','F13-BLOCKWORK',  'Blockwork',                                 'structural', '2026-07-22','2026-08-07'],
  ['13th Floor','F13-PLASTER',    'Plastering',                                'finishing',  '2026-08-18','2026-09-03'],
  ['13th Floor','F13-EXT-LH09',   'External Plastering – LH09 Side',           'finishing',  '2026-08-23','2026-09-07'],
  ['13th Floor','F13-EXT-LH08',   'External Plastering – LH08 Side',           'finishing',  '2026-08-19','2026-08-20'],

  // ── 12th Floor ─────────────────────────────────────────────────────────
  ['12th Floor','F12-SCAFFOLD',   'Scaffolding & Safety Net Works',            'other',      '2026-06-29','2026-07-01'],
  ['12th Floor','F12-DEBRIS',     'Existing Debris Removal',                   'civil',      '2026-06-15','2026-06-20'],
  ['12th Floor','F12-DISMANTLE',  'Blockwork Dismantling Works',               'civil',      '2026-06-28','2026-07-06'],
  ['12th Floor','F12-BLOCKWORK',  'Blockwork',                                 'structural', '2026-07-30','2026-08-18'],
  ['12th Floor','F12-PLASTER',    'Plastering',                                'finishing',  '2026-08-28','2026-09-15'],
  ['12th Floor','F12-EXT-LH09',   'External Plastering – LH09 Side',           'finishing',  '2026-09-04','2026-09-18'],
  ['12th Floor','F12-EXT-LH08',   'External Plastering – LH08 Side',           'finishing',  '2026-09-01','2026-09-02'],

  // ── 11th Floor ─────────────────────────────────────────────────────────
  ['11th Floor','F11-SCAFFOLD',   'Scaffolding & Safety Net Works',            'other',      '2026-06-24','2026-06-27'],
  ['11th Floor','F11-DEBRIS',     'Existing Debris Removal',                   'civil',      '2026-06-11','2026-06-17'],
  ['11th Floor','F11-DISMANTLE',  'Blockwork Dismantling Works',               'civil',      '2026-06-20','2026-06-30'],
  ['11th Floor','F11-BLOCKWORK',  'Blockwork',                                 'structural', '2026-07-15','2026-07-31'],
  ['11th Floor','F11-PLASTER',    'Plastering',                                'finishing',  '2026-08-09','2026-08-27'],
  ['11th Floor','F11-EXT-LH09',   'External Plastering – LH09 Side',           'finishing',  '2026-08-17','2026-08-31'],
  ['11th Floor','F11-EXT-LH08',   'External Plastering – LH08 Side',           'finishing',  '2026-08-13','2026-08-14'],

  // ── 10th Floor ─────────────────────────────────────────────────────────
  ['10th Floor','F10-SCAFFOLD',   'Scaffolding & Safety Net Works',            'other',      '2026-06-20','2026-06-23'],
  ['10th Floor','F10-DEBRIS',     'Existing Debris Removal',                   'civil',      '2026-06-10','2026-06-16'],
  ['10th Floor','F10-DISMANTLE',  'Blockwork Dismantling Works',               'civil',      '2026-06-27','2026-07-06'],
  ['10th Floor','F10-BLOCKWORK',  'Blockwork',                                 'structural', '2026-08-10','2026-08-28'],
  ['10th Floor','F10-PLASTER',    'Plastering',                                'finishing',  '2026-09-07','2026-09-23'],
  ['10th Floor','F10-EXT-LH09',   'External Plastering – LH09 Side',           'finishing',  '2026-09-12','2026-09-26'],
  ['10th Floor','F10-EXT-LH08',   'External Plastering – LH08 Side',           'finishing',  '2026-09-08','2026-09-09'],

  // ── 9th Floor ──────────────────────────────────────────────────────────
  ['9th Floor','F09-SCAFFOLD',    'Scaffolding & Safety Net Works',            'other',      '2026-06-17','2026-06-19'],
  ['9th Floor','F09-DEBRIS',      'Existing Debris Removal',                   'civil',      '2026-06-06','2026-06-12'],
  ['9th Floor','F09-DISMANTLE',   'Blockwork Dismantling Works',               'civil',      '2026-06-19','2026-06-29'],
  ['9th Floor','F09-BLOCKWORK',   'Blockwork',                                 'structural', '2026-07-25','2026-08-12'],
  ['9th Floor','F09-PLASTER',     'Plastering',                                'finishing',  '2026-08-19','2026-09-05'],
  ['9th Floor','F09-EXT-LH09',    'External Plastering – LH09 Side',           'finishing',  '2026-08-25','2026-09-09'],
  ['9th Floor','F09-EXT-LH08',    'External Plastering – LH08 Side',           'finishing',  '2026-08-22','2026-08-24'],

  // ── 8th Floor ──────────────────────────────────────────────────────────
  ['8th Floor','F08-SCAFFOLD',    'Scaffolding & Safety Net Works',            'other',      '2026-06-13','2026-06-16'],
  ['8th Floor','F08-DEBRIS',      'Existing Debris Removal',                   'civil',      '2026-06-03','2026-06-09'],
  ['8th Floor','F08-DISMANTLE',   'Blockwork Dismantling Works',               'civil',      '2026-06-11','2026-06-19'],
  ['8th Floor','F08-BLOCKWORK',   'Blockwork',                                 'structural', '2026-07-14','2026-07-30'],
  ['8th Floor','F08-PLASTER',     'Plastering',                                'finishing',  '2026-08-06','2026-08-24'],
  ['8th Floor','F08-EXT-LH09',    'External Plastering – LH09 Side',           'finishing',  '2026-08-13','2026-08-28'],
  ['8th Floor','F08-EXT-LH08',    'External Plastering – LH08 Side',           'finishing',  '2026-08-09','2026-08-11'],

  // ── 7th Floor ──────────────────────────────────────────────────────────
  ['7th Floor','F07-SCAFFOLD',    'Scaffolding & Safety Net Works',            'other',      '2026-06-10','2026-06-12'],
  ['7th Floor','F07-DEBRIS',      'Existing Debris Removal',                   'civil',      '2026-05-26','2026-06-02'],
  ['7th Floor','F07-DISMANTLE',   'Blockwork Dismantling Works',               'civil',      '2026-06-05','2026-06-13'],
  ['7th Floor','F07-BLOCKWORK',   'Blockwork',                                 'structural', '2026-06-19','2026-07-14'],
  ['7th Floor','F07-PLASTER',     'Plastering',                                'finishing',  '2026-07-21','2026-08-05'],
  ['7th Floor','F07-EXT-LH09',    'External Plastering – LH09 Side',           'finishing',  '2026-07-26','2026-08-07'],
  ['7th Floor','F07-EXT-LH08',    'External Plastering – LH08 Side',           'finishing',  '2026-07-22','2026-07-23'],

  // ── 6th Floor ──────────────────────────────────────────────────────────
  ['6th Floor','F06-SCAFFOLD',    'Scaffolding & Safety Net Works',            'other',      '2026-06-06','2026-06-09'],
  ['6th Floor','F06-DEBRIS',      'Existing Debris Removal',                   'civil',      '2026-05-31','2026-06-05'],
  ['6th Floor','F06-DISMANTLE',   'Blockwork Dismantling Works',               'civil',      '2026-06-10','2026-06-18'],
  ['6th Floor','F06-BLOCKWORK',   'Blockwork',                                 'structural', '2026-07-05','2026-07-21'],
  ['6th Floor','F06-PLASTER',     'Plastering',                                'finishing',  '2026-07-30','2026-08-17'],
  ['6th Floor','F06-EXT-LH09',    'External Plastering – LH09 Side',           'finishing',  '2026-08-06','2026-08-21'],
  ['6th Floor','F06-EXT-LH08',    'External Plastering – LH08 Side',           'finishing',  '2026-08-03','2026-08-04'],

  // ── 5th Floor ──────────────────────────────────────────────────────────
  ['5th Floor','F05-SCAFFOLD',    'Scaffolding & Safety Net Works',            'other',      '2026-06-03','2026-06-05'],
  ['5th Floor','F05-DEBRIS',      'Existing Debris Removal',                   'civil',      '2026-05-26','2026-06-02'],
  ['5th Floor','F05-DISMANTLE',   'Blockwork Dismantling Works',               'civil',      '2026-06-04','2026-06-12'],
  ['5th Floor','F05-BLOCKWORK',   'Blockwork',                                 'structural', '2026-06-12','2026-07-07'],
  ['5th Floor','F05-PLASTER',     'Plastering',                                'finishing',  '2026-07-14','2026-07-29'],
  ['5th Floor','F05-EXT-LH09',    'External Plastering – LH09 Side',           'finishing',  '2026-07-18','2026-07-31'],
  ['5th Floor','F05-EXT-LH08',    'External Plastering – LH08 Side',           'finishing',  '2026-07-14','2026-07-15'],

  // ── 4th Floor ──────────────────────────────────────────────────────────
  ['4th Floor','F04-SCAFFOLD',    'Scaffolding & Safety Net Works',            'other',      '2026-05-30','2026-06-02'],
  ['4th Floor','F04-DEBRIS',      'Existing Debris Removal',                   'civil',      '2026-05-19','2026-05-25'],
  ['4th Floor','F04-DISMANTLE',   'Blockwork Dismantling Works',               'civil',      '2026-05-26','2026-06-04'],
  ['4th Floor','F04-BLOCKWORK',   'Blockwork',                                 'structural', '2026-06-28','2026-07-14'],
  ['4th Floor','F04-PLASTER',     'Plastering',                                'finishing',  '2026-07-23','2026-08-07'],
  ['4th Floor','F04-EXT-LH09',    'External Plastering – LH09 Side',           'finishing',  '2026-07-27','2026-08-08'],
  ['4th Floor','F04-EXT-LH08',    'External Plastering – LH08 Side',           'finishing',  '2026-07-23','2026-07-24'],

  // ── 3rd Floor ──────────────────────────────────────────────────────────
  ['3rd Floor','F03-SCAFFOLD',    'Scaffolding & Safety Net Works',            'other',      '2026-05-27','2026-05-29'],
  ['3rd Floor','F03-DEBRIS',      'Existing Debris Removal',                   'civil',      '2026-05-15','2026-05-21'],
  ['3rd Floor','F03-DISMANTLE',   'Blockwork Dismantling Works',               'civil',      '2026-05-19','2026-05-28'],
  ['3rd Floor','F03-BLOCKWORK',   'Blockwork',                                 'structural', '2026-06-05','2026-06-30'],
  ['3rd Floor','F03-PLASTER',     'Plastering',                                'finishing',  '2026-07-07','2026-07-22'],
  ['3rd Floor','F03-EXT-LH09',    'External Plastering – LH09 Side',           'finishing',  '2026-07-11','2026-07-24'],
  ['3rd Floor','F03-EXT-LH08',    'External Plastering – LH08 Side',           'finishing',  '2026-07-07','2026-07-08'],

  // ── 2nd Floor ──────────────────────────────────────────────────────────
  ['2nd Floor','F02-SCAFFOLD',    'Scaffolding & Safety Net Works',            'other',      '2026-05-23','2026-05-26'],
  ['2nd Floor','F02-DEBRIS',      'Existing Debris Removal',                   'civil',      '2026-05-18','2026-05-23'],
  ['2nd Floor','F02-DISMANTLE',   'Blockwork Dismantling Works',               'civil',      '2026-05-25','2026-06-03'],
  ['2nd Floor','F02-BLOCKWORK',   'Blockwork',                                 'structural', '2026-07-08','2026-07-24'],
  ['2nd Floor','F02-PLASTER',     'Plastering',                                'finishing',  '2026-07-31','2026-08-18'],
  ['2nd Floor','F02-EXT-LH09',    'External Plastering – LH09 Side',           'finishing',  '2026-08-08','2026-08-24'],
  ['2nd Floor','F02-EXT-LH08',    'External Plastering – LH08 Side',           'finishing',  '2026-08-04','2026-08-05'],

  // ── 1st Floor ──────────────────────────────────────────────────────────
  ['1st Floor','F01-SCAFFOLD',    'Scaffolding & Safety Net Works',            'other',      '2026-05-15','2026-05-22'],
  ['1st Floor','F01-DEBRIS',      'Existing Debris Removal',                   'civil',      '2026-05-13','2026-05-19'],
  ['1st Floor','F01-DISMANTLE',   'Blockwork Dismantling Works',               'civil',      '2026-05-18','2026-05-26'],
  ['1st Floor','F01-BLOCKWORK',   'Blockwork',                                 'structural', '2026-06-23','2026-07-10'],
  ['1st Floor','F01-PLASTER',     'Plastering',                                'finishing',  '2026-07-15','2026-07-30'],
  ['1st Floor','F01-EXT-LH09',    'External Plastering – LH09 Side',           'finishing',  '2026-07-19','2026-07-31'],
  ['1st Floor','F01-EXT-LH08',    'External Plastering – LH08 Side',           'finishing',  '2026-07-16','2026-07-17'],

  // ── Ground Floor (no Scaffolding) ──────────────────────────────────────
  ['Ground Floor','GF-DEBRIS',    'Existing Debris Removal',                   'civil',      '2026-05-29','2026-06-22'],
  ['Ground Floor','GF-DISMANTLE', 'Blockwork Dismantling Works',               'civil',      '2026-06-29','2026-07-14'],
  ['Ground Floor','GF-BLOCKWORK', 'Blockwork',                                 'structural', '2026-07-03','2026-07-16'],
  ['Ground Floor','GF-EXT-LH08',  'External Plastering – LH08 Side',           'finishing',  '2026-06-29','2026-06-30'],

  // ── Building-wide: Waterproofing & Screed ───────────────────────────────
  ['All Floors','BLDG-WP-1',      'Waterproofing – Sunken & Non-Sunken Areas (Phase 1)', 'finishing', '2026-11-06','2026-12-24'],
  ['All Floors','BLDG-WP-2',      'Waterproofing – Sunken & Non-Sunken Areas (Phase 2)', 'finishing', '2026-12-25','2027-02-11'],
  ['All Floors','BLDG-SCREED-1',  'Screed – Sunken Filling Areas (Phase 1)',             'finishing', '2027-02-12','2027-04-05'],
  ['All Floors','BLDG-SCREED-2',  'Screed – Sunken Filling Areas (Phase 2)',             'finishing', '2027-04-06','2027-05-25'],
];

// ─── Main ────────────────────────────────────────────────────────────────────
async function run() {
  const client = await pool.connect();
  try {
    // 1. Find the LH-10 project
    const projectRes = await client.query(
      `SELECT id, name, project_code FROM projects
       WHERE project_code ILIKE '%LH-10%'
          OR project_code ILIKE '%LH10%'
          OR name ILIKE '%LH-10%'
          OR name ILIKE '%Lanco Hills LH10%'
       LIMIT 1`
    );
    if (projectRes.rows.length === 0) {
      console.error('ERROR: No project found matching LH-10. Check project_code in the projects table.');
      process.exit(1);
    }
    const project = projectRes.rows[0];
    console.log(`Found project: "${project.name}" (code: ${project.project_code}, id: ${project.id})`);

    await client.query('BEGIN');

    // 2. Delete existing activities
    const delRes = await client.query(
      'DELETE FROM project_activities WHERE project_id = $1',
      [project.id]
    );
    console.log(`Deleted ${delRes.rowCount} existing activities.`);

    // 3. Insert new schedule
    let inserted = 0;
    for (const [floor, code, name, actType, start, end] of SCHEDULE) {
      const startDate = new Date(start);
      const endDate   = new Date(end);
      const duration  = Math.max(1, Math.ceil((endDate - startDate) / 86400000) + 1);

      await client.query(
        `INSERT INTO project_activities
           (project_id, activity_code, activity_name, location,
            activity_type, baseline_start_date, baseline_end_date,
            baseline_duration, status, progress_pct)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'planned',0)`,
        [project.id, code, name, floor, actType, start, end, duration]
      );
      inserted++;
    }

    await client.query('COMMIT');
    console.log(`\n✓ Inserted ${inserted} activities for project "${project.name}".`);
    console.log('  Schedule spans: Ground Floor → Terrace + Building-wide Waterproofing & Screed.');
    console.log('  Date range: 13 May 2026 → 25 May 2027.');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('ERROR — rolled back:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
