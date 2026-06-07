// src/context/LanguageContext.jsx
// Lightweight translation context — no external library needed
import React, { createContext, useContext, useState, useCallback } from 'react';

// ── Translation dictionaries ────────────────────────────────────────────────
const TRANSLATIONS = {
  en: {}, // English: key === value, so t(key) returns key itself

  ta: {
    // ── App shell ──
    'Search…': 'தேடு…',
    'Logout': 'வெளியேறு',
    'Language': 'மொழி',

    // ── Nav groups ──
    'Overview':          'மேலோட்டம்',
    'Planning':          'திட்டமிடல்',
    'HR & Admin':        'HR & நிர்வாகம்',
    'Procurement':       'கொள்முதல்',
    'Stores':            'கிடங்கு',
    'Subcontractors':    'துணை ஒப்பந்தக்காரர்கள்',
    'QS & Billing':      'QS & கட்டண நிர்வாகம்',
    'Finance':           'நிதி',
    'Bill Tracker':      'பில் கண்காணிப்பு',
    'Quality (QA/QC)':   'தரம் (QA/QC)',
    'HSE & Safety':      'HSE & பாதுகாப்பு',
    'CRM & Reports':     'CRM & அறிக்கைகள்',
    'Assets & IT':       'சொத்துக்கள் & IT',
    'Documents':         'ஆவணங்கள்',
    'Administration':    'நிர்வாகம்',

    // ── Nav items ──
    'Dashboard':              'டாஷ்போர்டு',
    'Projects':               'திட்டங்கள்',
    'P&E Dashboard':          'P&E டாஷ்போர்டு',
    'Schedule & Activities':  'அட்டவணை & செயல்பாடுகள்',
    'Milestones':             'மைல்கற்கள்',
    'Look-Ahead Plan':        'முன்னோக்கு திட்டம்',
    'Progress & S-Curve':     'முன்னேற்றம் & S-வளைவு',
    'Delay Analysis':         'தாமத பகுப்பாய்வு',
    'Employees':              'ஊழியர்கள்',
    'Attendance':             'வருகைப்பதிவு',
    'Leave Management':       'விடுப்பு மேலாண்மை',
    'Payroll':                'சம்பளம்',
    'Salary Structures':      'சம்பள அமைப்புகள்',
    'Departments':            'துறைகள்',
    'Holiday Calendar':       'விடுமுறை அட்டவணை',
    'Loans & Advances':       'கடன்கள் & முன்பணம்',
    'Expense Claims':         'செலவு கோரிக்கைகள்',
    'Appraisals':             'மதிப்பீடுகள்',
    'HR Reports':             'HR அறிக்கைகள்',
    'Import from Greythr':    'Greythr இல் இருந்து இறக்கு',
    'ESSL Biometric Sync':    'ESSL பயோமெட்ரிக் ஒத்திசைவு',
    'Daily Progress (DPR)':   'தினசரி முன்னேற்றம் (DPR)',
    'Site Workers':           'தள தொழிலாளர்கள்',
    'Worker Attendance':      'தொழிலாளர் வருகை',
    'Worker Payroll':         'தொழிலாளர் சம்பளம்',
    'Vendors':                'விற்பனையாளர்கள்',
    'Quotations & CS':        'மேற்கோள்கள் & CS',
    'Purchase Orders':        'கொள்முதல் ஆர்டர்கள்',
    'Inventory':              'சரக்கு',
    'GRN':                    'GRN',
    'Material Requisition':   'பொருள் கோரிக்கை',
    'Issue Notes (MIN)':      'வழங்கல் குறிப்புகள்',
    'Store Ledger':           'கிடங்கு பேரேடு',
    'Work Orders':            'வேலை ஆர்டர்கள்',
    'Measurement Book':       'அளவுக்கட்டு நோட்டு',
    'Sub-Con RA Bills':       'துணை ஒப்பந்த RA பில்கள்',
    'BOQ & Estimation':       'BOQ & மதிப்பீடு',
    'RA Bills':               'RA பில்கள்',
    'Material Recon':         'பொருள் சரிபார்ப்பு',
    'QS Reports':             'QS அறிக்கைகள்',
    'GST Billing':            'GST கட்டணம்',
    'TDS Register':           'TDS பதிவு',
    'Vendor Payables':        'விற்பனையாளர் செலுத்தல்',
    'Budget vs Actual':       'பட்ஜெட் vs உண்மையான',
    'Payments':               'பணம் செலுத்துதல்',
    'Billing Reports':        'கட்டண அறிக்கைகள்',
    'Finance Intelligence':   'நிதி நுண்ணறிவு',
    'Bill Tracker Dashboard': 'பில் கண்காணிப்பு டாஷ்போர்டு',
    'All Bills':              'அனைத்து பில்கள்',
    'Pending Bills':          'நிலுவை பில்கள்',
    'Stores Queue':           'கிடங்கு வரிசை',
    'QS Certification':       'QS சான்றிதழ்',
    'Accounts':               'கணக்குகள்',
    'Paid Bills':             'செலுத்தப்பட்ட பில்கள்',
    'Material Tracker':       'பொருள் கண்காணிப்பு',
    'Reports':                'அறிக்கைகள்',
    'Analytics':              'பகுப்பாய்வு',
    'QA/QC Hub':              'QA/QC மையம்',
    'RFI Ledger':             'RFI பேரேடு',
    'Document Control':       'ஆவண கட்டுப்பாடு',
    'Checklist Masters':      'சரிபார்ப்பு பட்டியல்',
    'Snag List':              'குறைபாடு பட்டியல்',
    'Safety Dashboard':       'பாதுகாப்பு டாஷ்போர்டு',
    'Incident Hub':           'சம்பவ மையம்',
    'Permit to Work':         'பணி அனுமதி',
    'PPE Tracking':           'PPE கண்காணிப்பு',
    'Client Bookings':        'வாடிக்கையாளர் முன்பதிவுகள்',
    'Asset Register':         'சொத்து பதிவு',
    'IT Assets':              'IT சொத்துக்கள்',
    'Help Desk':              'உதவி மேசை',
    'Licenses & AMC':         'உரிமங்கள் & AMC',
    'Document Repository':    'ஆவண இடம்',
    'Team Members':           'குழு உறுப்பினர்கள்',

    // ── NEW — Missing nav groups ──
    'DMS':                    'ஆவண மேலாண்மை',
    'Tender Management':      'டெண்டர் மேலாண்மை',
    'Automation Ideas':       'தானியக்க கருத்துக்கள்',

    // ── My Approvals ──
    'My Approvals':           'என் அங்கீகாரங்கள்',

    // ── Planning extras ──
    'P6 EVM Dashboard':       'P6 EVM டாஷ்போர்டு',
    'WBS Editor':             'WBS திருத்தி',
    'Risk Register':          'ஆபத்து பதிவு',
    'Material Plan (MRP)':    'பொருள் திட்டம் (MRP)',

    // ── Procurement extras ──
    'RFQ':                    'விலை கோரிக்கை',
    'Comparative Statements': 'ஒப்பீட்டு அறிக்கைகள்',
    'PO Amendments':          'PO திருத்தங்கள்',
    'PO Register':            'PO பதிவு',
    'Import POs (Bulk)':      'PO இறக்குமதி (தொகுதி)',
    'WO Register':            'WO பதிவு',
    'Import WOs (Bulk)':      'WO இறக்குமதி (தொகுதி)',
    'Vendor Performance':     'விற்பனையாளர் செயல்திறன்',
    'Vendor Payments':        'விற்பனையாளர் பணம்',
    'Vendor–Project Mapping': 'விற்பனையாளர்–திட்ட இணைப்பு',
    'Live Rate Checker':      'நேரடி விலை சரிபார்ப்பு',
    'Rate Contracts':         'விலை ஒப்பந்தங்கள்',
    'Tender Register':        'டெண்டர் பதிவு',
    'Tender Issuance':        'டெண்டர் வழங்கல்',
    'Bid Opportunities':      'ஏல வாய்ப்புகள்',
    'Material Request (MRS)': 'பொருள் கோரிக்கை (MRS)',

    // ── Stores extras ──
    'Stores Dashboard':       'கிடங்கு டாஷ்போர்டு',
    'GRN Receiving':          'GRN பெறுதல்',
    'Stock Report':           'சரக்கு அறிக்கை',

    // ── QS & Billing extras ──
    'QS Dashboard':           'QS டாஷ்போர்டு',
    'BOQ SC Mapping':         'BOQ SC இணைப்பு',
    'BOQ Margin Dashboard':   'BOQ லாப டாஷ்போர்டு',
    'Vendor QS Certification':'விற்பனையாளர் QS சான்று',
    'Retention Release':      'தக்கல் வெளியீடு',
    'Variation Orders':       'மாற்றம் ஆர்டர்கள்',

    // ── Finance extras ──
    'Finance Dashboard':      'நிதி டாஷ்போர்டு',
    'Accounts Dashboard':     'கணக்கு டாஷ்போர்டு',
    'Vendor Invoices':        'விற்பனையாளர் விலைப்பட்டியல்',
    'Bill Booking':           'பில் பதிவு',
    'Payment Run':            'பணம் செலுத்தல் இயக்கம்',
    'Customer Statements':    'வாடிக்கையாளர் அறிக்கைகள்',
    'Bank Reconciliation':    'வங்கி சரிபார்ப்பு',
    'Cheque Tracker':         'காசோலை கண்காணிப்பு',
    'Petty Cash':             'சிறு பணம்',
    'GST':                    'GST',
    'TDS':                    'TDS',
    'Management MIS':         'மேலாண்மை MIS',
    'Cash Flow':              'பணப் பாய்வு',
    'Cost Report':            'செலவு அறிக்கை',

    // ── HR extras ──
    'HR Dashboard':           'HR டாஷ்போர்டு',
    'ESSL Biometric':         'ESSL பயோமெட்ரிக்',
    'Import Data':            'தரவு இறக்குமதி',

    // ── Bill Tracker extras ──
    'Bills':                  'பில்கள்',
    'Transmittal':            'பரிமாற்றல்',
    'Liability Register':     'பொறுப்பு பதிவு',
    'Advance Tracker':        'முன்பணம் கண்காணிப்பு',
    'Deduction Register':     'கழிவு பதிவு',
    'WO Bill Register':       'WO பில் பதிவு',

    // ── QA/QC extras ──
    'QA/QC Dashboard':        'QA/QC டாஷ்போர்டு',
    'ITP Register':           'ITP பதிவு',
    'Method Statements':      'முறை அறிக்கைகள்',
    'RFI / WIR Ledger':       'RFI / WIR பேரேடு',
    'Material Inspection':    'பொருள் ஆய்வு',
    'Test Certificates':      'சோதனை சான்றிதழ்கள்',
    'Lab Certifications':     'ஆய்வக சான்றுகள்',
    'Pour Cards':             'ஊற்று அட்டைகள்',
    'NCR Ledger':             'NCR பேரேடு',
    'Quality Audits':         'தர தணிக்கைகள்',
    'QA/QC Reports':          'QA/QC அறிக்கைகள்',

    // ── HSE extras ──

    // ── Assets extras ──
    'Asset Dashboard':        'சொத்து டாஷ்போர்டு',
    'Asset Categories':       'சொத்து வகைகள்',
    'Asset Master':           'சொத்து பட்டியல்',
    'Asset Tracking':         'சொத்து கண்காணிப்பு',
    'Allocation / Issuance':  'ஒதுக்கீடு / வழங்கல்',
    'Maintenance Management': 'பராமரிப்பு மேலாண்மை',
    'Disposal / Scrap':       'அகற்றல் / கழிவு',
    'Documents & Permits':    'ஆவணங்கள் & அனுமதிகள்',
    'Fuel & Usage Logs':      'எரிபொருள் & பயன்பாடு',
    'Depreciation':           'தேய்மானம்',
    'Reports & Analytics':    'அறிக்கைகள் & பகுப்பாய்வு',
    'Alerts & Notifications': 'எச்சரிக்கைகள் & அறிவிப்புகள்',
    'Roles & Permissions':    'பங்கு & அனுமதிகள்',
    'IT Register':            'IT பதிவு',
    'Licenses / AMC':         'உரிமங்கள் / AMC',
    'Module Documents':       'தொகுதி ஆவணங்கள்',

    // ── Subcontractor module ──
    'Subcontractor Master':         'துணை ஒப்பந்தக்காரர் பதிவு',
    'Work Order Management':        'வேலை ஆர்டர் மேலாண்மை',
    'Labour / Worker Attendance':   'தொழிலாளர் வருகைப்பதிவு',
    'Work Progress Entry':          'பணி முன்னேற்ற பதிவு',
    'Bill Preparation':             'பில் தயாரிப்பு',
    'Bill Approval':                'பில் அங்கீகாரம்',
    'Payment Tracking':             'பணம் கண்காணிப்பு',
    'Retention / Deductions':       'தக்கல் / கழிவுகள்',

    // ── Other ──
    'Ideas Dashboard':        'கருத்துக்கள் டாஷ்போர்டு',
    'Approval Engine':        'அங்கீகார இயந்திரம்',
    'Reports Hub':            'அறிக்கை மையம்',
    'Settings':               'அமைப்புகள்',
  },

  kn: {
    // ── App shell ──
    'Search…': 'ಹುಡುಕಿ…',
    'Logout': 'ನಿರ್ಗಮಿಸಿ',
    'Language': 'ಭಾಷೆ',

    // ── Nav groups ──
    'Overview':          'ಅವಲೋಕನ',
    'Planning':          'ಯೋಜನೆ',
    'HR & Admin':        'HR & ಆಡಳಿತ',
    'Procurement':       'ಖರೀದಿ',
    'Stores':            'ಗೋದಾಮು',
    'Subcontractors':    'ಉಪ-ಗುತ್ತಿಗೆದಾರರು',
    'QS & Billing':      'QS & ಬಿಲ್ಲಿಂಗ್',
    'Finance':           'ಹಣಕಾಸು',
    'Bill Tracker':      'ಬಿಲ್ ಟ್ರ್ಯಾಕರ್',
    'Quality (QA/QC)':   'ಗುಣಮಟ್ಟ (QA/QC)',
    'HSE & Safety':      'HSE & ಸುರಕ್ಷತೆ',
    'CRM & Reports':     'CRM & ವರದಿಗಳು',
    'Assets & IT':       'ಆಸ್ತಿಗಳು & IT',
    'Documents':         'ದಾಖಲೆಗಳು',
    'Administration':    'ಆಡಳಿತ',

    // ── Nav items ──
    'Dashboard':              'ಡ್ಯಾಶ್‌ಬೋರ್ಡ್',
    'Projects':               'ಯೋಜನೆಗಳು',
    'P&E Dashboard':          'P&E ಡ್ಯಾಶ್‌ಬೋರ್ಡ್',
    'Schedule & Activities':  'ವೇಳಾಪಟ್ಟಿ & ಚಟುವಟಿಕೆಗಳು',
    'Milestones':             'ಮೈಲಿಗಲ್ಲುಗಳು',
    'Look-Ahead Plan':        'ಮುಂದಿನ ಯೋಜನೆ',
    'Progress & S-Curve':     'ಪ್ರಗತಿ & S-ವಕ್ರರೇಖೆ',
    'Delay Analysis':         'ವಿಳಂಬ ವಿಶ್ಲೇಷಣೆ',
    'Employees':              'ಉದ್ಯೋಗಿಗಳು',
    'Attendance':             'ಹಾಜರಾತಿ',
    'Leave Management':       'ರಜೆ ನಿರ್ವಹಣೆ',
    'Payroll':                'ಸಂಬಳ',
    'Salary Structures':      'ಸಂಬಳ ರಚನೆಗಳು',
    'Departments':            'ವಿಭಾಗಗಳು',
    'Holiday Calendar':       'ರಜಾ ಕ್ಯಾಲೆಂಡರ್',
    'Loans & Advances':       'ಸಾಲಗಳು & ಮುಂಗಡ',
    'Expense Claims':         'ವೆಚ್ಚ ಕ್ಲೇಮ್‌ಗಳು',
    'Appraisals':             'ಮೌಲ್ಯಮಾಪನಗಳು',
    'HR Reports':             'HR ವರದಿಗಳು',
    'Import from Greythr':    'Greythr ನಿಂದ ಆಮದು',
    'ESSL Biometric Sync':    'ESSL ಬಯೋಮೆಟ್ರಿಕ್ ಸಿಂಕ್',
    'Daily Progress (DPR)':   'ದೈನಂದಿನ ಪ್ರಗತಿ (DPR)',
    'Site Workers':           'ಸೈಟ್ ಕಾರ್ಮಿಕರು',
    'Worker Attendance':      'ಕಾರ್ಮಿಕ ಹಾಜರಾತಿ',
    'Worker Payroll':         'ಕಾರ್ಮಿಕ ಸಂಬಳ',
    'Vendors':                'ಮಾರಾಟಗಾರರು',
    'Quotations & CS':        'ಕೋಟೇಶನ್‌ಗಳು & CS',
    'Purchase Orders':        'ಖರೀದಿ ಆದೇಶಗಳು',
    'Inventory':              'ದಾಸ್ತಾನು',
    'GRN':                    'GRN',
    'Material Requisition':   'ವಸ್ತು ವಿನಂತಿ',
    'Issue Notes (MIN)':      'ವಿತರಣೆ ಟಿಪ್ಪಣಿಗಳು',
    'Store Ledger':           'ಗೋದಾಮು ಲೆಡ್ಜರ್',
    'Work Orders':            'ಕೆಲಸದ ಆದೇಶಗಳು',
    'Measurement Book':       'ಅಳತೆ ಪುಸ್ತಕ',
    'Sub-Con RA Bills':       'ಉಪ-ಗುತ್ತಿಗೆ RA ಬಿಲ್‌ಗಳು',
    'BOQ & Estimation':       'BOQ & ಅಂದಾಜು',
    'RA Bills':               'RA ಬಿಲ್‌ಗಳು',
    'Material Recon':         'ವಸ್ತು ಸಾಮಂಜಸ್ಯ',
    'QS Reports':             'QS ವರದಿಗಳು',
    'GST Billing':            'GST ಬಿಲ್ಲಿಂಗ್',
    'TDS Register':           'TDS ನೋಂದಣಿ',
    'Vendor Payables':        'ಮಾರಾಟಗಾರ ಪಾವತಿ',
    'Budget vs Actual':       'ಬಜೆಟ್ vs ನೈಜ',
    'Payments':               'ಪಾವತಿಗಳು',
    'Billing Reports':        'ಬಿಲ್ಲಿಂಗ್ ವರದಿಗಳು',
    'Finance Intelligence':   'ಹಣಕಾಸು ಬುದ್ಧಿಮತ್ತೆ',
    'Bill Tracker Dashboard': 'ಬಿಲ್ ಟ್ರ್ಯಾಕರ್ ಡ್ಯಾಶ್‌ಬೋರ್ಡ್',
    'All Bills':              'ಎಲ್ಲಾ ಬಿಲ್‌ಗಳು',
    'Pending Bills':          'ಬಾಕಿ ಬಿಲ್‌ಗಳು',
    'Stores Queue':           'ಗೋದಾಮು ಸರದಿ',
    'QS Certification':       'QS ಪ್ರಮಾಣೀಕರಣ',
    'Accounts':               'ಖಾತೆಗಳು',
    'Paid Bills':             'ಪಾವತಿಸಿದ ಬಿಲ್‌ಗಳು',
    'Material Tracker':       'ವಸ್ತು ಟ್ರ್ಯಾಕರ್',
    'Reports':                'ವರದಿಗಳು',
    'Analytics':              'ವಿಶ್ಲೇಷಣೆ',
    'QA/QC Hub':              'QA/QC ಕೇಂದ್ರ',
    'RFI Ledger':             'RFI ಲೆಡ್ಜರ್',
    'Document Control':       'ದಾಖಲೆ ನಿಯಂತ್ರಣ',
    'Checklist Masters':      'ಚೆಕ್‌ಲಿಸ್ಟ್ ಮಾಸ್ಟರ್ಸ್',
    'Snag List':              'ದೋಷ ಪಟ್ಟಿ',
    'Safety Dashboard':       'ಸುರಕ್ಷತೆ ಡ್ಯಾಶ್‌ಬೋರ್ಡ್',
    'Incident Hub':           'ಘಟನೆ ಕೇಂದ್ರ',
    'Permit to Work':         'ಕೆಲಸದ ಅನುಮತಿ',
    'PPE Tracking':           'PPE ಟ್ರ್ಯಾಕಿಂಗ್',
    'Client Bookings':        'ಗ್ರಾಹಕ ಬುಕಿಂಗ್‌ಗಳು',
    'Asset Register':         'ಆಸ್ತಿ ನೋಂದಣಿ',
    'IT Assets':              'IT ಆಸ್ತಿಗಳು',
    'Help Desk':              'ಸಹಾಯ ಮೇಜು',
    'Licenses & AMC':         'ಪರವಾನಗಿಗಳು & AMC',
    'Document Repository':    'ದಾಖಲೆ ಭಂಡಾರ',
    'Team Members':           'ತಂಡದ ಸದಸ್ಯರು',

    // ── NEW — Missing nav groups ──
    'DMS':                    'ಡಾಕ್ಯುಮೆಂಟ್ ನಿರ್ವಹಣೆ',
    'Tender Management':      'ಟೆಂಡರ್ ನಿರ್ವಹಣೆ',
    'Automation Ideas':       'ಯಾಂತ್ರೀಕರಣ ಕಲ್ಪನೆಗಳು',

    // ── My Approvals ──
    'My Approvals':           'ನನ್ನ ಅನುಮೋದನೆಗಳು',

    // ── Planning extras ──
    'P6 EVM Dashboard':       'P6 EVM ಡ್ಯಾಶ್‌ಬೋರ್ಡ್',
    'WBS Editor':             'WBS ಸಂಪಾದಕ',
    'Risk Register':          'ಅಪಾಯ ನೋಂದಣಿ',
    'Material Plan (MRP)':    'ವಸ್ತು ಯೋಜನೆ (MRP)',

    // ── Procurement extras ──
    'RFQ':                    'ಬೆಲೆ ವಿನಂತಿ',
    'Comparative Statements': 'ತುಲನಾತ್ಮಕ ಹೇಳಿಕೆಗಳು',
    'PO Amendments':          'PO ತಿದ್ದುಪಡಿಗಳು',
    'PO Register':            'PO ನೋಂದಣಿ',
    'Import POs (Bulk)':      'PO ಆಮದು (ಸಾಮೂಹಿಕ)',
    'WO Register':            'WO ನೋಂದಣಿ',
    'Import WOs (Bulk)':      'WO ಆಮದು (ಸಾಮೂಹಿಕ)',
    'Vendor Performance':     'ಮಾರಾಟಗಾರ ಕಾರ್ಯಕ್ಷಮತೆ',
    'Vendor Payments':        'ಮಾರಾಟಗಾರ ಪಾವತಿ',
    'Vendor–Project Mapping': 'ಮಾರಾಟಗಾರ–ಯೋಜನೆ ಮ್ಯಾಪಿಂಗ್',
    'Live Rate Checker':      'ನೇರ ದರ ಪರಿಶೀಲಕ',
    'Rate Contracts':         'ದರ ಒಪ್ಪಂದಗಳು',
    'Tender Register':        'ಟೆಂಡರ್ ನೋಂದಣಿ',
    'Tender Issuance':        'ಟೆಂಡರ್ ನೀಡಿಕೆ',
    'Bid Opportunities':      'ಬಿಡ್ ಅವಕಾಶಗಳು',
    'Material Request (MRS)': 'ವಸ್ತು ವಿನಂತಿ (MRS)',

    // ── Stores extras ──
    'Stores Dashboard':       'ಗೋದಾಮು ಡ್ಯಾಶ್‌ಬೋರ್ಡ್',
    'GRN Receiving':          'GRN ಸ್ವೀಕರಣ',
    'Stock Report':           'ಸ್ಟಾಕ್ ವರದಿ',

    // ── QS & Billing extras ──
    'QS Dashboard':           'QS ಡ್ಯಾಶ್‌ಬೋರ್ಡ್',
    'BOQ SC Mapping':         'BOQ SC ಮ್ಯಾಪಿಂಗ್',
    'BOQ Margin Dashboard':   'BOQ ಮಾರ್ಜಿನ್ ಡ್ಯಾಶ್‌ಬೋರ್ಡ್',
    'Vendor QS Certification':'ಮಾರಾಟಗಾರ QS ಪ್ರಮಾಣೀಕರಣ',
    'Retention Release':      'ಉಳಿಕೆ ಬಿಡುಗಡೆ',
    'Variation Orders':       'ಬದಲಾವಣೆ ಆದೇಶಗಳು',

    // ── Finance extras ──
    'Finance Dashboard':      'ಹಣಕಾಸು ಡ್ಯಾಶ್‌ಬೋರ್ಡ್',
    'Accounts Dashboard':     'ಲೆಕ್ಕ ಡ್ಯಾಶ್‌ಬೋರ್ಡ್',
    'Vendor Invoices':        'ಮಾರಾಟಗಾರ ಇನ್‌ವಾಯ್ಸ್',
    'Bill Booking':           'ಬಿಲ್ ನೋಂದಣಿ',
    'Payment Run':            'ಪಾವತಿ ರನ್',
    'Customer Statements':    'ಗ್ರಾಹಕ ಹೇಳಿಕೆಗಳು',
    'Bank Reconciliation':    'ಬ್ಯಾಂಕ್ ಸಮನ್ವಯ',
    'Cheque Tracker':         'ಚೆಕ್ ಟ್ರ್ಯಾಕರ್',
    'Petty Cash':             'ಚಿಕ್ಕ ನಗದು',
    'GST':                    'GST',
    'TDS':                    'TDS',
    'Management MIS':         'ನಿರ್ವಹಣಾ MIS',
    'Cash Flow':              'ನಗದು ಹರಿವು',
    'Cost Report':            'ವೆಚ್ಚ ವರದಿ',

    // ── HR extras ──
    'HR Dashboard':           'HR ಡ್ಯಾಶ್‌ಬೋರ್ಡ್',
    'ESSL Biometric':         'ESSL ಬಯೋಮೆಟ್ರಿಕ್',
    'Import Data':            'ಡೇಟಾ ಆಮದು',

    // ── Bill Tracker extras ──
    'Bills':                  'ಬಿಲ್‌ಗಳು',
    'Transmittal':            'ಪ್ರಸಾರ',
    'Liability Register':     'ಹೊಣೆಗಾರಿಕೆ ನೋಂದಣಿ',
    'Advance Tracker':        'ಮುಂಗಡ ಟ್ರ್ಯಾಕರ್',
    'Deduction Register':     'ಕಡಿತ ನೋಂದಣಿ',
    'WO Bill Register':       'WO ಬಿಲ್ ನೋಂದಣಿ',

    // ── QA/QC extras ──
    'QA/QC Dashboard':        'QA/QC ಡ್ಯಾಶ್‌ಬೋರ್ಡ್',
    'ITP Register':           'ITP ನೋಂದಣಿ',
    'Method Statements':      'ವಿಧಾನ ಹೇಳಿಕೆಗಳು',
    'RFI / WIR Ledger':       'RFI / WIR ಲೆಡ್ಜರ್',
    'Material Inspection':    'ವಸ್ತು ತಪಾಸಣೆ',
    'Test Certificates':      'ಪರೀಕ್ಷಾ ಪ್ರಮಾಣಪತ್ರಗಳು',
    'Lab Certifications':     'ಪ್ರಯೋಗಾಲಯ ಪ್ರಮಾಣಗಳು',
    'Pour Cards':             'ಸುರಿಯುವ ಕಾರ್ಡ್‌ಗಳು',
    'NCR Ledger':             'NCR ಲೆಡ್ಜರ್',
    'Quality Audits':         'ಗುಣಮಟ್ಟ ಲೆಕ್ಕಪರಿಶೋಧನೆ',
    'QA/QC Reports':          'QA/QC ವರದಿಗಳು',

    // ── HSE extras ──

    // ── Assets extras ──
    'Asset Dashboard':        'ಆಸ್ತಿ ಡ್ಯಾಶ್‌ಬೋರ್ಡ್',
    'Asset Categories':       'ಆಸ್ತಿ ವಿಭಾಗಗಳು',
    'Asset Master':           'ಆಸ್ತಿ ಪಟ್ಟಿ',
    'Asset Tracking':         'ಆಸ್ತಿ ಟ್ರ್ಯಾಕಿಂಗ್',
    'Allocation / Issuance':  'ಹಂಚಿಕೆ / ನೀಡಿಕೆ',
    'Maintenance Management': 'ನಿರ್ವಹಣೆ ಮೇಲ್ವಿಚಾರಣೆ',
    'Disposal / Scrap':       'ವಿಲೇವಾರಿ / ತ್ಯಾಜ್ಯ',
    'Documents & Permits':    'ದಾಖಲೆಗಳು & ಪರವಾನಗಿಗಳು',
    'Fuel & Usage Logs':      'ಇಂಧನ & ಬಳಕೆ ದಾಖಲೆಗಳು',
    'Depreciation':           'ಸವಕಳಿ',
    'Reports & Analytics':    'ವರದಿಗಳು & ವಿಶ್ಲೇಷಣೆ',
    'Alerts & Notifications': 'ಎಚ್ಚರಿಕೆಗಳು & ಅಧಿಸೂಚನೆಗಳು',
    'Roles & Permissions':    'ಪಾತ್ರ & ಅನುಮತಿಗಳು',
    'IT Register':            'IT ನೋಂದಣಿ',
    'Licenses / AMC':         'ಪರವಾನಗಿಗಳು / AMC',
    'Module Documents':       'ಮಾಡ್ಯೂಲ್ ದಾಖಲೆಗಳು',

    // ── Subcontractor module ──
    'Subcontractor Master':         'ಉಪ-ಗುತ್ತಿಗೆದಾರ ನೋಂದಣಿ',
    'Work Order Management':        'ಕೆಲಸ ಆದೇಶ ನಿರ್ವಹಣೆ',
    'Labour / Worker Attendance':   'ಕಾರ್ಮಿಕ ಹಾಜರಾತಿ',
    'Work Progress Entry':          'ಕೆಲಸ ಪ್ರಗತಿ ನಮೂದು',
    'Bill Preparation':             'ಬಿಲ್ ತಯಾರಿ',
    'Bill Approval':                'ಬಿಲ್ ಅನುಮೋದನೆ',
    'Payment Tracking':             'ಪಾವತಿ ಟ್ರ್ಯಾಕಿಂಗ್',
    'Retention / Deductions':       'ಉಳಿಕೆ / ಕಡಿತಗಳು',

    // ── Other ──
    'Ideas Dashboard':        'ಕಲ್ಪನೆಗಳ ಡ್ಯಾಶ್‌ಬೋರ್ಡ್',
    'Approval Engine':        'ಅನುಮೋದನೆ ಎಂಜಿನ್',
    'Reports Hub':            'ವರದಿ ಕೇಂದ್ರ',
    'Settings':               'ಸೆಟ್ಟಿಂಗ್‌ಗಳು',
  },

  hi: {
    // ── App shell ──
    'Search…': 'खोजें…', 'Logout': 'लॉग आउट', 'Language': 'भाषा',
    // ── Nav groups ──
    'Overview':'अवलोकन','Planning':'योजना','HR & Admin':'HR & प्रशासन',
    'Procurement':'खरीद','Stores':'भंडार','Subcontractors':'उप-ठेकेदार',
    'QS & Billing':'QS & बिलिंग','Finance':'वित्त','Bill Tracker':'बिल ट्रैकर',
    'Quality (QA/QC)':'गुणवत्ता (QA/QC)','HSE & Safety':'HSE & सुरक्षा',
    'CRM & Reports':'CRM & रिपोर्ट','Assets & IT':'संपत्ति & IT',
    'Documents':'दस्तावेज़','Administration':'प्रशासन',
    'DMS':'दस्तावेज़ प्रबंधन','Tender Management':'निविदा प्रबंधन',
    'Automation Ideas':'स्वचालन विचार',
    // ── Nav items ──
    'Dashboard':'डैशबोर्ड','Projects':'परियोजनाएं','My Approvals':'मेरी स्वीकृतियां',
    'Employees':'कर्मचारी','Attendance':'उपस्थिति','Payroll':'वेतन',
    'Vendors':'विक्रेता','Purchase Orders':'खरीद आदेश','Work Orders':'कार्य आदेश',
    'GRN':'GRN','Inventory':'सूची','Material Requisition':'सामग्री अनुरोध',
    'BOQ & Estimation':'BOQ & अनुमान','BOQ SC Mapping':'BOQ SC मैपिंग',
    'BOQ Margin Dashboard':'BOQ मार्जिन डैशबोर्ड','RA Bills':'RA बिल',
    'Measurement Book':'माप पुस्तक','Payments':'भुगतान',
    'Bill Preparation':'बिल तैयारी','Bill Approval':'बिल अनुमोदन',
    'Payment Tracking':'भुगतान ट्रैकिंग','Retention / Deductions':'प्रतिधारण / कटौती',
    'Subcontractor Master':'उप-ठेकेदार मास्टर','Work Order Management':'कार्य आदेश प्रबंधन',
    'Labour / Worker Attendance':'मजदूर उपस्थिति','Work Progress Entry':'कार्य प्रगति प्रविष्टि',
    'Settings':'सेटिंग्स','Reports':'रिपोर्ट','Analytics':'विश्लेषण',
    'Asset Register':'संपत्ति रजिस्टर','IT Assets':'IT संपत्ति','Help Desk':'सहायता केंद्र',
    'Document Repository':'दस्तावेज़ भंडार','Team Members':'टीम सदस्य',
    'QA/QC Hub':'QA/QC केंद्र','NCR Ledger':'NCR लेजर','Safety Dashboard':'सुरक्षा डैशबोर्ड',
    'Incident Hub':'घटना केंद्र','Permit to Work':'कार्य अनुमति',
    'ESSL Biometric':'ESSL बायोमेट्रिक','Budget vs Actual':'बजट बनाम वास्तविक',
    'GST':'GST','TDS':'TDS',
  },
};

// ── Language metadata ────────────────────────────────────────────────────────
export const LANGUAGES = [
  { code: 'en', label: 'English',  native: 'English',  flag: '🇬🇧' },
  { code: 'ta', label: 'Tamil',    native: 'தமிழ்',    flag: '🇮🇳' },
  { code: 'kn', label: 'Kannada',  native: 'ಕನ್ನಡ',    flag: '🇮🇳' },
  { code: 'hi', label: 'Hindi',    native: 'हिन्दी',    flag: '🇮🇳' },
];

// ── Context ──────────────────────────────────────────────────────────────────
const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [language, setLanguageFn] = useState(
    () => localStorage.getItem('erpLang') || 'en'
  );

  const setLanguage = useCallback((code) => {
    setLanguageFn(code);
    localStorage.setItem('erpLang', code);
    // Update <html lang> for accessibility / font rendering
    document.documentElement.lang = code;
  }, []);

  // Translate a string — falls back to the key itself (English default)
  const t = useCallback((key) => {
    if (language === 'en' || !key) return key;
    return TRANSLATIONS[language]?.[key] ?? key;
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

// ── Hook ─────────────────────────────────────────────────────────────────────
export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used inside <LanguageProvider>');
  return ctx;
}
