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

export const BCIM_BILLING_ADDRESS_DEFAULT = `BCIM Engineering Private Limited
No 579, 1st 'A' Main Road, Jayanagar 8th Block, Bangalore – 560070
GSTIN: 29AAXCB2929P1Z1 | Tel: +91 80 26650194
Email: procurement@bcimengineering.in`;

// Billing address (BCIM's own address, as the buyer) — varies per project/company entity.
export function getBillingAddress(projectCode) {
  return projectCode === 'LH-10' ? BCIM_BILLING_ADDRESS_LANCO : BCIM_BILLING_ADDRESS_DEFAULT;
}

// Delivery address (site address) — known fixed addresses for some projects,
// otherwise built from the project's location/city/state.
export function getDeliveryAddress(project) {
  if (!project) return '';
  if (project.project_code === 'LH-10') return LANCO_DELIVERY_ADDRESS;
  const lines = [project.name].filter(Boolean);
  if (project.location) lines.push(project.location);
  const cityState = [project.city, project.state].filter(Boolean).join(', ');
  if (cityState) lines.push(cityState);
  return lines.join('\n');
}
