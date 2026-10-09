"""Adds the tender-versus-private account inputs and worked examples to the Sadaf inputs workbook (v5 -> v6)."""
import sys
from copy import copy
from datetime import date

import openpyxl
from openpyxl.workbook.properties import CalcProperties
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.worksheet.table import Table, TableStyleInfo

SRC = sys.argv[1]
DST = sys.argv[2]
wb = openpyxl.load_workbook(SRC)

TOK = wb["Advanced monthly"]  # style templates
def style_from(dst, src):
    dst._style = copy(src._style)

S_TITLE, S_DESC, S_SECTION, S_HEAD = TOK["A2"], TOK["A4"], TOK["A7"], TOK["A10"]
S_DEMO, S_DEMO_DATE, S_IN, S_IN_DATE = TOK["A11"], TOK["D11"], TOK["A13"], TOK["D13"]
S_NOTE = TOK["A72"] if TOK["A72"].value else TOK["A8"]

# ─── 1. New sheet: Accounts ────────────────────────────────────────────────────
ws = wb.create_sheet("Accounts", index=wb.sheetnames.index("Worked examples"))
ws.sheet_properties.tabColor = "FFB18B42"
ws.sheet_view.showGridLines = TOK.sheet_view.showGridLines
widths = [26, 28, 22, 22, 24, 24, 24, 24, 24, 34]
for i, w in enumerate(widths):
    ws.column_dimensions[openpyxl.utils.get_column_letter(i + 1)].width = w
ws.freeze_panes = "A7"

def put(r, c, v, tmpl, fmt=None):
    cell = ws.cell(r, c, v)
    style_from(cell, tmpl)
    if fmt:
        cell.number_format = fmt
    return cell

put(2, 1, "Accounts and tenders: manual inputs", S_TITLE); ws.row_dimensions[2].height = 33
put(4, 1, "Splits Sadaf's customers into Tender accounts (public-sector bodies that buy through formal tenders) and Private accounts (private hospitals, centres and clinics that buy by quotation or purchase order).", S_DESC)
put(5, 1, "Fill only what Alpha ERP cannot supply. Blue rows are fictional examples: clear them before real use. Yellow cells are manual inputs. Dates are dd-mmm-yyyy.", S_DESC)
for r in (4, 5):
    ws.row_dimensions[r].height = 24

MONEY, PCT, INT, DATEF = "#,##0", "0.0%", "0", "dd-mmm-yyyy"

def build_table(top, code, title, desc, updated, headers, demo_rows, formats, n_rows, name, validations):
    """Section title, description, header, demo rows then yellow input rows; returns (first_data_row, last_data_row)."""
    put(top, 1, f"{code}. {title}", S_SECTION); ws.row_dimensions[top].height = 30
    put(top + 1, 1, desc, S_DESC); ws.row_dimensions[top + 1].height = 24
    put(top + 2, 1, updated, S_DESC); ws.row_dimensions[top + 2].height = 24
    hr = top + 3
    for c, h in enumerate(headers, 1):
        put(hr, c, h, S_HEAD)
    ws.row_dimensions[hr].height = 58
    first, last = hr + 1, hr + n_rows
    for r in range(first, last + 1):
        demo = demo_rows[r - first] if r - first < len(demo_rows) else None
        for c in range(1, len(headers) + 1):
            is_date = formats[c - 1] == DATEF
            tmpl = (S_DEMO_DATE if is_date else S_DEMO) if demo else (S_IN_DATE if is_date else S_IN)
            cell = put(r, c, demo[c - 1] if demo else None, tmpl, formats[c - 1] if formats[c - 1] else None)
        ws.row_dimensions[r].height = 30
    t = Table(displayName=name, ref=f"A{hr}:{openpyxl.utils.get_column_letter(len(headers))}{last}")
    t.tableStyleInfo = TableStyleInfo(name="TableStyleMedium2", showRowStripes=False, showColumnStripes=False)
    ws.add_table(t)
    for dv in validations:
        dv.add  # noqa: B018 (keeps linters quiet)
    return first, last

def dv_list(options, col, first, last, msg):
    dv = DataValidation(type="list", formula1='"' + ",".join(options) + '"', allow_blank=True, showErrorMessage=True, errorTitle="Not allowed", error=msg)
    dv.add(f"{col}{first}:{col}{last}")
    ws.add_data_validation(dv)

def dv_num(col, first, last, lo=0, hi=None, whole=False):
    dv = DataValidation(type="whole" if whole else "decimal", operator="between" if hi is not None else "greaterThanOrEqual", formula1=str(lo), formula2=str(hi) if hi is not None else None, allow_blank=True, showErrorMessage=True, errorTitle="Number out of range", error=f"Enter a number{' between ' + str(lo) + ' and ' + str(hi) if hi is not None else ' of ' + str(lo) + ' or more'}.")
    dv.add(f"{col}{first}:{col}{last}")
    ws.add_data_validation(dv)

# AM6 – account master
AM6_TOP, AM6_N = 7, 30
f6, l6 = build_table(
    AM6_TOP, "AM6", "Account master: segment, terms and credit limit",
    "MANUAL IF E02 DOES NOT CARRY THEM. One row per customer code. Segment decides which view the account appears in; it never changes sales figures, only grouping.",
    "Updated by: Sales manager + accountant. Review monthly; update a row only when terms, limit or segment change.",
    ["Customer code", "Customer name", "Segment", "Customer type", "City", "Account owner", "Payment terms (days)", "Credit limit (JOD)", "Active?"],
    [["DEMO-C001", "Demo Hospital A", "Tender", "Public hospital", "Amman", "Demo Ahmad", 90, 40000, "Yes"],
     ["DEMO-C002", "Demo Hospital B", "Tender", "Public hospital", "Irbid", "Demo Lina", 90, 50000, "Yes"],
     ["DEMO-C003", "Demo Clinic C", "Private", "Specialist clinic", "Amman", "Demo Omar", 45, 10000, "Yes"]],
    [None, None, None, None, None, None, INT, MONEY, None], AM6_N, "Input_AM6", [])
dv_list(["Tender", "Private"], "C", f6, l6, "Choose Tender or Private.")
dv_list(["Yes", "No"], "I", f6, l6, "Choose Yes or No.")
dv_num("G", f6, l6, 0, 365, whole=True)
dv_num("H", f6, l6, 0)

# AM7 – targets and prior year
AM7_TOP = l6 + 4
f7, l7 = build_table(
    AM7_TOP, "AM7", "Account targets and last year's figures",
    "MANUAL. One row per customer and month, figures YEAR TO DATE up to that month. Prior-year columns can be skipped when Alpha ERP history (E03) is loaded for the same period last year.",
    "Updated by: Management / finance. Review monthly; replace the month's rows, do not add successive months together.",
    ["Year to date at month", "Customer code", "Sales target (JOD)", "Prior-year sales, same period (JOD)", "Prior-year gross profit, same period (JOD)", "Source / approval reference"],
    [[date(2026, 9, 1), "DEMO-C001", 110000, 100000, 22000, "DEMO management plan; ERP history"],
     [date(2026, 9, 1), "DEMO-C002", 90000, 85000, 20000, "DEMO management plan; ERP history"],
     [date(2026, 9, 1), "DEMO-C003", 65000, 66000, 25000, "DEMO management plan; ERP history"]],
    [DATEF, None, MONEY, MONEY, MONEY, None], AM6_N, "Input_AM7", [])
dv_num("C", f7, l7, 0); dv_num("D", f7, l7, 0); dv_num("E", f7, l7, 0)

# AW3 – tender add-on
AW3_TOP = l7 + 4
f3, l3 = build_table(
    AW3_TOP, "AW3", "Tender detail: award, delivery, billing and guarantees",
    "MANUAL, ADDS TO AW1. One row per tender record code already in AW1 (the stage, value, full planned cost and next event stay in AW1). Replace the row weekly while the tender is live.",
    "Updated by: Tender department + accountant. Review weekly; keep closed tenders until the year ends so results can be counted.",
    ["Record code (from AW1)", "Authority tender number", "Award date", "Delivered (%)", "Invoiced to date (JOD)", "Collected to date (JOD)", "Guarantee type", "Guarantee amount (JOD)", "Guarantee expiry", "Outcome / loss reason"],
    [["DEMO-T-A", "DEMO-AUTH-001", date(2026, 7, 15), 100, 24000, 16800, "Performance bond", 2400, date(2026, 12, 10), "Won"],
     ["DEMO-T-B", "DEMO-AUTH-002", date(2026, 7, 30), 100, 30000, 21000, "Performance bond", 3000, date(2027, 2, 28), "Won"]],
    [None, None, DATEF, INT, MONEY, MONEY, None, MONEY, DATEF, None], AM6_N, "Input_AW3", [])
dv_num("D", f3, l3, 0, 100)
dv_num("E", f3, l3, 0); dv_num("F", f3, l3, 0); dv_num("H", f3, l3, 0)
dv_list(["Bid bond", "Performance bond", "Advance payment bond", "None"], "G", f3, l3, "Choose a guarantee type.")

# AM8 – tender outcomes
AM8_TOP = l3 + 4
f8, l8 = build_table(
    AM8_TOP, "AM8", "Tender results this year",
    "MANUAL, ONLY IF AW1 DOES NOT KEEP EVERY CLOSED TENDER. Cumulative counts and values from 1 January to the month shown. Pending means submitted with no decision yet.",
    "Updated by: Tender department. Review monthly; replace the single row for the month.",
    ["Year to date at month", "Tenders submitted", "Won", "Lost", "Pending", "Value submitted (JOD)", "Value won (JOD)", "Counts check"],
    [[date(2026, 9, 1), 14, 6, 5, 3, 3900000, 1650000, None]],
    [DATEF, INT, INT, INT, INT, MONEY, MONEY, None], 6, "Input_AM8", [])
for col in "BCDE":
    dv_num(col, f8, l8, 0, whole=True)
dv_num("F", f8, l8, 0); dv_num("G", f8, l8, 0)
for r in range(f8, l8 + 1):
    ws.cell(r, 8).value = f'=IF(B{r}="","",IF(B{r}=C{r}+D{r}+E{r},"OK","Counts do not add up"))'

notes_top = l8 + 3
for i, text in enumerate([
    "Tender account = public-sector body buying through formal tenders (ministries, university and government hospitals, military medical services, joint procurement). Private account = private hospital, centre or clinic buying by quotation or purchase order. Decide the segment once per customer and keep it stable.",
    "Orders, last order date, average order and sales by line come from the invoices in E03; do not type them here. Receivables and overdue come from E05; cash received from E04.",
    "Prior-year figures must cover the same months as the sales they are compared with (year to date against year to date), on the same net-of-tax basis.",
    "Guarantee amounts are held by the bank or the authority, not revenue or cost. Track expiry so a bond is never left to lapse during delivery or warranty.",
    "Win rate = won / (won + lost). Pending tenders are excluded until decided. Pipeline value is face value and is not weighted by invented probabilities.",
]):
    put(notes_top + i, 1, text, S_DESC)
    ws.row_dimensions[notes_top + i].height = 30

# ─── 2. Start here ─────────────────────────────────────────────────────────────
sh = wb["Start here"]
guide = sh.tables["Guide"]
sh["B22"].value = sh["B22"].value + " Account views (tender versus private) added in workbook v6, 09-Oct-2026."
r = 26
for c in (1, 2):
    style_from(sh.cell(r, c), sh.cell(24, c))
sh.cell(r, 1, "Accounts update (v6)")
sh.cell(r, 2, "New sheet 'Accounts' (AM6 account master, AM7 targets and last year, AW3 tender detail, AM8 tender results) feeds the Tender accounts and Private accounts views under Sales and accounts. Worked examples rows 95 onward show every new calculation. ERP requirements E02, E03 and E05 gained fields.")
sh.row_dimensions[r].height = sh.row_dimensions[24].height
guide.ref = "A7:B26"

# ─── 3. ERP requirements: extra fields ─────────────────────────────────────────
er = wb["ERP requirements"]
er["D10"].value = er["D10"].value.rstrip(".") + ". Add: customer segment or category that identifies public-sector tender customers; credit limit."
er["D11"].value = er["D11"].value.rstrip(".") + ". Also export the same lines for the same months of the previous year (growth against last year)."
er["D13"].value = er["D13"].value.rstrip(".") + ". Keep the contractual due date for tender invoices; payment terms of 90 days or more are normal for public bodies."

# ─── 4. Report map: new rows ───────────────────────────────────────────────────
rm = wb["Report map"]
rows = [
    ["B07", "Both", "Tender versus private accounts: sales, gross profit, margin, receivables",
     "E02 (segment) + E03 + E04 + E05", "AM6 only for missing segment, terms or credit limit", "Weekly",
     "Group customers by segment. Segment sales, gross profit and receivables are sums of the accounts in it; margin = gross profit / sales of the group (never an average of account margins). Tender plus Private must equal the company total.",
     "No segment on a customer: show it as Unassigned and list it. Never guess a segment."],
    ["A09", "Advanced", "Account list: year-to-date gross profit, growth, target, credit use",
     "E02 + E03 (this year and last year) + E05", "AM6 (terms, limit), AM7 (target, prior year if E03 history is missing)", "Monthly",
     "Gross profit = net sales - product cost. Growth = this year / last year - 1 for the same months. Target attainment = sales of the SAME customer and month / target. Credit use = outstanding / credit limit. Days sales outstanding = outstanding / sales x days in period.",
     "No prior year: growth unavailable. No target: no attainment. No credit limit: credit use unavailable. Never show zero for a missing base."],
    ["A10", "Advanced", "Account health status (At risk / Watch / Healthy) with reasons",
     "E03 + E05 + A04 capture where units exist", "AM6, AM7, AW1/AW3 for tender deadlines", "Weekly",
     "At risk: any invoice over 90 days past due, or over 90% of credit limit used. Watch: any overdue balance, sales under 85% of target or 10% below last year, recurring purchases under 70% of estimated demand, a Private account with no order for 45 days, or a tender in preparation due within 14 days.",
     "A rule whose data is missing is skipped and the status says so; it is never treated as passed."],
    ["A11", "Advanced", "Tender status board, billing, guarantees and win rate",
     "E10 when available; E03/E05 once invoiced", "AW1 + AW3 + AM8", "Weekly",
     "Pipeline = value of tenders Preparing or Submitted. Backlog = value x (1 - delivered %). Delivered not invoiced = value x delivered % - invoiced. Invoiced not collected = invoiced - collected (must equal the open E05 balance of that tender). Win rate = won / (won + lost). Guarantee days = expiry - snapshot date.",
     "A won tender is not revenue. Without delivered % the backlog is unavailable. Without AM8 or closed tenders in AW1 the win rate is unavailable."],
]
last = rm.tables["ReportRequirements"].ref
for i, row in enumerate(rows):
    r = 24 + i
    src_row = 23 if (r % 2 == 0) else 22  # alternate the two existing row styles
    for c, v in enumerate(row, 1):
        cell = rm.cell(r, c, v)
        style_from(cell, rm.cell(src_row, c))
    rm.row_dimensions[r].height = 118
rm.tables["ReportRequirements"].ref = "A8:H27"

# ─── 5. Worked examples: new block ─────────────────────────────────────────────
we = wb["Worked examples"]
H, LBL, VAL_I, VAL_F, NOTE = we["A86"], we["A41"], we["B17"], we["B41"], we["E42"]
def w(r, c, v, tmpl, fmt=None):
    cell = we.cell(r, c, v)
    style_from(cell, tmpl)
    if fmt:
        cell.number_format = fmt
    return cell

ACC = "Accounts"
AM6R, AM7R, AW3R = f"{f6}:{l6}", f"{f7}:{l7}", f"{f3}:{l3}"
def rng(col, a, b):
    return f"{ACC}!${col}${a}:${col}${b}"
def am6(col, cell):  # lookup in the account master by customer code
    return f"=INDEX({rng(col, f6, l6)},MATCH({cell}96,{rng('A', f6, l6)},0))"
def am7(col, cell):  # year-to-date row for the customer and month in row 13
    return f"=SUMIFS({rng(col, f7, l7)},{rng('B', f7, l7)},{cell}96,{rng('A', f7, l7)},{cell}13)"

R0 = 95
w(R0, 1, "Accounts: tender versus private (AM6, AM7)", H); w(R0, 2, "Demo Hospital A", we["B86"]); w(R0, 3, "Demo Clinic C", we["C86"])
spec = [
    # label, B, C, fmt, style, note
    ("Customer code", "DEMO-C001", "DEMO-C003", None, VAL_I, "E02. Codes match AM6 and AM7."),
    ("Segment", am6("C", "B"), am6("C", "C"), None, VAL_F, "AM6. Hospital A buys through tenders, Clinic C by purchase order."),
    ("Period start", date(2026, 1, 1), "=B98", DATEF, VAL_I, "First day of the year-to-date period."),
    ("Period end", date(2026, 9, 30), "=B99", DATEF, VAL_I, "Last day of the complete month reported."),
    ("Days in period", "=B99-B98+1", "=C99-C98+1", INT, VAL_F, "Both ends included: 273 days."),
    ("YTD net sales (JOD)", 120000, 60000, MONEY, VAL_I, "E03, net of tax, returns netted."),
    ("YTD product cost (JOD)", 94800, 36600, MONEY, VAL_I, "E03 product cost for the same lines."),
    ("YTD direct costs, actual (JOD)", 3600, 1800, MONEY, VAL_I, "E09 or AM4: freight, installation, training."),
    ("Cash collected YTD (JOD)", 90000, 57000, MONEY, VAL_I, "E04 receipts allocated to this customer."),
    ("Outstanding at snapshot (JOD)", 30000, 3000, MONEY, VAL_I, "E05. Sales - cash = outstanding, assuming nothing was open on 1 January."),
    ("Oldest overdue invoice (days)", "=B46", 0, INT, VAL_F, "From E05 due dates. Hospital A: its project invoice (row 46) is 10 days late."),
    ("Overdue amount (JOD)", "=B47", 0, MONEY, VAL_F, "Part of the outstanding balance that is past due."),
    ("Last order date", date(2026, 9, 20), date(2026, 8, 20), DATEF, VAL_I, "Latest invoice date in E03."),
    ("Snapshot date", "=B15", "=C15", DATEF, VAL_F, "Same snapshot as the balances above."),
    ("Credit limit (JOD)", am6("H", "B"), am6("H", "C"), MONEY, VAL_F, "AM6."),
    ("Sales target, same period (JOD)", am7("C", "B"), am7("C", "C"), MONEY, VAL_F, "AM7, matched on customer AND month start (row 13)."),
    ("Prior-year sales (JOD)", am7("D", "B"), am7("D", "C"), MONEY, VAL_F, "AM7 or E03 history, same months."),
    ("Prior-year gross profit (JOD)", am7("E", "B"), am7("E", "C"), MONEY, VAL_F, "AM7 or E03 history."),
    ("Gross profit (JOD)", "=B101-B102", "=C101-C102", MONEY, VAL_F, "Net sales - product cost."),
    ("Gross margin", '=IF(B101=0,"Data missing",B114/B101)', '=IF(C101=0,"Data missing",C114/C101)', PCT, VAL_F, "Gross profit / net sales."),
    ("Contribution after direct costs (JOD)", "=B114-B103", "=C114-C103", MONEY, VAL_F, "Excludes overhead, tax and finance."),
    ("Sales vs last year", '=IF(B112<=0,"Data missing",B101/B112-1)', '=IF(C112<=0,"Data missing",C101/C112-1)', PCT, VAL_F, "Same months, same basis."),
    ("Gross profit vs last year", '=IF(B113<=0,"Data missing",B114/B113-1)', '=IF(C113<=0,"Data missing",C114/C113-1)', PCT, VAL_F, ""),
    ("Sales vs target", '=IF(B111<=0,"No target",B101/B111)', '=IF(C111<=0,"No target",C101/C111)', PCT, VAL_F, "Same customer and month: a real attainment (unlike row 53)."),
    ("Days sales outstanding", '=IF(B101<=0,"Data missing",B105/B101*B100)', '=IF(C101<=0,"Data missing",C105/C101*C100)', "0.0", VAL_F, "Outstanding / sales x days in period. Opening receivables inflate it; use it to compare accounts."),
    ("Credit limit in use", '=IF(B110<=0,"Data missing",B105/B110)', '=IF(C110<=0,"Data missing",C105/C110)', PCT, VAL_F, "Outstanding / credit limit."),
    ("Days since last order", "=MAX(0,B109-B108)", "=MAX(0,C109-C108)", INT, VAL_F, "Snapshot date - last order date."),
    ("Recurring consumable capture", "=B72", "No units on record", PCT, VAL_F, "A04 for the account's installed units (row 72); blank when the account has none."),
    ("Health status",
     '=IF(OR(B106>90,AND(ISNUMBER(B121),B121>0.9)),"At risk",IF(OR(B107>0,AND(ISNUMBER(B119),B119<0.85),AND(ISNUMBER(B117),B117<-0.1),AND(ISNUMBER(B123),B123<0.7),AND(B97="Private",B122>45)),"Watch","Healthy"))',
     '=IF(OR(C106>90,AND(ISNUMBER(C121),C121>0.9)),"At risk",IF(OR(C107>0,AND(ISNUMBER(C119),C119<0.85),AND(ISNUMBER(C117),C117<-0.1),AND(ISNUMBER(C123),C123<0.7),AND(C97="Private",C122>45)),"Watch","Healthy"))',
     None, VAL_F, "Report A10 without the tender-deadline rule, which needs AW1. Hospital A: overdue balance and capture 67%. Clinic C: Private with no order for 49 days."),
]
for i, (label, b, c, fmt, tmpl, note) in enumerate(spec):
    r = R0 + 1 + i
    w(r, 1, label, LBL)
    w(r, 2, b, tmpl, fmt)
    w(r, 3, c, tmpl if not isinstance(c, str) or c.startswith("=") else VAL_I, fmt if (not isinstance(c, str) or c.startswith("=")) else None)
    if note:
        w(r, 5, note, NOTE)
    we.row_dimensions[r].height = we.row_dimensions[41].height
LAST_ACC = R0 + len(spec)  # row 124

# segment totals
S0 = LAST_ACC + 3  # 127
w(S0, 1, "Segment totals", H); w(S0, 2, "Tender", we["B86"]); w(S0, 3, "Private", we["C86"])
SEG, SALES, GP, OUT, OVD, PYS = "$B$97:$C$97", "$B$101:$C$101", "$B$114:$C$114", "$B$105:$C$105", "$B$107:$C$107", "$B$112:$C$112"
seg_spec = [
    ("Accounts", lambda x: f"=COUNTIF({SEG},{x}{S0})", INT, "Customers in the segment."),
    ("Sales YTD (JOD)", lambda x: f"=SUMIF({SEG},{x}{S0},{SALES})", MONEY, ""),
    ("Gross profit YTD (JOD)", lambda x: f"=SUMIF({SEG},{x}{S0},{GP})", MONEY, ""),
    ("Gross margin", lambda x: f'=IF({x}{S0+2}=0,"Data missing",{x}{S0+3}/{x}{S0+2})', PCT, "Segment gross profit / segment sales, not an average of account margins."),
    ("Share of gross profit", lambda x: f'=IF(SUM($B${S0+3}:$C${S0+3})=0,"Data missing",{x}{S0+3}/SUM($B${S0+3}:$C${S0+3}))', PCT, "The two shares add to 100%."),
    ("Outstanding (JOD)", lambda x: f"=SUMIF({SEG},{x}{S0},{OUT})", MONEY, ""),
    ("Overdue (JOD)", lambda x: f"=SUMIF({SEG},{x}{S0},{OVD})", MONEY, ""),
    ("Days sales outstanding", lambda x: f'=IF({x}{S0+2}=0,"Data missing",{x}{S0+6}/{x}{S0+2}*$B$100)', "0.0", ""),
    ("Sales vs last year", lambda x: f'=IF(SUMIF({SEG},{x}{S0},{PYS})<=0,"Data missing",{x}{S0+2}/SUMIF({SEG},{x}{S0},{PYS})-1)', PCT, "Segment sales / segment prior-year sales - 1."),
]
for i, (label, f, fmt, note) in enumerate(seg_spec):
    r = S0 + 1 + i
    w(r, 1, label, LBL)
    w(r, 2, f("B"), VAL_F, fmt)
    w(r, 3, f("C"), VAL_F, fmt)
    if note:
        w(r, 5, note, NOTE)
    we.row_dimensions[r].height = we.row_dimensions[41].height
CHK = S0 + 1 + len(seg_spec)
w(CHK, 1, "Check: segments add up to the accounts", LBL)
w(CHK, 2, f'=IF(AND(B{S0+2}+C{S0+2}=SUM({SALES}),B{S0+3}+C{S0+3}=SUM({GP}),B{S0+6}+C{S0+6}=SUM({OUT})),"OK","Check")', VAL_F)
w(CHK, 5, "Tender + Private must equal the company: sales, gross profit and receivables.", NOTE)

# tender block
T0 = CHK + 3
w(T0, 1, "Tenders (AW1 + AW3 + AM8)", H); w(T0, 2, "Hospital A tender", we["B86"]); w(T0, 3, "Hospital B tender", we["C86"])
def aw3(col, x):
    return f"=INDEX({rng(col, f3, l3)},MATCH({x}{T0+1},{rng('A', f3, l3)},0))"
t_spec = [
    ("Record code (AW1)", "=B9", "=C9", None, VAL_F, "Same project codes as the rows above."),
    ("Contract value (JOD)", "=B59", "=C59", MONEY, VAL_F, "AW1."),
    ("Delivered (%)", aw3("D", "B"), aw3("D", "C"), INT, VAL_F, "AW3."),
    ("Backlog still to deliver (JOD)", f"=B{T0+2}*(1-B{T0+3}/100)", f"=C{T0+2}*(1-C{T0+3}/100)", MONEY, VAL_F, "Value x (1 - delivered %)."),
    ("Invoiced to date (JOD)", aw3("E", "B"), aw3("E", "C"), MONEY, VAL_F, "AW3."),
    ("Delivered, not yet invoiced (JOD)", f"=B{T0+2}*B{T0+3}/100-B{T0+5}", f"=C{T0+2}*C{T0+3}/100-C{T0+5}", MONEY, VAL_F, "Value delivered but not billed: a billing delay."),
    ("Collected to date (JOD)", aw3("F", "B"), aw3("F", "C"), MONEY, VAL_F, "AW3."),
    ("Invoiced, not yet collected (JOD)", f"=B{T0+5}-B{T0+7}", f"=C{T0+5}-C{T0+7}", MONEY, VAL_F, "Invoiced - collected."),
    ("Check: equals the open invoice balance (row 45)", f'=IF(ROUND(B{T0+8}-B45,2)=0,"OK","Check")', f'=IF(ROUND(C{T0+8}-C45,2)=0,"OK","Check")', None, VAL_F, "AW3 billing must agree with E05."),
    ("Guarantee expiry", aw3("I", "B"), aw3("I", "C"), DATEF, VAL_F, "AW3."),
    ("Days to guarantee expiry", f"=B{T0+10}-B15", f"=C{T0+10}-C15", INT, VAL_F, "Expiry - snapshot date."),
]
for i, (label, b, c, fmt, tmpl, note) in enumerate(t_spec):
    r = T0 + 1 + i
    w(r, 1, label, LBL); w(r, 2, b, tmpl, fmt); w(r, 3, c, tmpl, fmt)
    if note:
        w(r, 5, note, NOTE)
    we.row_dimensions[r].height = we.row_dimensions[41].height
O0 = T0 + 1 + len(t_spec) + 1
w(O0, 1, "Tender results (AM8)", H); w(O0, 2, "Value", we["B86"]); w(O0, 3, "", we["C86"])
res_row = f7  # placeholder to keep names unique
a8 = f8
res = [
    ("Win rate: won / (won + lost)", f'=IF({ACC}!$C${a8}+{ACC}!$D${a8}=0,"Data missing",{ACC}!$C${a8}/({ACC}!$C${a8}+{ACC}!$D${a8}))', PCT, "Pending tenders are not counted either way: 6 / (6 + 5)."),
    ("Average won tender (JOD)", f'=IF({ACC}!$C${a8}=0,"Data missing",{ACC}!$G${a8}/{ACC}!$C${a8})', MONEY, "Value won / tenders won."),
    ("Submitted = won + lost + pending", f"={ACC}!$H${a8}", None, "Counts check from AM8."),
]
for i, (label, f, fmt, note) in enumerate(res):
    r = O0 + 1 + i
    w(r, 1, label, LBL); w(r, 2, f, VAL_F, fmt); w(r, 5, note, NOTE)
    we.row_dimensions[r].height = we.row_dimensions[41].height
w(O0 + len(res) + 2, 1, "Rows 95 onward use only the fictional rows of the Accounts sheet. The tender-deadline rule of report A10 and per-line account figures are calculated in the app; they need AW1 dates and E03 lines.", we["A91"])

wb.calculation = CalcProperties(fullCalcOnLoad=True)
wb.save(DST)
print("saved", DST, "accounts rows", f6, l6, f7, l7, f3, l3, f8, l8, "worked rows", R0, LAST_ACC, S0, CHK, T0, O0)
