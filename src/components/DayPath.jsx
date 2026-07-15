import { useEffect, useRef, useState } from 'react'
import { CatIcon, IconCheck } from './Icons'
import { useMounted } from './ChartPrimitives'

// Dzieli tablicę na rzędy po `per` elementów
function chunk(arr, per) {
  const out = []
  for (let i = 0; i < arr.length; i += per) out.push(arr.slice(i, i + per))
  return out
}

// Wspólna „ścieżka dnia" — pozioma linia stacji, jeden język w Nawykach i To-do.
// steps: [{ key, emoji, color, done, title }]
//   emoji  — klucz ikony (jak w CatIcon); brak → kropka
//   color  — kolor akcentu stacji (np. kolor nawyku / listy)
//   done   — czy stacja ukończona
// startLabel / endLabel — podpisy pod pierwszą i ostatnią stacją (np. „Rano" / „Wieczór").
// Przy wielu nawykach ścieżka zawija się do kolejnych rzędów (mierzymy szerokość
// kontenera), zamiast ściskać kółka aż zaczną na siebie nachodzić.
export default function DayPath({ steps = [], startLabel, endLabel, accent = 'var(--accent)', size = 46 }) {
  const on = useMounted(120)
  const ref = useRef(null)
  const [w, setW] = useState(0)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(() => setW(el.clientWidth))
    ro.observe(el)
    setW(el.clientWidth)
    return () => ro.disconnect()
  }, [])

  if (steps.length === 0) return null

  // przy większej liczbie stacji zmniejszamy kółka, żeby zmieściło się ich więcej w rzędzie
  const station = steps.length > 6 ? 38 : size
  const connMin = 10
  // ile stacji zmieści się w jednym rzędzie przy zmierzonej szerokości
  const perRow = w > 0
    ? Math.max(1, Math.floor((w + connMin) / (station + connMin)))
    : steps.length
  const rows = chunk(steps, perRow)

  // pierwsza niezrobiona stacja = „teraz" (delikatny pierścień akcentu) — globalny indeks
  const currentIdx = steps.findIndex(s => !s.done)

  return (
    <div ref={ref}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {rows.map((row, r) => (
          <div key={r} style={{ display: 'flex', alignItems: 'center' }}>
            {row.map((s, j) => {
              const i = r * perRow + j
              const col = s.color || accent
              const isCurrent = i === currentIdx
              return (
                <div key={s.key ?? i} style={{ display: 'flex', alignItems: 'center', flex: j < row.length - 1 ? 1 : '0 0 auto', minWidth: 0 }}>
                  {/* Stacja */}
                  <div title={s.title} style={{
                    width: station, height: station, borderRadius: 99, flexShrink: 0,
                    display: 'grid', placeItems: 'center', position: 'relative',
                    background: s.done ? col : 'var(--surface2)',
                    border: s.done ? `1px solid ${col}` : `1.5px dashed var(--border-strong)`,
                    color: s.done ? 'var(--bg)' : 'var(--text-muted)',
                    boxShadow: isCurrent ? `0 0 0 3px color-mix(in oklab, ${col} 32%, transparent)` : 'none',
                    transform: on ? 'scale(1)' : 'scale(.6)',
                    opacity: on ? 1 : 0,
                    transition: `transform .5s cubic-bezier(.34,1.4,.64,1) ${i * .05}s, opacity .5s ease ${i * .05}s`,
                  }}>
                    {s.emoji
                      ? <CatIcon categoryId={null} emoji={s.emoji} size={Math.round(station * 0.42)} />
                      : s.done ? <IconCheck size={Math.round(station * 0.4)} /> : <span style={{ fontSize: station * 0.36 }}>·</span>}
                  </div>

                  {/* Łącznik do kolejnej stacji w tym rzędzie */}
                  {j < row.length - 1 && (
                    <div style={{ flex: 1, height: 3, borderRadius: 2, margin: '0 4px', minWidth: 8, background: 'var(--surface3)', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', borderRadius: 2, background: col,
                        width: on && s.done ? '100%' : '0%',
                        transition: `width .5s ease ${i * .05 + .2}s`,
                      }} />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>

      {(startLabel || endLabel) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{startLabel}</span>
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{endLabel}</span>
        </div>
      )}
    </div>
  )
}
