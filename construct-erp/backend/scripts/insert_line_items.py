"""
Parses all 9 LANCO PO/WO Excel files and inserts po_items / work_order_items
directly into the database.
"""
import openpyxl
import psycopg2
from pathlib import Path

BASE = Path(r"H:\OFFICE PROJECTS\consrpro\construct-erp-local\construct-erp\backend\uploads\documents")

FILES = {
    "POLANLH10001": ("ab6d6cbc-7cab-457e-8f80-e745f55a8245.xlsx", "PO"),
    "POLANLH10002": ("94a51a26-50ff-4f4f-ad5f-a4eb0882d237.xlsx", "PO"),
    "POLANLH10003": ("2e158ead-d641-43c3-8830-acc8b0b44116.xlsx", "PO"),
    "POLANLH10004": ("1c692162-3d5a-4e97-9df5-14001921a462.xlsx", "PO"),
    "WOLANLH10001": ("54fd83bb-5275-4fc4-8f28-30321548f465.xlsx", "WO"),
    "WOLANLH10002": ("f6ccebac-d8c9-45a5-a3b7-c79202cb43f3.xlsx", "WO"),
    "WOLANLH10003": ("a509c8f2-8f6d-4280-900b-1837153b234b.xlsx", "WO"),
    "WOLANLH10004": ("dc72c6d9-2f40-4fd4-8fda-b48ae03151ad.xlsx", "WO"),
    "WOLANLH10005": ("ad2a805f-d79d-44c9-8c3a-433d28a4a788.xlsx", "WO"),
}

STOP_KEYWORDS = [
    "sub total", "subtotal", "grand total", "grandtotal",
    "basic amount", "cgst", "sgst", "igst", "net total",
    "rupees", "narration", "terms & conditions", "terms and conditions"
]
# First-cell EXACT matches that also trigger stop
STOP_EXACT = {"total", "grand total", "subtotal", "net total", "basic amount"}

def cell_str(c):
    v = c.value
    if v is None:
        return ""
    return str(v).strip().replace("\n", " ").replace("\r", " ")

def to_float(v):
    if v is None or str(v).strip() == "":
        return None
    try:
        return float(str(v).replace(",", "").strip())
    except:
        return None

def find_header_row(ws, keywords):
    """Find the row index where ALL of the given keywords appear."""
    rows = list(ws.iter_rows())
    for i, row in enumerate(rows):
        joined = " ".join(str(c.value or "").lower() for c in row)
        if all(k in joined for k in keywords):
            return i, rows
    return None, rows

def map_columns(hdr_row):
    """Returns dict of column name → column index from header row."""
    col = {}
    for j, c in enumerate(hdr_row):
        v = str(c.value or "").lower().strip()
        if "description" in v or "particular" in v:
            col.setdefault("desc", j)
        if "uom" in v or ("unit" in v and "amount" not in v):
            col.setdefault("unit", j)
        if "qty" in v or "quantity" in v:
            col.setdefault("qty", j)
        if "rate" in v and "gst" not in v:
            col.setdefault("rate", j)
        if "amount" in v and "gst" not in v and "total" not in v:
            col.setdefault("amount", j)
        if "hsn" in v:
            col.setdefault("hsn", j)
    return col

def is_stop_row(row):
    """Return True if row looks like a summary/footer row.
    Only checks the FIRST column, never description text.
    """
    first = str(row[0].value or "").lower().strip()
    # exact match
    if first in STOP_EXACT:
        return True
    # substring match (multi-word keywords like "cgst 9%")
    for kw in STOP_KEYWORDS:
        if kw in first:
            return True
    return False

def parse_po_items(ws):
    hi, rows = find_header_row(ws, ["description", "quantity"])
    if hi is None:
        hi, rows = find_header_row(ws, ["description", "rate"])
    if hi is None:
        print("  [WARN] PO header not found")
        return []

    col = map_columns(rows[hi])
    print(f"  Header row {hi+1}: columns -> {col}")

    items = []
    sort_order = 0
    for row in rows[hi + 1:]:
        if all(c.value is None for c in row):
            continue
        if is_stop_row(row):
            break

        desc  = cell_str(row[col.get("desc", 1)])
        unit  = cell_str(row[col.get("unit", 2)]) or "Nos"
        qty   = to_float(row[col.get("qty",  3)].value)
        rate  = to_float(row[col.get("rate", 4)].value)
        amt   = to_float(row[col.get("amount", 5)].value)
        hsn   = cell_str(row[col.get("hsn", 99)]) if "hsn" in col else None

        # Skip if no description and no qty/rate
        if not desc.strip() and qty is None and rate is None:
            continue

        if qty is None and rate is None:
            continue

        # Infer amount
        if amt is None and qty is not None and rate is not None:
            amt = round(qty * rate, 2)
        qty  = qty  or 0.0
        rate = rate or 0.0
        amt  = amt  or 0.0

        sort_order += 1
        items.append({
            "desc": desc, "unit": unit, "qty": qty,
            "rate": rate, "amount": amt, "hsn": hsn,
            "sort_order": sort_order,
        })
        print(f"    [{sort_order:2d}] {desc[:60]:<60}  qty={qty}  rate={rate}  amt={amt}")

    return items

def parse_wo_items(ws):
    hi, rows = find_header_row(ws, ["description", "rate"])
    if hi is None:
        hi, rows = find_header_row(ws, ["description", "amount"])
    if hi is None:
        print("  [WARN] WO header not found")
        return []

    col = map_columns(rows[hi])
    print(f"  Header row {hi+1}: columns -> {col}")

    items = []
    pending_desc = ""  # description from a title-only row preceding a data row

    for row in rows[hi + 1:]:
        if all(c.value is None for c in row):
            pending_desc = ""
            continue
        if is_stop_row(row):
            break

        desc  = cell_str(row[col.get("desc", 1)])
        unit  = cell_str(row[col.get("unit", 2)]) or "LS"
        qty   = to_float(row[col.get("qty",  3)].value)
        rate  = to_float(row[col.get("rate", 4)].value)

        # Row has no numeric data — treat as a title/preamble row
        if qty is None and rate is None:
            # If desc exists, remember it as potential item title for the next data row
            if desc.strip():
                pending_desc = desc
            continue

        # Row HAS qty or rate — it's a data row
        # Prefer the pending title (short name) if available; otherwise use this row's desc
        use_desc = (pending_desc + " - " + desc).strip(" -") if pending_desc else desc
        pending_desc = ""

        qty  = qty  or 1.0
        rate = rate or 0.0

        items.append({
            "desc": use_desc, "unit": unit,
            "qty": qty,       "rate": rate,
        })
        print(f"    {use_desc[:70]:<70}  qty={qty}  rate={rate}")

    return items

# ── Main ──────────────────────────────────────────────────────────────────────
conn = psycopg2.connect(
    host="localhost", dbname="construct_erp",
    user="postgres", password="asal@1989"
)
cur = conn.cursor()

try:
    for order_no, (fname, otype) in FILES.items():
        print(f"\n{'='*70}")
        print(f"Processing {order_no}  ({otype})")
        print(f"{'='*70}")

        wb = openpyxl.load_workbook(BASE / fname, data_only=True)
        ws = wb.active

        if otype == "PO":
            # Get PO id
            cur.execute("SELECT id FROM purchase_orders WHERE po_number = %s", (order_no,))
            row = cur.fetchone()
            if not row:
                print(f"  [SKIP] PO {order_no} not found in DB")
                continue
            po_id = row[0]

            # Clear existing items
            cur.execute("DELETE FROM po_items WHERE po_id = %s", (po_id,))
            print(f"  PO id: {po_id}")

            items = parse_po_items(ws)
            print(f"  → Inserting {len(items)} items...")

            for item in items:
                cur.execute("""
                    INSERT INTO po_items
                      (po_id, material_name, hsn_code, quantity, unit, rate,
                       gst_rate, gst_amount, total_amount, sort_order)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    po_id,
                    item["desc"][:200],
                    item["hsn"][:10] if item["hsn"] else None,
                    item["qty"],
                    item["unit"][:20],
                    item["rate"],
                    18.0,  # default 18% - can be adjusted later per PO
                    round(item["amount"] * 0.18, 2),
                    round(item["amount"] * 1.18, 2),
                    item["sort_order"],
                ))

        else:  # WO
            cur.execute("SELECT id FROM work_orders WHERE wo_number = %s", (order_no,))
            row = cur.fetchone()
            if not row:
                print(f"  [SKIP] WO {order_no} not found in DB")
                continue
            wo_id = row[0]

            cur.execute("DELETE FROM work_order_items WHERE wo_id = %s", (wo_id,))
            print(f"  WO id: {wo_id}")

            items = parse_wo_items(ws)
            print(f"  → Inserting {len(items)} items...")

            for item in items:
                cur.execute("""
                    INSERT INTO work_order_items
                      (wo_id, description, unit, quantity, rate)
                    VALUES (%s, %s, %s, %s, %s)
                """, (
                    wo_id,
                    item["desc"],
                    item["unit"][:20],
                    item["qty"],
                    item["rate"],
                ))

    conn.commit()
    print("\n\nDONE: All line items inserted successfully.")

except Exception as e:
    conn.rollback()
    print(f"\nERROR: {e}")
    import traceback; traceback.print_exc()
finally:
    cur.close()
    conn.close()
