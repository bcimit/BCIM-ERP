import openpyxl
from pathlib import Path

BASE = Path(r"H:\OFFICE PROJECTS\consrpro\construct-erp-local\construct-erp\backend\uploads\documents")
wb = openpyxl.load_workbook(BASE / "a509c8f2-8f6d-4280-900b-1837153b234b.xlsx", data_only=True)
ws = wb.active

# Print rows 28-60 (around the header and first items)
for row in ws.iter_rows(min_row=28, max_row=80):
    vals = []
    for c in row:
        v = str(c.value).strip() if c.value is not None else ""
        if v:
            vals.append(f"[col{c.column}={v[:40]}]")
    if vals:
        print(f"Row {row[0].row:3d}: {'  '.join(vals)}")
