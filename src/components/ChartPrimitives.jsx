import { useState, useEffect, useMemo } from 'react'

// useMounted — trigger CSS transition after mount
export function useMounted(delay = 60) {
  const [on, setOn] = useState(() => typeof document !== 'undefined' && document.hidden)
  useEffect(() => {
    if (document.hidden) { setOn(true); return }
    const id = setTimeout(() => setOn(true), delay)
    return () => clearTimeout(id)
  }, [])
  return on
}

// useCountUp — animuje liczby od 0 do target
export function useCountUp(target, { dur = 900, decimals = 0 } = {}) {
  const [v, setV] = useState(() => (typeof document !== 'undefined' && document.hidden) ? target : 0)
  useEffect(() => {
    if (document.hidden) { setV(target); return }
    let raf, start
    const step = (ts) => {
      if (!start) start = ts
      const p = Math.min(1, (ts - start) / dur)
      const e = 1 - Math.pow(1 - p, 3)
      setV(target * e)
      if (p < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target, dur])
  return decimals ? v.toFixed(decimals) : Math.round(v)
}

// Donut chart z hover i animacją rysowania
export function Donut({ data, size = 200, thickness = 22, gap = 0.018, centerTop, centerMain, centerSub, onHover }) {
  const on = useMounted(120)
  const [hover, setHover] = useState(null)
  const total = data.reduce((s, d) => s + d.value, 0)
  const r = (size - thickness) / 2 - 2
  const C = 2 * Math.PI * r
  let acc = 0
  const segs = data.map((d, i) => {
    const frac = d.value / total
    const len = Math.max(0, frac * C - gap * C)
    const seg = { ...d, i, offset: -acc * C, len, dash: `${len} ${C - len}`, frac }
    acc += frac; return seg
  })
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--surface3)" strokeWidth={thickness} opacity={.5}/>
        {segs.map(s => (
          <circle key={s.i} cx={size/2} cy={size/2} r={r} fill="none"
            stroke={s.color} strokeWidth={hover === s.i ? thickness + 4 : thickness} strokeLinecap="butt"
            strokeDasharray={on ? s.dash : `0 ${C}`} strokeDashoffset={s.offset}
            onMouseEnter={() => { setHover(s.i); onHover && onHover(s) }}
            onMouseLeave={() => { setHover(null); onHover && onHover(null) }}
            style={{ transition: `stroke-dasharray .9s cubic-bezier(.4,0,.2,1) ${s.i * .07}s, stroke-width .2s`, cursor: 'pointer' }}
          />
        ))}
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', pointerEvents: 'none' }}>
        {centerTop && <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '.15em', textTransform: 'uppercase', marginBottom: 4 }}>{centerTop}</div>}
        <div style={{ fontFamily: 'var(--font-sans)', fontSize: size * .19, fontWeight: 700, lineHeight: 1 }}>{centerMain}</div>
        {centerSub && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 5, letterSpacing: '.04em' }}>{centerSub}</div>}
      </div>
    </div>
  )
}

// FlowBar — poziomy pasek przepływu
export function FlowBar({ segments, height = 14 }) {
  const on = useMounted(200)
  const total = segments.reduce((s, d) => s + d.value, 0)
  return (
    <div style={{ display: 'flex', width: '100%', height, borderRadius: 99, overflow: 'hidden', background: 'var(--surface3)' }}>
      {segments.map((s, i) => (
        <div key={i} title={s.label} style={{
          width: on ? `${(s.value / total) * 100}%` : '0%', background: s.color, height: '100%',
          transition: `width .9s cubic-bezier(.4,0,.2,1) ${i * .1}s`,
          borderRight: i < segments.length - 1 ? '2px solid var(--surface)' : 'none',
        }}/>
      ))}
    </div>
  )
}

// Pionowe słupki (trend miesięczny)
export function BarChartSVG({ data, height = 150, accent = 'var(--primary)', fmt }) {
  const on = useMounted(120)
  const max = Math.max(...data.map(d => d.value)) * 1.12 || 1
  const [hover, setHover] = useState(null)
  const tooltipH = fmt ? 26 : 0
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 'min(3%,8px)', height, padding: '0 2px', overflow: 'hidden' }}>
      {data.map((d, i) => {
        const h = (d.value / max) * (100 - (tooltipH / height) * 100)
        const active = d.active || hover === i
        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, height: '100%', justifyContent: 'flex-end', minWidth: 0 }}
            onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
            <div style={{ position: 'relative', width: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', flex: 1, minHeight: tooltipH }}>
              {active && fmt && d.value > 0 && (
                <div style={{ fontSize: 9, color: 'var(--text)', whiteSpace: 'nowrap', background: 'var(--surface2)', padding: '2px 5px', borderRadius: 5, border: '1px solid var(--border-strong)', zIndex: 2, marginBottom: 3, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis' }}>{fmt(d.value)}</div>
              )}
              <div style={{
                width: 'min(70%,28px)', borderRadius: '6px 6px 3px 3px', transformOrigin: 'bottom', flexShrink: 0,
                height: on ? `${h}%` : '0%',
                background: active ? accent : `color-mix(in oklab, ${accent} 30%, var(--surface3))`,
                boxShadow: active ? `0 4px 14px -6px ${accent}` : 'none',
                transition: `height .8s cubic-bezier(.34,1.4,.64,1) ${i * .04}s, background .2s`,
              }}/>
            </div>
            <span style={{ fontSize: 8, color: active ? 'var(--text)' : 'var(--text-muted)', letterSpacing: '.02em', flexShrink: 0, whiteSpace: 'nowrap', overflow: 'hidden', maxWidth: '100%', textAlign: 'center' }}>{d.label}</span>
          </div>
        )
      })}
    </div>
  )
}

// Heatmap (GitHub-style) — do nawyków i modlitwy
export function Heatmap({ weeks = 18, accent = 'var(--warn)', data }) {
  const on = useMounted(80)
  const cells = useMemo(() => {
    if (data) return data
    const out = []; let s = 7
    for (let i = 0; i < weeks * 7; i++) {
      s = (s * 1103515245 + 12345) & 0x7fffffff
      const r = s / 0x7fffffff
      out.push(i > weeks * 7 - 3 ? 0 : r < .16 ? 0 : r < .4 ? 1 : r < .66 ? 2 : r < .88 ? 3 : 4)
    }
    return out
  }, [weeks, data])
  const lvl = (v) => v === 0 ? 'var(--surface2)' : `color-mix(in oklab, ${accent} ${v * 24 + 16}%, var(--surface2))`
  // cell + gap = 11 + 3 = 14px per column; show as many weeks as fit
  return (
    <div style={{ width: '100%', overflow: 'hidden' }}>
      <div style={{ display: 'flex', gap: 3 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, paddingRight: 4, flexShrink: 0 }}>
          {['P','','Ś','','P','','N'].map((d, i) => (
            <span key={i} style={{ fontSize: 8, color: 'var(--text-muted)', height: 11, lineHeight: '11px' }}>{d}</span>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateRows: 'repeat(7,11px)', gridAutoColumns: '11px', gridAutoFlow: 'column', gap: 3, overflow: 'hidden', flex: 1 }}>
          {cells.map((v, i) => (
            <div key={i} style={{
              width: 11, height: 11, borderRadius: 3, background: lvl(v),
              opacity: on ? 1 : 0, transform: on ? 'scale(1)' : 'scale(.4)',
              transition: `opacity .5s cubic-bezier(.4,0,.2,1) ${(i % 40) * .006}s, transform .5s cubic-bezier(.34,1.4,.64,1) ${(i % 40) * .006}s`,
            }}/>
          ))}
        </div>
      </div>
    </div>
  )
}

// Pierścień postępu (streak / procent)
export function Ring({ value, size = 72, thickness = 7, color = 'var(--primary)', label }) {
  const on = useMounted(120)
  const r = (size - thickness) / 2
  const C = 2 * Math.PI * r
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--surface3)" strokeWidth={thickness}/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={thickness} strokeLinecap="round"
          strokeDasharray={C} strokeDashoffset={on ? C * (1 - value / 100) : C}
          style={{ transition: 'stroke-dashoffset 1s cubic-bezier(.4,0,.2,1)' }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: size * .28, lineHeight: 1 }}>{Math.round(value)}<span style={{ fontSize: size * .16, color: 'var(--text-muted)' }}>%</span></div>
          {label && <div style={{ fontSize: 8, color: 'var(--text-muted)', marginTop: 2, textTransform: 'uppercase', letterSpacing: '.08em' }}>{label}</div>}
        </div>
      </div>
    </div>
  )
}

// Spark bars (mini trend inline)
export function Spark({ data, color = 'var(--primary)', height = 30, w = 4 }) {
  const on = useMounted(80)
  const max = Math.max(...data) || 1
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height }}>
      {data.map((v, i) => (
        <div key={i} style={{
          width: w, borderRadius: 2, background: color,
          opacity: .55 + .45 * (v / max),
          height: on ? `${(v / max) * 100}%` : '0%',
          transition: `height .6s cubic-bezier(.34,1.4,.64,1) ${i * .03}s`,
        }}/>
      ))}
    </div>
  )
}
