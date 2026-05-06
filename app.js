/* global React, ReactDOM */
const { useState, useMemo } = React;

// Formatting helpers for Indian currency
const fmtINR = (n) => {
  if (!isFinite(n)) return "—";
  if (n >= 1e7) return "₹" + (n / 1e7).toFixed(2) + " Cr";
  if (n >= 1e5) return "₹" + (n / 1e5).toFixed(2) + " L";
  return "₹" + Math.round(n).toLocaleString("en-IN");
};

const fmtFull = (n) => "₹" + Math.round(n).toLocaleString("en-IN");

// Financial calculations
const inflate = (P, r, t) => P * Math.pow(1 + r / 100, t);

const sipForFV = (FV, r, t) => {
  const i = r / 100 / 12;
  const n = t * 12;
  if (i === 0) return FV / n;
  return (FV * i) / (Math.pow(1 + i, n) - 1);
};

const lumpsumForFV = (FV, r, t) => FV / Math.pow(1 + r / 100, t);

const requiredReturnForSIP = (FV, monthly, t) => {
  if (monthly * 12 * t >= FV) return 0;
  let lo = 0, hi = 100;
  for (let k = 0; k < 80; k++) {
    const mid = (lo + hi) / 2;
    const i = mid / 100 / 12, n = t * 12;
    const fv = i === 0 ? monthly * n : monthly * (Math.pow(1 + i, n) - 1) / i;
    if (fv < FV) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
};

// Input component
function NumberInput({ label, value, onChange, suffix, prefix, hint, step = 1, min = 0, max }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <div className="field-input-wrap">
        {prefix && <span className="field-prefix">{prefix}</span>}
        <input
          type="number"
          className="field-input"
          value={value}
          step={step}
          min={min}
          max={max}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        />
        {suffix && <span className="field-suffix">{suffix}</span>}
      </div>
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  );
}

// Stats card component
function StatCard({ kicker, value, sub, big }) {
  return (
    <div className={"stat " + (big ? "stat-big" : "")}>
      <div className="stat-kicker">{kicker}</div>
      <div className="stat-value">{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

// Chart component
function Chart({ years, target, inflated, returnRate }) {
  const W = 720, H = 280, P = 36;
  const pts = [];
  const sipPts = [];
  const FV = inflated;
  const monthly = sipForFV(FV, returnRate, years);

  for (let t = 0; t <= years; t += Math.max(0.25, years / 60)) {
    const goal = inflate(target, (Math.pow(inflated / target, 1 / years) - 1) * 100, t);
    const i = returnRate / 100 / 12;
    const n = t * 12;
    const sipFV = i === 0 ? monthly * n : monthly * (Math.pow(1 + i, n) - 1) / i;
    pts.push([t, goal]);
    sipPts.push([t, sipFV]);
  }

  const maxY = Math.max(inflated, pts[pts.length - 1][1], sipPts[sipPts.length - 1][1]) * 1.05;
  const x = (t) => P + (t / years) * (W - 2 * P);
  const y = (v) => H - P - (v / maxY) * (H - 2 * P);
  const path = (arr) => arr.map((p, i) => (i === 0 ? "M" : "L") + x(p[0]).toFixed(1) + "," + y(p[1]).toFixed(1)).join(" ");
  const areaPath = path(sipPts) + ` L${x(years)},${H - P} L${x(0)},${H - P} Z`;

  const gridY = [0, 0.25, 0.5, 0.75, 1].map((f) => f * maxY);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart" role="img" aria-label="Goal vs investment growth">
      {gridY.map((g, i) => (
        <g key={i}>
          <line x1={P} x2={W - P} y1={y(g)} y2={y(g)} stroke="currentColor" strokeOpacity="0.08" />
          <text x={P - 6} y={y(g) + 4} textAnchor="end" className="chart-tick">{fmtINR(g)}</text>
        </g>
      ))}
      {[0, years / 2, years].map((t, i) => (
        <text key={i} x={x(t)} y={H - P + 18} textAnchor="middle" className="chart-tick">
          {t === 0 ? "Today" : `+${t.toFixed(0)}y`}
        </text>
      ))}
      <path d={areaPath} fill="var(--accent)" fillOpacity="0.12" />
      <path d={path(sipPts)} fill="none" stroke="var(--accent)" strokeWidth="2.5" />
      <path d={path(pts)} fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 4" strokeOpacity="0.55" />
      <circle cx={x(years)} cy={y(inflated)} r="5" fill="var(--ink)" />
      <text x={x(years) - 8} y={y(inflated) - 10} textAnchor="end" className="chart-label">
        Inflated goal · {fmtINR(inflated)}
      </text>
    </svg>
  );
}

// Projection table component
function ProjectionTable({ years, target, inflationRate, returnRate, monthly }) {
  const rows = [];
  let invested = 0, corpus = 0;
  const i = returnRate / 100 / 12;

  for (let yr = 1; yr <= Math.min(years, 30); yr++) {
    for (let m = 0; m < 12; m++) {
      corpus = (corpus + monthly) * (1 + i);
      invested += monthly;
    }
    const goalThen = inflate(target, inflationRate, yr);
    rows.push({ yr, invested, corpus, goalThen, gap: corpus - goalThen });
  }

  return (
    <div className="table-wrap">
      <table className="ptable">
        <thead>
          <tr>
            <th>Year</th>
            <th>Invested</th>
            <th>Corpus @ {returnRate}%</th>
            <th>Goal (inflated)</th>
            <th>Surplus</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.yr} className={r.yr === years ? "row-final" : ""}>
              <td className="num">Y{r.yr}</td>
              <td className="num">{fmtINR(r.invested)}</td>
              <td className="num">{fmtINR(r.corpus)}</td>
              <td className="num">{fmtINR(r.goalThen)}</td>
              <td className={"num " + (r.gap >= 0 ? "pos" : "neg")}>
                {r.gap >= 0 ? "+" : ""}{fmtINR(r.gap)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Main App component
function App() {
  const [goal, setGoal] = useState(100000);
  const [years, setYears] = useState(5);
  const [inflation, setInflation] = useState(4.0);
  const [returnRate, setReturnRate] = useState(12.0);
  const [capacity, setCapacity] = useState(0);

  const inflated = useMemo(() => inflate(goal, inflation, years), [goal, inflation, years]);
  const monthlySIP = useMemo(() => sipForFV(inflated, returnRate, years), [inflated, returnRate, years]);
  const lumpsum = useMemo(() => lumpsumForFV(inflated, returnRate, years), [inflated, returnRate, years]);
  const totalSIPInvested = monthlySIP * 12 * years;
  const erosion = inflated - goal;
  const erosionPct = ((inflated / goal) - 1) * 100;

  const requiredRate = useMemo(
    () => capacity > 0 ? requiredReturnForSIP(inflated, capacity, years) : null,
    [inflated, capacity, years]
  );

  const presets = [
    { v: 3.4, label: "Latest (Mar '26)", note: "Year-on-year CPI Mar 2026" },
    { v: 4.0, label: "RBI target", note: "Official 2026–2031 target" },
    { v: 5.5, label: "3-yr average", note: "Recent CPI growth average" },
    { v: 6.0, label: "Upper band", note: "RBI tolerance ceiling" },
  ];

  return (
    <div className="page">
      <header className="masthead">
        <div className="brand">
          <svg className="brand-mark" viewBox="0 0 40 56" width="22" height="32" aria-label="Ukulele">
            {/* headstock — flared paddle shape */}
            <path d="M14 2 Q14 0.5 15.5 0.5 H24.5 Q26 0.5 26 2 L26.5 8 Q26.5 9.5 25 9.5 H15 Q13.5 9.5 13.5 8 Z" fill="currentColor" />
            {/* tuning pegs */}
            <circle cx="13" cy="3.5" r="1.1" fill="currentColor" />
            <circle cx="13" cy="6.5" r="1.1" fill="currentColor" />
            <circle cx="27" cy="3.5" r="1.1" fill="currentColor" />
            <circle cx="27" cy="6.5" r="1.1" fill="currentColor" />
            <rect x="11.5" y="3" width="1.5" height="1" fill="currentColor" />
            <rect x="11.5" y="6" width="1.5" height="1" fill="currentColor" />
            <rect x="27" y="3" width="1.5" height="1" fill="currentColor" />
            <rect x="27" y="6" width="1.5" height="1" fill="currentColor" />
            {/* nut */}
            <rect x="14" y="9.5" width="12" height="1" fill="currentColor" />
            {/* neck (long & narrow) */}
            <rect x="17" y="10.5" width="6" height="18" fill="currentColor" />
            {/* fret marks (in negative) */}
            <rect x="17" y="14" width="6" height="0.6" fill="var(--paper)" />
            <rect x="17" y="18" width="6" height="0.6" fill="var(--paper)" />
            <rect x="17" y="22" width="6" height="0.6" fill="var(--paper)" />
            <rect x="17" y="26" width="6" height="0.6" fill="var(--paper)" />
            {/* figure-8 body — upper bout */}
            <ellipse cx="20" cy="36" rx="9" ry="7" fill="currentColor" />
            {/* waist cinch */}
            <path d="M11 36 Q14 38 14 40 Q14 42 11.5 43 M29 36 Q26 38 26 40 Q26 42 28.5 43" stroke="var(--paper)" strokeWidth="0.5" fill="none" />
            {/* lower bout (larger) */}
            <ellipse cx="20" cy="46" rx="11" ry="8.5" fill="currentColor" />
            {/* sound hole */}
            <circle cx="20" cy="44" r="3.2" fill="var(--paper)" />
            <circle cx="20" cy="44" r="2.4" fill="currentColor" />
            <circle cx="20" cy="44" r="1.8" fill="var(--paper)" />
            {/* bridge */}
            <rect x="15" y="49.5" width="10" height="1.4" fill="var(--paper)" />
            <rect x="15" y="49.5" width="10" height="1.4" stroke="currentColor" strokeWidth="0.4" fill="none" />
            {/* strings — 4 visible from headstock to bridge */}
            <line x1="18" y1="9.5" x2="17" y2="50" stroke="var(--paper)" strokeWidth="0.35" />
            <line x1="19.3" y1="9.5" x2="19" y2="50" stroke="var(--paper)" strokeWidth="0.35" />
            <line x1="20.7" y1="9.5" x2="21" y2="50" stroke="var(--paper)" strokeWidth="0.35" />
            <line x1="22" y1="9.5" x2="23" y2="50" stroke="var(--paper)" strokeWidth="0.35" />
          </svg>
          <span className="brand-name">Ukulele Calculator</span>
        </div>
        <div className="masthead-meta">
          <span>Goal Planner · India</span>
          <span className="dot">·</span>
          <span>Vol. 01 · May 2026</span>
        </div>
      </header>

      <section className="hero">
        <p className="kicker">A worksheet for the long-minded</p>
        <h1 className="display">
          What will <span className="display-accent">{fmtINR(goal)}</span> really cost you in {years} {years === 1 ? "year" : "years"}?
        </h1>
        <p className="lede">
          Inflation is a quiet tax on patience. Enter a goal, a horizon, and an assumption — we'll show
          the number you actually need, and the discipline it takes to get there.
        </p>
      </section>

      <section className="worksheet">
        <div className="worksheet-grid">
          <div className="col col-inputs">
            <div className="block">
              <div className="block-num">01</div>
              <div className="block-title">Your goal, today</div>
              <NumberInput
                label="Target amount"
                value={goal}
                onChange={setGoal}
                prefix="₹"
                step={10000}
                hint={fmtFull(goal)}
              />
              <div className="chip-row">
                {[100000, 500000, 1000000, 5000000, 10000000].map((v) => (
                  <button key={v} className={"chip " + (goal === v ? "chip-on" : "")} onClick={() => setGoal(v)}>
                    {fmtINR(v)}
                  </button>
                ))}
              </div>
            </div>

            <div className="block">
              <div className="block-num">02</div>
              <div className="block-title">Time horizon</div>
              <NumberInput
                label="Years until you need it"
                value={years}
                onChange={(v) => setYears(Math.max(1, Math.min(40, v)))}
                suffix="years"
                step={1}
                min={1}
                max={40}
              />
              <input
                type="range"
                min="1"
                max="30"
                value={years}
                onChange={(e) => setYears(parseInt(e.target.value))}
                className="slider"
              />
              <div className="slider-scale">
                <span>1y</span><span>10y</span><span>20y</span><span>30y</span>
              </div>
            </div>

            <div className="block">
              <div className="block-num">03</div>
              <div className="block-title">Inflation assumption</div>
              <NumberInput
                label="Annual CPI inflation"
                value={inflation}
                onChange={setInflation}
                suffix="%"
                step={0.1}
              />
              <div className="presets">
                {presets.map((p) => (
                  <button
                    key={p.v}
                    className={"preset " + (Math.abs(inflation - p.v) < 0.05 ? "preset-on" : "")}
                    onClick={() => setInflation(p.v)}
                  >
                    <span className="preset-v">{p.v.toFixed(1)}%</span>
                    <span className="preset-l">{p.label}</span>
                    <span className="preset-n">{p.note}</span>
                  </button>
                ))}
              </div>
              <p className="footnote">
                Source: MoSPI CPI release Mar 2026; RBI Monetary Policy Framework (Apr 2026 – Mar 2031);
                Economic Survey 2025–26.
              </p>
            </div>

            <div className="block">
              <div className="block-num">04</div>
              <div className="block-title">Expected annual return</div>
              <NumberInput
                label="What your investments earn, p.a."
                value={returnRate}
                onChange={(v) => setReturnRate(Math.max(0, Math.min(30, v)))}
                suffix="%"
                step={0.5}
                hint="Equity MFs ~12%, hybrid ~10%, debt ~7%, FD ~6.5%"
              />
              <input
                type="range" min="4" max="20" step="0.5"
                value={returnRate}
                onChange={(e) => setReturnRate(parseFloat(e.target.value))}
                className="slider"
              />
              <div className="rate-scale">
                <span><b>FD</b><br />6.5%</span>
                <span><b>Debt MF</b><br />7–8%</span>
                <span><b>Hybrid</b><br />9–10%</span>
                <span><b>Equity</b><br />11–13%</span>
                <span><b>Aggressive</b><br />14%+</span>
              </div>
            </div>
          </div>

          <div className="col col-output">
            <div className="result-card">
              <div className="result-strip">
                <div className="strip-cell">
                  <div className="strip-label">Today</div>
                  <div className="strip-val">{fmtINR(goal)}</div>
                </div>
                <div className="strip-arrow">
                  <svg viewBox="0 0 80 24" width="80" height="24"><path d="M2 12 H72 M64 4 L72 12 L64 20" fill="none" stroke="currentColor" strokeWidth="1.4" /></svg>
                  <span className="strip-arrow-l">+{years}y · {inflation}%</span>
                </div>
                <div className="strip-cell strip-cell-target">
                  <div className="strip-label">You'll actually need</div>
                  <div className="strip-val strip-val-big">{fmtINR(inflated)}</div>
                </div>
              </div>

              <div className="erosion">
                <span className="erosion-bar">
                  <span className="erosion-fill" style={{ width: Math.min(100, erosionPct) + "%" }} />
                </span>
                <span className="erosion-text">
                  Inflation adds <strong>{fmtINR(erosion)}</strong> ({erosionPct.toFixed(1)}%) to your bill.
                </span>
              </div>

              <Chart years={years} target={goal} inflated={inflated} returnRate={returnRate} />

              <div className="legend">
                <span><span className="sw sw-dash" /> Inflated goal</span>
                <span><span className="sw sw-solid" /> SIP corpus @ {returnRate}%</span>
              </div>
            </div>

            <div className="prescription">
              <div className="rx-head">
                <span className="rx-label">The plan</span>
                <span className="rx-sub">to reach {fmtINR(inflated)} in {years} {years === 1 ? "year" : "years"}</span>
              </div>

              <div className="rx-grid">
                <StatCard
                  big
                  kicker="Monthly SIP"
                  value={fmtFull(monthlySIP)}
                  sub={`at ${returnRate}% annual return`}
                />
                <StatCard
                  kicker="Or, lumpsum today"
                  value={fmtINR(lumpsum)}
                  sub={`compounded at ${returnRate}%`}
                />
                <StatCard
                  kicker="Total invested over horizon"
                  value={fmtINR(totalSIPInvested)}
                  sub={`Returns earn the rest: ${fmtINR(inflated - totalSIPInvested)}`}
                />
                <StatCard
                  kicker="Minimum return needed"
                  value={returnRate.toFixed(1) + "%"}
                  sub="At the SIP shown above"
                />
              </div>

              <div className="capacity-block">
                <div className="capacity-q">Can only spare a fixed amount monthly?</div>
                <NumberInput
                  label="My monthly capacity"
                  value={capacity}
                  onChange={setCapacity}
                  prefix="₹"
                  step={500}
                  hint="We'll back out the return you'd need to hit your goal"
                />
                {capacity > 0 && (
                  <div className={"capacity-result " + (requiredRate > 18 ? "warn" : requiredRate > 14 ? "stretch" : "ok")}>
                    <div className="cr-label">Minimum return required</div>
                    <div className="cr-val">{requiredRate.toFixed(2)}%</div>
                    <div className="cr-note">
                      {requiredRate <= 8 && "Comfortably achievable with debt instruments."}
                      {requiredRate > 8 && requiredRate <= 12 && "Reasonable with a balanced equity portfolio."}
                      {requiredRate > 12 && requiredRate <= 16 && "Stretch — needs equity-heavy, long horizon."}
                      {requiredRate > 16 && requiredRate <= 22 && "Aggressive. Consider raising your monthly amount."}
                      {requiredRate > 22 && "Unrealistic over the long run. Increase capacity or extend horizon."}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="ledger">
        <div className="ledger-head">
          <h2>Year-by-year ledger</h2>
          <span className="ledger-sub">Monthly SIP of <b>{fmtFull(monthlySIP)}</b>, compounded at {returnRate}%</span>
        </div>
        <ProjectionTable
          years={years}
          target={goal}
          inflationRate={inflation}
          returnRate={returnRate}
          monthly={monthlySIP}
        />
      </section>

      <footer className="colophon">
        <div>Ukulele Calculator · A planning instrument, not financial advice.</div>
        <div>Inflation data: Ministry of Statistics &amp; Programme Implementation, RBI, Economic Survey 2025–26.</div>
      </footer>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
