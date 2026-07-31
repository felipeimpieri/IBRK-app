import json

positions_raw = [
    {"contract_id":72063691,"contract_description":"BRK B","position":1,"market_price":511.32998655,"market_value":511.32998655,"currency":"USD","average_price":493.78,"unrealized_pnl":17.54998655,"daily_pnl":14.14998655,"asset_class":"STK"},
    {"contract_id":208813719,"contract_description":"GOOGL","position":10,"market_price":334.23999025,"market_value":3342.3999025,"currency":"USD","average_price":157.40004,"unrealized_pnl":1768.3995025,"daily_pnl":76.7999025,"asset_class":"STK"},
    {"contract_id":43645865,"contract_description":"IBKR","position":2.9247,"market_price":90.80000305,"market_value":265.56276892,"currency":"USD","average_price":59.26700174,"unrealized_pnl":92.22456892,"daily_pnl":-4.29930008,"asset_class":"STK"},
    {"contract_id":8719,"contract_description":"JNJ","position":4,"market_price":267.1000061,"market_value":1068.4000244,"currency":"USD","average_price":244.215,"unrealized_pnl":91.5400244,"daily_pnl":4.6000244,"asset_class":"STK"},
    {"contract_id":8894,"contract_description":"KO","position":11,"market_price":88.25,"market_value":970.75,"currency":"USD","average_price":78.22020909,"unrealized_pnl":110.3277,"daily_pnl":45.98,"asset_class":"STK"},
    {"contract_id":45602025,"contract_description":"MELI","position":1,"market_price":1862.52001955,"market_value":1862.52001955,"currency":"USD","average_price":1999.805,"unrealized_pnl":-137.28498045,"daily_pnl":42.78001955,"asset_class":"STK"},
    {"contract_id":272093,"contract_description":"MSFT","position":4,"market_price":394.08511355,"market_value":1576.3404542,"currency":"USD","average_price":410.112525,"unrealized_pnl":-64.1096458,"daily_pnl":19.9404542,"asset_class":"STK"},
    {"contract_id":10672,"contract_description":"O","position":13,"market_price":65.80000305,"market_value":855.40003965,"currency":"USD","average_price":65.45692308,"unrealized_pnl":4.46003965,"daily_pnl":3.90003965,"asset_class":"STK"},
    {"contract_id":513880603,"contract_description":"ONON","position":4,"market_price":38,"market_value":152,"currency":"USD","average_price":50.209875,"unrealized_pnl":-48.8395,"daily_pnl":3.76,"asset_class":"STK"},
    {"contract_id":11054,"contract_description":"PG","position":6,"market_price":148.8800049,"market_value":893.2800294,"currency":"USD","average_price":156.03666667,"unrealized_pnl":-42.9399706,"daily_pnl":1.5000294,"asset_class":"STK"},
    {"contract_id":320227571,"contract_description":"QQQ","position":4,"market_price":675.98999025,"market_value":2703.959961,"currency":"USD","average_price":487.98505,"unrealized_pnl":752.019761,"daily_pnl":-24.520039,"asset_class":"STK"},
    {"contract_id":787273575,"contract_description":"RKLB","position":7,"market_price":63.93999865,"market_value":447.57999055,"currency":"USD","average_price":71.82571429,"unrealized_pnl":-55.20000945,"daily_pnl":-21.00000945,"asset_class":"STK"},
    {"contract_id":756733,"contract_description":"SPY","position":10,"market_price":740.4500122,"market_value":7404.500122,"currency":"USD","average_price":615.89203,"unrealized_pnl":1245.579822,"daily_pnl":13.600122,"asset_class":"STK"},
    {"contract_id":566188877,"contract_description":"SYM","position":8,"market_price":41.90999985,"market_value":335.2799988,"currency":"USD","average_price":51.265,"unrealized_pnl":-74.8400012,"daily_pnl":3.3599988,"asset_class":"STK"},
    {"contract_id":211651685,"contract_description":"URA","position":18,"market_price":39.01810075,"market_value":702.3258135,"currency":"USD","average_price":53.15555556,"unrealized_pnl":-254.4741865,"daily_pnl":-23.4341865,"asset_class":"STK"},
]

COMPANY_NAMES = {
    "BRK B": "Berkshire Hathaway Cl B", "GOOGL": "Alphabet Inc Cl A", "IBKR": "Interactive Brokers Group",
    "JNJ": "Johnson & Johnson", "KO": "Coca-Cola Co", "MELI": "MercadoLibre Inc", "MSFT": "Microsoft Corp",
    "O": "Realty Income Corp", "ONON": "On Holding AG", "PG": "Procter & Gamble Co", "QQQ": "Invesco QQQ Trust",
    "RKLB": "Rocket Lab Corp", "SPY": "SPDR S&P 500 ETF Trust", "SYM": "Symbotic Inc", "URA": "Global X Uranium ETF",
}

account_summary = {"currency":"USD","net_liquidation":23495.51,"equity_with_loan_value":389.26,"buying_power":389.26,
    "gross_position_value":23088.35,"total_cash_value":389.26,"available_funds":389.26,"initial_margin":0,
    "maintenance_margin":0,"excess_liquidity":389.26,"dividends":17.9,"leverage":"0.98"}

balances = {"cash_balance":389.26,"net_liquidation_value":23481.9005,"stock_market_value":23074.74,
    "unrealized_pnl":3387.52,"realized_pnl":0}

allocation = {
    "asset_class": [
        {"name":"Acciones (Equities)","weight":0.94623263},
        {"name":"Real Estate","weight":0.03642806},
        {"name":"Cash","weight":0.01733931},
    ],
    "sector": [
        {"name":"Broad (ETFs)","weight":0.43015856},
        {"name":"Technology","weight":0.1463936},
        {"name":"Telecomm","weight":0.14217333},
        {"name":"Consumer Non-Cyc","weight":0.10115152},
        {"name":"Healthcare","weight":0.04550739},
        {"name":"Real Estate","weight":0.03642806},
        {"name":"Industrial","weight":0.03335761},
        {"name":"Energy","weight":0.02972607},
        {"name":"Cash","weight":0.01733931},
        {"name":"Financials","weight":0.01130925},
        {"name":"Consumer Cyclicals","weight":0.0064553},
    ],
    "country": [
        {"name":"Estados Unidos","weight":0.91422744},
        {"name":"Argentina","weight":0.07931726},
        {"name":"Suiza","weight":0.0064553},
    ],
    "instrument": [
        {"name":"Acciones","weight":0.52277606},
        {"name":"ETFs","weight":0.45988463},
        {"name":"Cash","weight":0.01733931},
    ],
}

perf = {"1D":0.00600788,"7D":-0.00961941,"MTD":-0.0186687,"1M":0.00715001,"YTD":0.01059938,"1Y":0.1121219}

# YTD cps + dates for the performance line chart
ytd_dates = ["20260101","20260102","20260105","20260106","20260107","20260108","20260109","20260112","20260113","20260114","20260115","20260116","20260119","20260120","20260121","20260122","20260123","20260126","20260127","20260128","20260129","20260130","20260202","20260203","20260204","20260205","20260206","20260209","20260210","20260211","20260212","20260213","20260216","20260217","20260218","20260219","20260220","20260223","20260224","20260225","20260226","20260227","20260302","20260303","20260304","20260305","20260306","20260309","20260310","20260311","20260312","20260313","20260316","20260317","20260318","20260319","20260320","20260323","20260324","20260325","20260326","20260327","20260330","20260331","20260401","20260402","20260403","20260406","20260407","20260408","20260409","20260410","20260413","20260414","20260415","20260416","20260417","20260420","20260421","20260422","20260423","20260424","20260427","20260428","20260429","20260430","20260501","20260504","20260505","20260506","20260507","20260508","20260511","20260512","20260513","20260514","20260515","20260518","20260519","20260520","20260521","20260522","20260525","20260526","20260527","20260528","20260529","20260601","20260602","20260603","20260604","20260605","20260608","20260609","20260610","20260611","20260612","20260615","20260616","20260617","20260618","20260619","20260622","20260623","20260624","20260625","20260626","20260629","20260630","20260701","20260702","20260703","20260706","20260707","20260708","20260709","20260710","20260713","20260714","20260715","20260716","20260717","20260720","20260721","20260722","20260723","20260724","20260727","20260728"]
ytd_cps = [0,-0.00208504,0.01751935,0.02348457,0.02691807,0.02927998,0.03533699,0.03601849,0.03085562,0.02708863,0.02644538,0.02219805,0.02219805,0.00098974,0.0137623,0.02725843,0.02686376,0.03946652,0.0510696,0.05072617,0.03952006,0.03008998,0.0365233,0.02172842,0.00823765,-0.00542369,-0.00450432,0.00760357,0.00068685,-0.00681423,-0.01932444,-0.02204432,-0.02204432,-0.02612413,-0.01861999,-0.02155327,-0.00801507,-0.02950333,-0.02067902,-0.02351745,-0.03316858,-0.03311504,-0.03368744,-0.0410421,-0.03515329,-0.03676547,-0.0436734,-0.03698281,-0.0414489,-0.0409841,-0.05657137,-0.06289658,-0.05034602,-0.04535067,-0.06309326,-0.06640799,-0.08339356,-0.07430191,-0.08640144,-0.07983953,-0.09909445,-0.11271707,-0.11514524,-0.08352052,-0.07446631,-0.07467031,-0.07467031,-0.07174592,-0.07094801,-0.04601818,-0.04259326,-0.04525814,-0.03344739,-0.01832879,-0.00600418,-0.00249233,0.01081612,0.00848048,-0.00184289,0.01149095,0.00403386,0.01018605,0.01446354,0.00901156,0.0055406,0.02933252,0.03282845,0.02571308,0.0321816,0.05258303,0.0461356,0.04740564,0.04415589,0.04138686,0.05102379,0.05958737,0.04479241,0.04831846,0.03798217,0.05094761,0.05118561,0.05533656,0.05533656,0.06335916,0.06770938,0.07052359,0.06761814,0.06253844,0.05421673,0.04067201,0.04870494,0.02564465,0.02648,0.02410951,0.00876367,0.02373121,0.02412715,0.04477864,0.04047791,0.02521987,0.03302384,0.03302384,0.01601676,0.00626578,0.0049299,-0.00053456,0.00342488,0.02271165,0.02982487,0.03301523,0.03663166,0.03663166,0.04249722,0.03684857,0.02979862,0.03294723,0.03647113,0.02908979,0.03348434,0.03703191,0.02706962,0.01318963,0.01580243,0.02041518,0.01659819,-0.00322482,-0.00378216,0.00456408,0.01059938]

trades_raw = [
    {"symbol":"BRK B","side":"BUY","size":1,"price":492.78,"trade_time":"2026-03-12T19:30:30Z","commission":1,"net_amount":492.78},
    {"symbol":"PG","side":"BUY","size":6,"price":155.87,"trade_time":"2026-03-10T19:33:47Z","commission":1,"net_amount":935.22},
    {"symbol":"RKLB","side":"BUY","size":5,"price":71.69,"trade_time":"2026-03-10T17:15:32Z","commission":0,"net_amount":358.45},
    {"symbol":"RKLB","side":"BUY","size":2,"price":71.665,"trade_time":"2026-03-10T17:14:29Z","commission":1,"net_amount":143.33},
    {"symbol":"O","side":"BUY","size":3,"price":65.38,"trade_time":"2026-03-10T16:50:54Z","commission":1,"net_amount":196.14},
    {"symbol":"O","side":"BUY","size":4,"price":65.38,"trade_time":"2026-03-10T16:50:54Z","commission":0,"net_amount":261.52},
    {"symbol":"O","side":"BUY","size":6,"price":65.38,"trade_time":"2026-03-10T16:50:54Z","commission":0,"net_amount":392.28},
    {"symbol":"SYM","side":"BUY","size":8,"price":51.14,"trade_time":"2026-03-10T16:48:44Z","commission":1,"net_amount":409.12},
    {"symbol":"KO","side":"BUY","size":11,"price":78.1293,"trade_time":"2026-03-10T16:48:05Z","commission":1,"net_amount":859.4223},
    {"symbol":"JNJ","side":"BUY","size":4,"price":243.965,"trade_time":"2026-03-10T16:47:47Z","commission":1,"net_amount":975.86},
    {"symbol":"URA","side":"BUY","size":18,"price":53.1,"trade_time":"2026-03-10T16:20:03Z","commission":1,"net_amount":955.8},
    {"symbol":"SPY","side":"BUY","size":4,"price":681.38,"trade_time":"2026-03-03T18:57:14Z","commission":1,"net_amount":2725.52},
    {"symbol":"MSFT","side":"BUY","size":2,"price":405.27,"trade_time":"2026-03-03T18:55:30Z","commission":1,"net_amount":810.54},
]

# --- Simulador "que hubiera pasado" ---
# Close prices for SPY/QQQ/BTC on each trade date, pulled from IBKR get_price_history (SIX_MONTHS, ONE_DAY bars)
BENCH_BY_DATE = {
    "2026-03-03": {"SPY": 680.33, "QQQ": 601.58, "BTC": 73084.0},
    "2026-03-10": {"SPY": 677.18, "QQQ": 607.77, "BTC": 70671.5},
    "2026-03-12": {"SPY": 666.06, "QQQ": 597.26, "BTC": 71565.25},
}
# Current spot prices (SPY/QQQ from live position quotes above; BTC from get_price_snapshot)
BENCH_NOW = {"SPY": 740.4500122, "QQQ": 675.98999025, "BTC": 63698.25}

total_mv = sum(p["market_value"] for p in positions_raw)
total_cost = sum(p["market_value"] - p["unrealized_pnl"] for p in positions_raw)
total_upnl = sum(p["unrealized_pnl"] for p in positions_raw)
total_daily = sum(p["daily_pnl"] for p in positions_raw)

positions = []
for p in positions_raw:
    cost_basis = p["market_value"] - p["unrealized_pnl"]
    positions.append({
        "ticker": p["contract_description"].replace(" ", "."),
        "name": COMPANY_NAMES.get(p["contract_description"], p["contract_description"]),
        "qty": p["position"],
        "avg_price": p["average_price"],
        "price": p["market_price"],
        "market_value": p["market_value"],
        "cost_basis": cost_basis,
        "unrealized_pnl": p["unrealized_pnl"],
        "unrealized_pnl_pct": (p["unrealized_pnl"] / cost_basis) if cost_basis else 0,
        "daily_pnl": p["daily_pnl"],
        "weight": p["market_value"] / total_mv,
    })
positions.sort(key=lambda x: -x["market_value"])

trades = []
for t in trades_raw:
    trades.append({
        "ticker": t["symbol"].replace(" ", "."),
        "side": "Compra" if t["side"] == "BUY" else "Venta",
        "qty": t["size"],
        "price": t["price"],
        "date": t["trade_time"][:10],
        "commission": t["commission"],
        "net_amount": t["net_amount"],
    })
trades.sort(key=lambda x: x["date"], reverse=True)

# --- Simulador: agrego por ticker sobre las operaciones con fecha registrada ---
sim_rows_map = {}
for t in trades_raw:
    tk = t["symbol"].replace(" ", ".")
    d = t["trade_time"][:10]
    amt = t["net_amount"]
    row = sim_rows_map.setdefault(tk, {"ticker": tk, "invested": 0.0, "qty": 0.0, "dates": set(),
                                        "spy_value": 0.0, "qqq_value": 0.0, "btc_value": 0.0})
    row["invested"] += amt
    row["qty"] += t["size"]
    row["dates"].add(d)
    for b, key in (("SPY", "spy_value"), ("QQQ", "qqq_value"), ("BTC", "btc_value")):
        px_then = BENCH_BY_DATE[d][b]
        units = amt / px_then
        row[key] += units * BENCH_NOW[b]

current_price_by_ticker = {p["ticker"]: p["price"] for p in positions}

sim_rows = []
sim_totals = {"invested": 0.0, "real_value": 0.0, "spy_value": 0.0, "qqq_value": 0.0, "btc_value": 0.0}
for tk, row in sim_rows_map.items():
    real_value = row["qty"] * current_price_by_ticker[tk]
    out = {
        "ticker": tk,
        "invested": round(row["invested"], 2),
        "real_value": round(real_value, 2),
        "spy_value": round(row["spy_value"], 2),
        "qqq_value": round(row["qqq_value"], 2),
        "btc_value": round(row["btc_value"], 2),
        "dates": sorted(row["dates"]),
    }
    sim_rows.append(out)
    sim_totals["invested"] += out["invested"]
    sim_totals["real_value"] += out["real_value"]
    sim_totals["spy_value"] += out["spy_value"]
    sim_totals["qqq_value"] += out["qqq_value"]
    sim_totals["btc_value"] += out["btc_value"]

sim_rows.sort(key=lambda r: -r["invested"])
for k in sim_totals:
    sim_totals[k] = round(sim_totals[k], 2)

simulator = {
    "rows": sim_rows,
    "totals": sim_totals,
    "covered_tickers": sorted(sim_rows_map.keys()),
    "excluded_tickers": sorted(set(current_price_by_ticker.keys()) - set(sim_rows_map.keys())),
    "date_range": ["2026-03-03", "2026-03-12"],
}

data = {
    "generated_at": "2026-07-28T22:37:17Z",
    "summary": {
        "net_liquidation": account_summary["net_liquidation"],
        "cash": account_summary["total_cash_value"],
        "gross_position_value": account_summary["gross_position_value"],
        "unrealized_pnl": balances["unrealized_pnl"],
        "unrealized_pnl_pct": balances["unrealized_pnl"] / total_cost,
        "daily_pnl": total_daily,
        "daily_pnl_pct": perf["1D"],
        "dividends_accrued": account_summary["dividends"],
        "realized_pnl": balances["realized_pnl"],
    },
    "performance": perf,
    "performance_series": {"dates": ytd_dates, "cps": ytd_cps},
    "allocation": allocation,
    "positions": positions,
    "trades": trades,
    "simulator": simulator,
}

with open("/root/dashboard/data.json", "w") as f:
    json.dump(data, f, indent=2)

print("total_mv", total_mv)
print("total_cost", total_cost)
print("total_upnl", total_upnl)
print("total_daily", total_daily)
print("n positions", len(positions))
