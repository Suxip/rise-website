#!/usr/bin/env python3
"""Convert the RISE program spreadsheet into supabase/seed.sql.

Usage:
    python3 scripts/xlsx_to_seed.py RISE_data.xlsx [--sheet allData] [--out supabase/seed.sql]
        [--review-out docs/data-review-checklist.csv]

Uses only the Python standard library. The generated SQL replaces every row
in public.programs, so run it only before admins start editing in Supabase;
afterwards it would overwrite their changes.

Cleaning applied automatically:
  - collapses stray/double spaces and line breaks in every text cell
  - stores "See link below." access notes as empty (the site shows a standard message)
  - splits DSIRE placeholder descriptions ("Rebate Program. Attribution: ...")
    into program_type and source, leaving the description empty
  - drops rows that are exact duplicates, ignoring case and spacing

Rows that need a person's judgment are written to the --review-out CSV.
"""
import argparse
import csv
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
# Must match the program_type check constraint in supabase/migrations.
PROGRAM_TYPES = {
    "Rebate Program", "Loan Program", "Grant Program", "Leasing Program",
    "PACE Financing", "Personal Tax Credit", "Personal Tax Deduction",
    "Personal Tax Exemption", "Corporate Tax Exemption", "Property Tax Incentive",
    "Sales Tax Incentive", "Building Energy Code", "Net Metering",
    "Solar/Wind Permitting Standards",
}
DSIRE_PLACEHOLDER = re.compile(
    r"^(?P<type>[^.]+)\.\s*Attribution: Data derived from DSIRE®, operated by the "
    r"N\.C\. Clean Energy Technology Center at NC State University\.?$"
)
PLACEHOLDER_ACCESS = re.compile(r"^see link below\.?$", re.IGNORECASE)
BROKEN_LINK_STATUSES = {"Dead", "Server Error", "Unreachable", "Invalid URL", "Error"}


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


def clean(value):
    """Collapse runs of whitespace (including line breaks) into single spaces."""
    return re.sub(r"\s+", " ", value).strip() if isinstance(value, str) else value


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
            return clean(v)

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

        description = get("description") or ""
        program_type = source = None
        placeholder = DSIRE_PLACEHOLDER.match(description)
        if placeholder:
            program_type, source, description = placeholder.group("type"), "DSIRE", ""
            if program_type not in PROGRAM_TYPES:
                errors.append(f"row {line}: unknown DSIRE program type {program_type!r}")
        elif "DSIRE" in description:
            errors.append(f"row {line}: DSIRE attribution in an unexpected format: {description!r}")

        how_to_access = get("how_to_access") or ""
        if PLACEHOLDER_ACCESS.match(how_to_access):
            how_to_access = ""

        records.append({
            "name": get("name"),
            "category": category,
            "description": description,
            "url": get("url") or "",
            "how_to_access": how_to_access,
            "state": state,
            "state_code": state_code,
            "level": level,
            "link_status": get("link_status") or None,
            "last_reviewed": parse_date(get("last_reviewed")),
            "program_type": program_type,
            "source": source,
            "is_published": True,
            "_row": line,
        })

    if errors:
        sys.exit("Fix these spreadsheet problems and re-run:\n  " + "\n  ".join(errors))
    return records


CONTENT_FIELDS = ("name", "category", "description", "url", "how_to_access", "state", "level")


def drop_exact_duplicates(records):
    """Remove rows whose content matches an earlier row, ignoring case."""
    seen, kept, dropped = {}, [], []
    for r in records:
        key = tuple(r[f].lower() for f in CONTENT_FIELDS)
        if key in seen:
            dropped.append((r, seen[key]))
        else:
            seen[key] = r
            kept.append(r)
    return kept, dropped


def review_rows(records):
    """Yield (record, issue, suggested action) for rows needing a person's judgment."""
    by_name = {}
    for r in records:
        by_name.setdefault((r["name"].lower(), r["state"]), []).append(r)

    for r in records:
        others = [o for o in by_name[(r["name"].lower(), r["state"])] if o is not r]
        if others:
            ids = ", ".join(str(o["id"]) for o in others)
            yield r, "Possible duplicate", f"Same name and state as id {ids}. Keep one or both."
        if not r["description"] and not r["source"]:
            yield r, "Empty description", "Write a one-sentence description."
        if r["link_status"] in BROKEN_LINK_STATUSES:
            yield r, f"Broken link ({r['link_status']})", "Find the new link, or hide the program."
        if r["link_status"] == "Blocked":
            yield r, "Link check blocked", "Open the link by hand and confirm it works."
        if r["url"].startswith("http://"):
            yield r, "Insecure link (http://)", "Switch to https:// if the site supports it."
        if r["state_code"] == "PR" and r["level"] == "state":
            yield r, "Level inconsistent", "Puerto Rico is 'state' but D.C. is 'territory'. Pick one rule."


def write_review_csv(records, path):
    fields = ["id", "spreadsheet_row", "issue", "suggested_action", "state", "name", "category", "url", "link_status"]
    count = 0
    with open(path, "w", encoding="utf-8", newline="") as f:
        w = csv.writer(f)
        w.writerow(fields)
        for r, issue, action in review_rows(records):
            w.writerow([r["id"], r["_row"], issue, action, r["state"], r["name"], r["category"], r["url"], r["link_status"] or ""])
            count += 1
    return count


def sql_value(value):
    if isinstance(value, bool):
        return "true" if value else "false"
    return sql_str(value)


def to_sql(records, source):
    cols = [c for c in records[0] if c not in ("_row", "id")]
    lines = [
        f"-- Generated by scripts/xlsx_to_seed.py from {source}. Do not edit by hand.",
        f"-- {len(records)} programs. Replaces all existing rows.",
        "begin;",
        "truncate table public.programs restart identity;",
        f"insert into public.programs ({', '.join(cols)}) values",
    ]
    values = [
        "  (" + ", ".join(sql_value(r[c]) for c in cols) + ")"
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
    parser.add_argument("--review-out", default="docs/data-review-checklist.csv")
    args = parser.parse_args()

    records, dropped = drop_exact_duplicates(to_records(read_sheet(args.xlsx, args.sheet)))
    for r, original in dropped:
        print(f"Dropped duplicate row {r['_row']} ({r['name']}, {r['state']}); same as row {original['_row']}")
    # The seed restarts identity, so ids are assigned in this order.
    for i, r in enumerate(records, start=1):
        r["id"] = i

    with open(args.out, "w", encoding="utf-8") as f:
        f.write(to_sql(records, args.xlsx.split("/")[-1]))
    flagged = write_review_csv(records, args.review_out)

    by_level = {}
    for r in records:
        by_level[r["level"]] = by_level.get(r["level"], 0) + 1
    print(f"Wrote {len(records)} programs to {args.out} ({by_level})")
    print(f"Wrote {flagged} items needing review to {args.review_out}")


if __name__ == "__main__":
    main()
