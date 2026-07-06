// Wspólne zakładki segmentowe z płynnym suwakiem (styl „Dusk").
// items: [{ id, label, icon? }]
export default function SegTabs({ items, active, onChange, style }) {
  const idx = Math.max(0, items.findIndex(i => i.id === active))
  const w = 100 / items.length
  return (
    <div className="seg" style={style}>
      <div className="seg-thumb" style={{ left: `calc(${idx * w}% + 4px)`, width: `calc(${w}% - 8px)` }} />
      {items.map(it => (
        <button key={it.id} type="button" className={it.id === active ? 'active' : ''} onClick={() => onChange?.(it.id)}>
          {it.icon}{it.label}
        </button>
      ))}
    </div>
  )
}
