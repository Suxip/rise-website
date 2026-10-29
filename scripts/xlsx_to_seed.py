#!/usr/bin/env python3
"""Convert the RISE program spreadsheet into supabase/seed.sql.

Usage:
    python3 scripts/xlsx_to_seed.py RISE_data.xlsx [--sheet allData] [--out supabase/seed.sql]

Uses only the Python standard library. The generated SQL replaces every row
in public.programs, so re-run it whenever the spreadsheet changes and paste
the output into the Supabase SQL editor.
"""
import argparse
import datetime
import re
import sys
import zipfile
import xml.etree.ElementTree as ET

NS = {
    "m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
    "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
}

STATE_CODES = {
    "Alabama": "AL", "Alaska": "AK", "Arizona": "AZ", "Arkansas": "AR",
    "California": "CA", "Colorado": "CO", "Connecticut": "CT", "Delaware": "DE",
    "Florida": "FL", "Georgia": "GA", "Hawaii": "HI", "Idaho": "ID",
    "Illinois": "IL", "Indiana": "IN", "Iowa": "IA", "Kansas": "KS",
    "Kentucky": "KY", "Louisiana": "LA", "Maine": "ME", "Maryland": "MD",
    "Massachusetts": "MA", "Michigan": "MI", "Minnesota": "MN", "Mississippi": "MS",
    "Missouri": "MO", "Montana": "MT", "Nebraska": "NE", "Nevada": "NV",
    "New Hampshire": "NH", "New Jersey": "NJ", "New Mexico": "NM", "New York": "NY",
    "North Carolina": "NC", "North Dakota": "ND", "Ohio": "OH", "Oklahoma": "OK",
    "Oregon": "OR", "Pennsylvania": "PA", "Rhode Island": "RI", "South Carolina": "SC",
    "South Dakota": "SD", "Tennessee": "TN", "Texas": "TX", "Utah": "UT",
    "Vermont": "VT", "Virginia": "VA", "Washington": "WA", "West Virginia": "WV",
    "Wisconsin": "WI", "Wyoming": "WY",
    "District of Columbia": "DC", "Washington D.C.": "DC", "Washington, D.C.": "DC",
    "Puerto Rico": "PR", "Guam": "GU", "U.S. Virgin Islands": "VI",
    "American Samoa": "AS", "Northern Mariana Islands": "MP",
}
FEDERAL_STATE_VALUES = {"US", "USA", "United States", "Federal", ""}
CATEGORIES = {"energy", "water", "transportation", "recycling"}
LEVELS = {"state", "federal", "territory"}


def _col_index(ref):
    n = 0
    for ch in re.match(r"[A-Z]+", ref).group():
        n = n * 26 + ord(ch) - 64
    return n - 1


def read_sheet(path, sheet_name):
    """Return the named worksheet as a list of rows (lists of str/None)."""
    z = zipfile.ZipFile(path)
    shared = []
    if "xl/sharedStrings.xml" in z.namelist():
        for si in ET.fromstring(z.read("xl/sharedStrings.xml")).findall("m:si", NS):
            shared.append("".join(t.text or "" for t in si.iter(f"{{{NS['m']}}}t")))

    workbook = ET.fromstring(z.read("xl/workbook.xml"))
    rels = {r.get("Id"): r.get("Target") for r in ET.fromstring(z.read("xl/_rels/workbook.xml.rels"))}
    sheets = {s.get("name"): rels[s.get(f"{{{NS['r']}}}id")] for s in workbook.find("m:sheets", NS)}
    if sheet_name not in sheets:
        sys.exit(f"Sheet {sheet_name!r} not found. Available: {', '.join(sheets)}")
    target = sheets[sheet_name].lstrip("/")
    if not target.startswith("xl/"):
        target = "xl/" + target

    rows = []
    for row in ET.fromstring(z.read(target)).iter(f"{{{NS['m']}}}row"):
        cells = {}
        for c in row.findall("m:c", NS):
            v = c.find("m:v", NS)
            if c.get("t") == "s" and v is not None:
                cells[_col_index(c.get("r"))] = shared[int(v.text)]
            elif c.get("t") == "inlineStr":
                cells[_col_index(c.get("r"))] = "".join(t.text or "" for t in c.iter(f"{{{NS['m']}}}t"))
            elif v is not None:
                cells[_col_index(c.get("r"))] = v.text
        if cells:
            rows.append([cells.get(i) for i in range(max(cells) + 1)])
    return rows


def parse_date(value):
    if not value:
        return None
    try:  # Excel stores dates as days since 1899-12-30.
        return (datetime.date(1899, 12, 30) + datetime.timedelta(days=float(value))).isoformat()
    except ValueError:
        pass
    for fmt in ("%Y-%m-%d", "%m/%d/%Y", "%m/%d/%y"):
        try:
            return datetime.datetime.strptime(value, fmt).date().isoformat()
        except ValueError:
            pass
    return None


def sql_str(value):
    if value is None:
        return "null"
    return "'" + value.replace("'", "''") + "'"


def to_records(rows):
    header = [(h or "").strip() for h in rows[0]]

    def col(*names, prefix=None):
        for i, h in enumerate(header):
            if h in names or (prefix and h.lower().startswith(prefix)):
                return i
        return None

    idx = {
        "state": col("State"),
        "name": col("Program"),
        "category": col("Type", "Category"),
        "description": col("Description"),
        "url": col("Link"),
        "how_to_access": col("How to Access", "Notes"),
        "level": col("Level"),
        "link_status": col(prefix="is link working"),
        "last_reviewed": col("Last Date Reviewed"),
    }
    missing = [k for k in ("state", "name", "category", "level") if idx[k] is None]
    if missing:
        sys.exit(f"Missing required columns: {missing}. Found headers: {header}")

    records, errors = [], []
    for line, row in enumerate(rows[1:], start=2):
        def get(key):
            i = idx[key]
            v = row[i] if i is not None and i < len(row) else None
            return v.strip() if isinstance(v, str) else v

        if not get("name"):
            continue  # blank spacer row

        level = (get("level") or "").lower()
        category = (get("category") or "").lower()
        state = get("state") or ""
        if level not in LEVELS:
            errors.append(f"row {line}: unknown Level {get('level')!r}")
        if category not in CATEGORIES:
            errors.append(f"row {line}: unknown Type {get('category')!r}")

        if level == "federal" and state in FEDERAL_STATE_VALUES:
            state_code = None
        elif state in STATE_CODES:
            state_code = STATE_CODES[state]
        else:
            errors.append(f"row {line}: unknown State {state!r}")
            state_code = None

        records.append({
            "name": get("name"),
            "category": category,
            "description": get("description") or "",
            "url": get("url") or "",
            "how_to_access": get("how_to_access") or "",
            "state": state,
            "state_code": state_code,
            "level": level,
            "link_status": get("link_status") or None,
            "last_reviewed": parse_date(get("last_reviewed")),
        })

    if errors:
        sys.exit("Fix these spreadsheet problems and re-run:\n  " + "\n  ".join(errors))
    return records


def to_sql(records, source):
    cols = list(records[0])
    lines = [
        f"-- Generated by scripts/xlsx_to_seed.py from {source}. Do not edit by hand.",
        f"-- {len(records)} programs. Replaces all existing rows.",
        "begin;",
        "truncate table public.programs restart identity;",
        f"insert into public.programs ({', '.join(cols)}) values",
    ]
    values = [
        "  (" + ", ".join(sql_str(r[c]) for c in cols) + ")"
        for r in records
    ]
    lines.append(",\n".join(values) + ";")
    lines.append("commit;")
    return "\n".join(lines) + "\n"


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("xlsx")
    parser.add_argument("--sheet", default="allData")
    parser.add_argument("--out", default="supabase/seed.sql")
    args = parser.parse_args()

    records = to_records(read_sheet(args.xlsx, args.sheet))
    with open(args.out, "w", encoding="utf-8") as f:
        f.write(to_sql(records, args.xlsx.split("/")[-1]))

    by_level = {}
    for r in records:
        by_level[r["level"]] = by_level.get(r["level"], 0) + 1
    print(f"Wrote {len(records)} programs to {args.out} ({by_level})")


if __name__ == "__main__":
    main()
