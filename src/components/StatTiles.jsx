// Wspólny rząd kafelków statystyk pod nagłówkiem modułu — jednolita „szata
// graficzna" na wszystkich pod-aplikacjach. Kafle są responsywne (grid N kolumn).
// props: tiles: [{ label, value, color?, Icon? }]
export default function StatTiles({ tiles = [] }) {
  const cols = tiles.length || 1
  return (
    <div className="stat-tiles" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
      {tiles.map((t, i) => (
        <div key={i} className="stat-tile">
          {t.Icon && (
            <div className="stat-tile-icon" style={t.color ? { color: t.color } : undefined}>
              <t.Icon size={18} />
            </div>
          )}
          <div className="stat-tile-value" style={t.color ? { color: t.color } : undefined}>{t.value}</div>
          <div className="stat-tile-label">{t.label}</div>
        </div>
      ))}
    </div>
  )
}
