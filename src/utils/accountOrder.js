// Ustala kolejność sortowania kont — najpierw wg pola `order` (ustawianego
// ręcznie w „Kolejności kont"), potem wg czasu utworzenia jako stabilna rezerwa.
export function byAccountOrder(a, b) {
  const oa = a.order ?? Number.MAX_SAFE_INTEGER
  const ob = b.order ?? Number.MAX_SAFE_INTEGER
  if (oa !== ob) return oa - ob
  return (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0)
}
