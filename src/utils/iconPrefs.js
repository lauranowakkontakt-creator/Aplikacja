import { ICON_CATALOG } from '../components/Icons'

export const getModuleIcons = () => {
  try { return JSON.parse(localStorage.getItem('mw_module_icons') || '{}') }
  catch { return {} }
}

export const saveModuleIcon = (id, key) => {
  const c = getModuleIcons()
  localStorage.setItem('mw_module_icons', JSON.stringify({ ...c, [id]: key }))
}

export const resolveIcon = (key, Fallback) => {
  if (!key) return Fallback
  const e = ICON_CATALOG.find(ic => ic.key === key)
  return e?.Component || Fallback
}
