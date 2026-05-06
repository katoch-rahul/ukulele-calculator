/* global React, ReactDOM */
const { useState, useMemo, useEffect } = React;

// ── palette ──
const C = {
  bg: "#F2F2F7",
  card: "#FFFFFF",
  ink: "#000000",
  ink2: "rgba(60,60,67,0.6)",
  ink3: "rgba(60,60,67,0.18)",
  accent: "#34A853",
  accentSoft: "#E8F5EC",
  warn: "#FF9500",
};

// ── financial helpers ──
const fmtINR = (n) => {
  if (!isFinite(n) || n === 0) return "₹0";
  if (n >= 1e7) return "₹" + (n / 1e7).toFixed(2) + " Cr";
  if (n >= 1e5) return "₹" + (n / 1e5).toFixed(2) + " L";
  return "₹" + Math.round(n).toLocaleString("en-IN");
};
const fmtFull = (n) => "₹" + Math.round(n).toLocaleString("en-IN");
const inflate = (P, r, t) => P * Math.pow(1 + r / 100, t);
const sipForFV = (FV, r, t) => {
  const i = r / 100 / 12, n = t * 12;
  if (i === 0) return FV / n;
  return (FV * i) / (Math.pow(1 + i, n) - 1);
};
const lumpsumForFV = (FV, r, t) => FV / Math.pow(1 + r / 100, t);

// ── shared UI primitives ──
const card = (extra = {}) => ({
  background: C.card, borderRadius: 16,
  overflow: "hidden", ...extra,
});

const cardLabel = () => ({
  fontSize: 11, fontWeight: 600, letterSpacing: 0.5,
  textTransform: "uppercase", color: C.ink2,
  padding: "14px 16px 6px",
});

const chip = (on) => ({
  background: on ? C.ink : "rgba(120,120,128,0.12)",
  color: on ? "#fff" : C.ink,
  border: "none", borderRadius: 999,
  padding: "7px 14px", fontSize: 13, fontWeight: 500,
  fontFamily: "inherit", whiteSpace: "nowrap",
});

const preset = (on) => ({
  background: on ? C.accentSoft : C.card,
  border: on ? `1.5px solid ${C.accent}` : `1px solid ${C.ink3}`,
  borderRadius: 14, padding: "12px 14px",
  textAlign: "left", fontFamily: "inherit", cursor: "pointer",
});

const btnPrimary = () => ({
  flex: 2, background: C.ink, color: "#fff",
  border: "none", borderRadius: 14, padding: "16px",
  fontSize: 17, fontWeight: 600, fontFamily: "inherit",
});

const btnSecondary = () => ({
  flex: 1, background: "rgba(120,120,128,0.12)", color: C.ink,
  border: "none", borderRadius: 14, padding: "16px",
  fontSize: 17, fontWeight: 600, fontFamily: "inherit",
});

// ── Ukulele logo ──
function UkuleleLogo({ size = 22 }) {
  const h = Math.round(size * 56 / 40);
  return (
    <svg viewBox="0 0 40 56" width={size} height={h} style={{ color: C.ink, flexShrink: 0 }}>
      <path d="M14 2 Q14 0.5 15.5 0.5 H24.5 Q26 0.5 26 2 L26.5 8 Q26.5 9.5 25 9.5 H15 Q13.5 9.5 13.5 8 Z" fill="currentColor" />
      <circle cx="13" cy="3.5" r="1.1" fill="currentColor" />
      <circle cx="13" cy="6.5" r="1.1" fill="currentColor" />
      <circle cx="27" cy="3.5" r="1.1" fill="currentColor" />
      <circle cx="27" cy="6.5" r="1.1" fill="currentColor" />
      <rect x="14" y="9.5" width="12" height="1" fill="currentColor" />
      <rect x="17" y="10.5" width="6" height="18" fill="currentColor" />
      <rect x="17" y="14" width="6" height="0.6" fill={C.bg} />
      <rect x="17" y="18" width="6" height="0.6" fill={C.bg} />
      <rect x="17" y="22" width="6" height="0.6" fill={C.bg} />
      <rect x="17" y="26" width="6" height="0.6" fill={C.bg} />
      <ellipse cx="20" cy="36" rx="9" ry="7" fill="currentColor" />
      <ellipse cx="20" cy="46" rx="11" ry="8.5" fill="currentColor" />
      <circle cx="20" cy="44" r="3.2" fill={C.bg} />
      <circle cx="20" cy="44" r="2.4" fill="currentColor" />
      <circle cx="20" cy="44" r="1.8" fill={C.bg} />
      <rect x="15" y="49.5" width="10" height="1.4" fill={C.bg} />
    </svg>
  );
}

// ── Top nav bar ──
function NavBar({ step, onBack }) {
  return (
    <div style={{
      position: "sticky", top: 0, zIndex: 10,
      background: C.bg,
      borderBottom: `0.5px solid ${C.ink3}`,
      padding: "12px 16px",
      display: "flex", alignItems: "center", justifyContent: "space-between",
    }}>
      <div style={{ width: 60 }}>
        {step > 0 && (
          <button onClick={onBack} style={{
            background: "none", border: "none", color: C.accent,
            fontSize: 16, fontWeight: 500, padding: 0, fontFamily: "inherit",
            display: "flex", alignItems: "center", gap: 2,
          }}>
            <span style={{ fontSize: 22, lineHeight: 1, marginTop: -2 }}>‹</span> Back
          </button>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <UkuleleLogo size={18} />
        <span style={{
          fontFamily: '"Instrument Serif", Georgia, serif',
          fontSize: 18, color: C.ink,
        }}>Ukulele Calculator</span>
      </div>

      <div style={{ width: 60, textAlign: "right" }}>
        <span style={{
          fontSize: 12, color: C.ink2,
          fontFamily: '"IBM Plex Mono", monospace',
        }}>{step + 1}/3</span>
      </div>
    </div>
  );
}

// ── Progress dots ──
function ProgressDots({ step }) {
  return (
    <div style={{ display: "flex", justifyContent: "center", gap: 6, padding: "14px 0 2px" }}>
      {[0, 1, 2].map((i) => (
        <div key={i} style={{
          width: i === step ? 20 : 6, height: 6, borderRadius: 3,
          background: i <= step ? C.ink : C.ink3,
          transition: "all 220ms ease",
        }} />
      ))}
    </div>
  );
}

// ── Screen 1: Goal & horizon ──
function GoalScreen({ goal, setGoal, years, setYears, onNext }) {
  const presets = [100000, 500000, 1000000, 5000000, 10000000];
  return (
    <div style={{ padding: "24px 16px 32px", display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <div style={{ fontSize: 34, fontWeight: 700, letterSpacing: -0.5, lineHeight: 1.1, color: C.ink }}>
          New goal
        </div>
        <div style={{ fontSize: 15, color: C.ink2, marginTop: 6 }}>
          What are you saving toward, and when do you need it?
        </div>
      </div>

      {/* Goal amount */}
      <div style={card()}>
        <div style={cardLabel()}>Target amount today</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 4, padding: "4px 16px 14px" }}>
          <span style={{ fontSize: 34, fontWeight: 600, color: C.ink2 }}>₹</span>
          <input
            type="number"
            value={goal || ""}
            onChange={(e) => setGoal(parseFloat(e.target.value) || 0)}
            placeholder="0"
            inputMode="numeric"
            style={{
              flex: 1, border: "none", outline: "none", background: "transparent",
              fontSize: 38, fontWeight: 600, color: C.ink,
              fontFamily: "inherit", padding: 0, letterSpacing: -0.5,
            }}
          />
        </div>
        <div style={{
          borderTop: `0.5px solid ${C.ink3}`,
          padding: "10px 16px 14px",
          display: "flex", gap: 8, flexWrap: "wrap",
        }}>
          {presets.map((v) => (
            <button key={v} onClick={() => setGoal(v)} style={chip(goal === v)}>
              {fmtINR(v)}
            </button>
          ))}
        </div>
      </div>

      {/* Time horizon */}
      <div style={card()}>
        <div style={cardLabel()}>Time horizon</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, padding: "4px 16px 8px" }}>
          <input
            type="number"
            value={years || ""}
            min={1} max={40}
            inputMode="numeric"
            onChange={(e) => setYears(Math.max(1, Math.min(40, parseInt(e.target.value) || 1)))}
            style={{
              border: "none", outline: "none", background: "transparent",
              fontSize: 38, fontWeight: 600, color: C.ink,
              fontFamily: "inherit", padding: 0, width: 80,
            }}
          />
          <span style={{ fontSize: 22, color: C.ink2, fontWeight: 500 }}>
            {years === 1 ? "year" : "years"}
          </span>
        </div>
        <div style={{ padding: "0 16px 16px" }}>
          <input
            type="range" min={1} max={30} value={years}
            onChange={(e) => setYears(parseInt(e.target.value))}
          />
          <div style={{
            display: "flex", justifyContent: "space-between",
            marginTop: 6, fontSize: 11, color: C.ink2,
            fontFamily: '"IBM Plex Mono", monospace',
          }}>
            <span>1y</span><span>10y</span><span>20y</span><span>30y</span>
          </div>
        </div>
      </div>

      <button
        onClick={onNext}
        disabled={!goal || !years}
        style={{
          width: "100%", background: (!goal || !years) ? C.ink3 : C.ink,
          color: "#fff", border: "none", borderRadius: 14,
          padding: "16px", fontSize: 17, fontWeight: 600, fontFamily: "inherit",
        }}
      >
        Continue
      </button>
    </div>
  );
}

// ── Screen 2: Inflation ──
function InflationScreen({ goal, years, inflation, setInflation, onNext, onBack }) {
  const inflationPresets = [
    { v: 3.4, label: "Latest", note: "CPI · Mar 2026" },
    { v: 4.0, label: "RBI target", note: "2026 – 2031" },
    { v: 5.5, label: "3-yr avg", note: "Recent CPI" },
    { v: 6.0, label: "Upper band", note: "RBI ceiling" },
  ];
  const inflated = inflate(goal, inflation, years);
  const erosion = inflated - goal;

  return (
    <div style={{ padding: "24px 16px 32px", display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <div style={{ fontSize: 34, fontWeight: 700, letterSpacing: -0.5, lineHeight: 1.1, color: C.ink }}>
          Apply inflation
        </div>
        <div style={{ fontSize: 15, color: C.ink2, marginTop: 6 }}>
          Today's <b style={{ color: C.ink }}>{fmtINR(goal)}</b> won't buy the same in {years} {years === 1 ? "year" : "years"}.
        </div>
      </div>

      {/* Inflated value hero */}
      <div style={{
        background: C.ink, color: "#fff", borderRadius: 18, padding: "20px 18px",
      }}>
        <div style={{
          fontSize: 11, fontWeight: 600, letterSpacing: 0.6,
          textTransform: "uppercase", color: "rgba(255,255,255,0.6)", marginBottom: 8,
        }}>
          You'll actually need
        </div>
        <div style={{
          fontSize: 42, fontWeight: 700, letterSpacing: -1, lineHeight: 1,
          fontFamily: '"Instrument Serif", Georgia, serif',
          color: C.accent,
        }}>
          {fmtINR(inflated)}
        </div>
        <div style={{
          marginTop: 12, paddingTop: 12,
          borderTop: "0.5px solid rgba(255,255,255,0.15)",
          display: "flex", justifyContent: "space-between",
          fontSize: 13, color: "rgba(255,255,255,0.7)",
        }}>
          <span>Inflation adds</span>
          <span style={{ color: C.warn, fontWeight: 600 }}>+{fmtINR(erosion)}</span>
        </div>
      </div>

      {/* Slider */}
      <div style={card()}>
        <div style={{ ...cardLabel(), display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>Annual CPI inflation</span>
          <span style={{ color: C.ink, fontWeight: 700, fontSize: 13 }}>{inflation.toFixed(1)}%</span>
        </div>
        <div style={{ padding: "4px 16px 16px" }}>
          <input
            type="range" min={2} max={8} step={0.1} value={inflation}
            onChange={(e) => setInflation(parseFloat(e.target.value))}
          />
        </div>
      </div>

      {/* Presets */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {inflationPresets.map((p) => {
          const on = Math.abs(inflation - p.v) < 0.05;
          return (
            <button key={p.v} onClick={() => setInflation(p.v)} style={preset(on)}>
              <div style={{
                fontSize: 22, fontWeight: 700,
                color: on ? C.accent : C.ink,
                fontFamily: '"Instrument Serif", Georgia, serif',
              }}>
                {p.v.toFixed(1)}%
              </div>
              <div style={{ fontSize: 13, fontWeight: 500, color: C.ink, marginTop: 2 }}>{p.label}</div>
              <div style={{ fontSize: 11, color: C.ink2, marginTop: 1 }}>{p.note}</div>
            </button>
          );
        })}
      </div>

      <div style={{
        fontSize: 11, color: C.ink2, lineHeight: 1.5,
        fontFamily: '"IBM Plex Mono", monospace',
      }}>
        Source: MoSPI Mar 2026 CPI · RBI Monetary Policy Framework · Economic Survey 2025–26.
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={onBack} style={btnSecondary()}>Back</button>
        <button onClick={onNext} style={btnPrimary()}>See the plan</button>
      </div>
    </div>
  );
}

// ── Screen 3: Plan ──
function PlanScreen({ goal, years, inflation, returnRate, setReturnRate, onBack, onReset }) {
  const inflated = useMemo(() => inflate(goal, inflation, years), [goal, inflation, years]);
  const monthly = useMemo(() => sipForFV(inflated, returnRate, years), [inflated, returnRate, years]);
  const lump = useMemo(() => lumpsumForFV(inflated, returnRate, years), [inflated, returnRate, years]);
  const totalInvested = monthly * 12 * years;
  const earnings = inflated - totalInvested;

  const chartPath = useMemo(() => {
    const W = 300, H = 80;
    const i = returnRate / 100 / 12;
    const pts = [];
    for (let t = 0; t <= years; t += years / 40) {
      const n = t * 12;
      const fv = i === 0 ? monthly * n : monthly * (Math.pow(1 + i, n) - 1) / i;
      pts.push([(t / years) * W, H - (fv / (inflated * 1.05)) * H]);
    }
    const line = pts.map((p, k) => (k === 0 ? "M" : "L") + p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" ");
    const area = line + ` L${W},${H} L0,${H} Z`;
    return { line, area, W, H };
  }, [years, returnRate, inflated, monthly]);

  return (
    <div style={{ padding: "24px 16px 40px", display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <div style={{ fontSize: 34, fontWeight: 700, letterSpacing: -0.5, lineHeight: 1.1, color: C.ink }}>
          Your plan
        </div>
        <div style={{ fontSize: 15, color: C.ink2, marginTop: 6 }}>
          To reach <b style={{ color: C.ink }}>{fmtINR(inflated)}</b> in {years} {years === 1 ? "year" : "years"}.
        </div>
      </div>

      {/* Hero SIP card */}
      <div style={{
        background: `linear-gradient(155deg, ${C.accent}, #1e7a38)`,
        borderRadius: 20, padding: "22px 20px",
        boxShadow: "0 8px 24px rgba(52,168,83,0.28)",
      }}>
        <div style={{
          fontSize: 11, fontWeight: 600, letterSpacing: 0.6,
          textTransform: "uppercase", color: "rgba(255,255,255,0.8)", marginBottom: 8,
        }}>
          Invest every month
        </div>
        <div style={{
          fontSize: 44, fontWeight: 700, letterSpacing: -1, lineHeight: 1, color: "#fff",
          fontFamily: '"Instrument Serif", Georgia, serif',
        }}>
          {fmtFull(monthly)}
        </div>
        <div style={{
          marginTop: 10, paddingTop: 12,
          borderTop: "0.5px solid rgba(255,255,255,0.25)",
          display: "flex", justifyContent: "space-between", fontSize: 13,
        }}>
          <span style={{ color: "rgba(255,255,255,0.8)" }}>at annual return of</span>
          <span style={{ color: "#fff", fontWeight: 700 }}>{returnRate.toFixed(1)}% p.a.</span>
        </div>

        {/* mini chart */}
        <svg viewBox={`0 0 ${chartPath.W} ${chartPath.H}`}
          style={{ width: "100%", height: 72, marginTop: 14, display: "block" }}>
          <path d={chartPath.area} fill="rgba(255,255,255,0.18)" />
          <path d={chartPath.line} fill="none" stroke="#fff" strokeWidth={2} />
        </svg>
        <div style={{
          display: "flex", justifyContent: "space-between",
          fontSize: 10, color: "rgba(255,255,255,0.7)", marginTop: 4,
          fontFamily: '"IBM Plex Mono", monospace',
        }}>
          <span>Today</span>
          <span>+{years}y · {fmtINR(inflated)}</span>
        </div>
      </div>

      {/* Return rate */}
      <div style={card()}>
        <div style={{ ...cardLabel(), display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>Expected annual return</span>
          <span style={{ color: C.ink, fontWeight: 700, fontSize: 13 }}>{returnRate.toFixed(1)}%</span>
        </div>
        <div style={{ padding: "4px 16px 12px" }}>
          <input
            type="range" min={4} max={20} step={0.5} value={returnRate}
            onChange={(e) => setReturnRate(parseFloat(e.target.value))}
          />
          <div style={{
            display: "flex", justifyContent: "space-between",
            marginTop: 8, fontSize: 10, color: C.ink2,
            fontFamily: '"IBM Plex Mono", monospace', lineHeight: 1.4,
          }}>
            <span>FD<br/>6.5%</span>
            <span>Debt<br/>7–8%</span>
            <span>Hybrid<br/>10%</span>
            <span>Equity<br/>12%</span>
            <span>Aggr.<br/>14%+</span>
          </div>
        </div>
      </div>

      {/* Breakdown */}
      <div style={{ ...card(), overflow: "hidden" }}>
        {[
          { label: "Or, lumpsum today", value: fmtINR(lump), color: C.ink },
          { label: `Total invested over ${years}y`, value: fmtINR(totalInvested), color: C.ink },
          { label: "Returns earn", value: fmtINR(earnings), color: C.accent },
        ].map((row, i, arr) => (
          <div key={i} style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "15px 16px",
            borderBottom: i < arr.length - 1 ? `0.5px solid ${C.ink3}` : "none",
          }}>
            <span style={{ fontSize: 15, color: C.ink2 }}>{row.label}</span>
            <span style={{ fontSize: 17, fontWeight: 600, color: row.color }}>{row.value}</span>
          </div>
        ))}
      </div>

      <div style={{
        fontSize: 11, color: C.ink2, textAlign: "center",
        fontFamily: '"IBM Plex Mono", monospace',
      }}>
        A planning instrument, not financial advice.
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={onBack} style={btnSecondary()}>Adjust</button>
        <button onClick={onReset} style={btnPrimary()}>New goal</button>
      </div>
    </div>
  );
}

// ── Root app ──
function App() {
  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState(100000);
  const [years, setYears] = useState(5);
  const [inflation, setInflation] = useState(4.0);
  const [returnRate, setReturnRate] = useState(12.0);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [step]);

  const screens = [
    <GoalScreen key="goal" {...{ goal, setGoal, years, setYears }} onNext={() => setStep(1)} />,
    <InflationScreen key="infl" {...{ goal, years, inflation, setInflation }}
      onNext={() => setStep(2)} onBack={() => setStep(0)} />,
    <PlanScreen key="plan" {...{ goal, years, inflation, returnRate, setReturnRate }}
      onBack={() => setStep(1)} onReset={() => { setStep(0); }} />,
  ];

  return (
    <div style={{ minHeight: "100vh", background: C.bg }}>
      <NavBar step={step} onBack={() => setStep(step - 1)} />
      <ProgressDots step={step} />
      {screens[step]}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
