import openpyxl, re
wb = openpyxl.load_workbook(r"C:\Users\BCIMIT\Downloads\POLANLH10002- Royal Electricals.xlsx", data_only=True)
ws = wb.active
rows = list(ws.iter_rows(values_only=True))

po_no = po_date = vendor = gstin = narration = ""
for row in rows:
    for i, cell in enumerate(row):
        v = str(cell or "").strip()
        if "PO No" in v:
            for k in range(i+1, len(row)):
                if row[k]: po_no = str(row[k]).strip(); break
        if v.lower() in ("date:", "date"):
            for k in range(i+1, len(row)):
                if row[k]: po_date = str(row[k]).strip(); break
        if re.match(r"^M/s\.", v, re.I): vendor = v
        if "GST No" in v or "GST:" in v:
            for k in range(i+1, len(row)):
                if row[k]: gstin = str(row[k]).strip(); break
        if "Narration" in v:
            nar = v.replace("Narration:", "").replace("Narration", "").strip()
            if nar: narration = nar
            else:
                for k in range(i+1, len(row)):
                    if row[k]: narration = str(row[k]).strip(); break

print("PO Number :", po_no)
print("PO Date   :", po_date)
print("Vendor    :", vendor)
print("GSTIN     :", gstin)
print("Narration :", narration[:70])

STOP = {"sub total","subtotal","grand total","total","cgst","sgst","igst","rupees","narration"}
hdr_row = -1
for i, row in enumerate(rows):
    joined = " ".join(str(c or "").lower() for c in row)
    if "description" in joined and ("quantity" in joined or "uom" in joined or "qty" in joined):
        hdr_row = i; break

items = []
if hdr_row >= 0:
    for row in rows[hdr_row+1:]:
        first = str(row[0] or "").lower().strip()
        if any(k in first for k in STOP): break
        desc = str(row[1] or "").replace("\n", " ").strip()
        if not desc: continue
        unit = str(row[3] or "Nos").strip()
        qty  = row[4] or 0
        rate = row[5] or 0
        amt  = row[6] or 0
        items.append((desc, unit, qty, rate, amt))

print(f"\nLine Items: {len(items)} found")
for desc, unit, qty, rate, amt in items:
    print(f"  {desc[:45]:<45} | {unit:5} | qty={qty} | rate={rate} | amt={amt}")
