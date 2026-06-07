"""
Reads the store ledger Excel, builds a material_name → category mapping,
then generates UPDATE SQL for the inventory table.
"""
import openpyxl, re, psycopg2

# ── 1. Parse store ledger ─────────────────────────────────────────────────
wb = openpyxl.load_workbook(r"C:\Users\BCIMIT\Desktop\Store ledger.xlsx", data_only=True)
ws = wb.active  # first sheet

ledger = {}  # normalized_name → CATEGORY
for row in ws.iter_rows(values_only=True):
    sl, cat, desc = row[0], row[1], row[2]
    if sl is None or not str(sl).strip().isdigit():
        continue
    if not cat or not desc:
        continue
    cat  = str(cat).strip().upper()
    desc = str(desc).replace('\n', ' ').replace('\r', '').strip().upper()
    desc = re.sub(r'\s+', ' ', desc)  # collapse multiple spaces
    ledger[desc] = cat

print(f"Ledger has {len(ledger)} entries")
for cat in sorted(set(ledger.values())):
    count = sum(1 for v in ledger.values() if v == cat)
    print(f"  {cat}: {count} items")

# ── 2. Connect to DB and get inventory items ───────────────────────────────
conn = psycopg2.connect(host="localhost", dbname="construct_erp",
                        user="postgres", password="asal@1989")
cur = conn.cursor()
cur.execute("SELECT id, material_name, category FROM inventory ORDER BY material_name")
rows = cur.fetchall()
print(f"\nInventory has {len(rows)} items")

# ── 3. Match and build updates ─────────────────────────────────────────────
updates = []
unmatched = []

def normalize(s):
    s = str(s).strip().upper()
    s = re.sub(r'\s+', ' ', s)
    return s

for row_id, mat_name, existing_cat in rows:
    norm = normalize(mat_name)
    # Direct match
    if norm in ledger:
        new_cat = ledger[norm]
        updates.append((new_cat, row_id, mat_name, existing_cat or ''))
        continue
    # Fuzzy: try removing extra spaces inside name
    found = False
    for ledger_name, cat in ledger.items():
        # Match if one is contained in the other (handles minor differences)
        if norm in ledger_name or ledger_name in norm:
            updates.append((cat, row_id, mat_name, existing_cat or ''))
            found = True
            break
    if not found:
        unmatched.append((mat_name, norm))

print(f"\nMatched: {len(updates)}")
print(f"Unmatched: {len(unmatched)}")

# ── 4. Show what will be updated ───────────────────────────────────────────
print("\n=== UPDATES (old → new category) ===")
for new_cat, row_id, mat_name, old_cat in sorted(updates, key=lambda x: x[0]):
    change = " *** CHANGE" if old_cat and old_cat != new_cat else ""
    print(f"  [{new_cat:<20}] {mat_name[:55]}{change}")

if unmatched:
    print("\n=== UNMATCHED (no category found) ===")
    for mat, norm in unmatched:
        print(f"  {mat}")

# ── 5. Apply updates ──────────────────────────────────────────────────────
print(f"\nApplying {len(updates)} updates...")
updated = 0
for new_cat, row_id, mat_name, old_cat in updates:
    cur.execute("UPDATE inventory SET category = %s WHERE id = %s", (new_cat, row_id))
    updated += 1

conn.commit()
print(f"Done — {updated} inventory items updated.")

# ── 6. Verify ──────────────────────────────────────────────────────────────
cur.execute("SELECT category, COUNT(*) FROM inventory GROUP BY category ORDER BY category")
print("\nFinal category distribution:")
for cat, cnt in cur.fetchall():
    print(f"  {cat or '(empty)'}: {cnt}")

cur.close()
conn.close()
