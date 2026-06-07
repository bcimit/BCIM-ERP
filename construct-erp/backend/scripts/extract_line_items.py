"""
Reads all 9 LANCO PO/WO Excel files and prints their cell contents
so we can identify where line items are.
"""
import openpyxl
import os

BASE = r"H:\OFFICE PROJECTS\consrpro\construct-erp-local\construct-erp\backend\uploads\documents"

FILES = {
    "POLANLH10001": "ab6d6cbc-7cab-457e-8f80-e745f55a8245.xlsx",
    "POLANLH10002": "94a51a26-50ff-4f4f-ad5f-a4eb0882d237.xlsx",
    "POLANLH10003": "2e158ead-d641-43c3-8830-acc8b0b44116.xlsx",
    "POLANLH10004": "1c692162-3d5a-4e97-9df5-14001921a462.xlsx",
    "WOLANLH10001": "54fd83bb-5275-4fc4-8f28-30321548f465.xlsx",
    "WOLANLH10002": "f6ccebac-d8c9-45a5-a3b7-c79202cb43f3.xlsx",
    "WOLANLH10003": "a509c8f2-8f6d-4280-900b-1837153b234b.xlsx",
    "WOLANLH10004": "dc72c6d9-2f40-4fd4-8fda-b48ae03151ad.xlsx",
    "WOLANLH10005": "ad2a805f-d79d-44c9-8c3a-433d28a4a788.xlsx",
}

for order_no, fname in FILES.items():
    path = os.path.join(BASE, fname)
    print(f"\n{'='*70}")
    print(f"FILE: {order_no}  ({fname})")
    print(f"{'='*70}")
    wb = openpyxl.load_workbook(path, data_only=True)
    ws = wb.active
    for row in ws.iter_rows():
        row_vals = [str(c.value).strip() if c.value is not None else "" for c in row]
        if any(v for v in row_vals):  # skip fully empty rows
            print(f"  Row {row[0].row:3d}: {' | '.join(v for v in row_vals if v != '')}")
