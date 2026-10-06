export function ago(iso: string) {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (m < 1) return 'ahora'
  if (m < 60) return `hace ${m} min`
  if (m < 1440) return `hace ${Math.round(m / 60)} h`
  if (m < 43200) return `hace ${Math.round(m / 1440)} d`
  return new Date(iso).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })
}
