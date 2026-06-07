import openpyxl
from pathlib import Path

BASE = Path(r"H:\OFFICE PROJECTS\consrpro\construct-erp-local\construct-erp\backend\uploads\documents")

WO_FILES = {
    "WOLANLH10001": "54fd83bb-5275-4fc4-8f28-30321548f465.xlsx",
    "WOLANLH10002": "f6ccebac-d8c9-45a5-a3b7-c79202cb43f3.xlsx",
    "WOLANLH10003": "a509c8f2-8f6d-4280-900b-1837153b234b.xlsx",
    "WOLANLH10004": "dc72c6d9-2f40-4fd4-8fda-b48ae03151ad.xlsx",
    "WOLANLH10005": "ad2a805f-d79d-44c9-8c3a-433d28a4a788.xlsx",
}

for order_no, fname in WO_FILES.items():
    wb = openpyxl.load_workbook(BASE / fname, data_only=True)
    ws = wb.active
    print(f"\n{'='*70}\nFILE: {order_no}\n{'='*70}")
    for row in ws.iter_rows():
        vals = [str(c.value).strip() if c.value is not None else "" for c in row]
        non_empty = [v for v in vals if v]
        if non_empty:
            print(f"  Row {row[0].row:3d}: {' | '.join(non_empty)}")
