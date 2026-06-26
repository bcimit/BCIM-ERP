// src/constants/poAddresses.js
// Shared billing/delivery address lookups used by both the PO creation wizard
// (auto-fill on project selection) and the PO print template, so the printed
// PO and the entered data always agree.

export const LANCO_DELIVERY_ADDRESS = `LANCO HILLS - LH10
LANCO Hills Residential Apartments, Tower - LH10,
Survey nos 201, Manikonda, Rajendranagar Mandal,
HYDERABAD - 500089
Contact Person BCIM: Mr. Vijayan - 82700 94285`;

export const BCIM_BILLING_ADDRESS_LANCO = `BCIM Engineering Private Limited
TOWER VIEW APARTMENT, NO 403, 4th FLOOR,
PLOT NO 26 & 27, SRI LAKSHMI NAGAR COLONY,
HYDERABAD, RANGAREDDY DIST, TELANGANA – 500089
GSTIN: 36AAHCB6485A1ZQ`;

export const BCIM_BILLING_ADDRESS_DEFAULT = `BCIM ENGINEERING PRIVATE LIMITED
#11, B Wing, Divyasree Chambers, O'Shaughnessy Road
Bangalore, Karnataka – 560025
GSTIN: 29AAHCB6485A1ZL`;

// Tolerant LANCO detection — project_code/name may appear as LH-10, LH10,
// LANCO, or LANCHO depending on how the project was created. Normalises by
// stripping spaces/hyphens and lower-casing before matching.
export function isLancoProject(...parts) {
  const s = parts.filter(Boolean).join(' ').toLowerCase().replace(/[\s-]/g, '');
  return s.includes('lanco') || s.includes('lancho') || s.includes('lh10');
}

// Billing address (BCIM's own address, as the buyer) — varies per project/company entity.
export function getBillingAddress(projectCode, projectName) {
  return isLancoProject(projectCode, projectName) ? BCIM_BILLING_ADDRESS_LANCO : BCIM_BILLING_ADDRESS_DEFAULT;
}

// Delivery address (site address) — known fixed addresses for some projects,
// otherwise built from the project's location/city/state.
export function getDeliveryAddress(project) {
  if (!project) return '';
  if (isLancoProject(project.project_code, project.name)) return LANCO_DELIVERY_ADDRESS;
  const lines = [project.name].filter(Boolean);
  if (project.location) lines.push(project.location);
  const cityState = [project.city, project.state].filter(Boolean).join(', ');
  if (cityState) lines.push(cityState);
  return lines.join('\n');
}
