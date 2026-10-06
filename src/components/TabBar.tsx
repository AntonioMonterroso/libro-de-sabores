import { NavLink, useLocation } from 'react-router-dom'
import { Compass, Heart, Home, Users } from 'lucide-react'

const TABS = [
  { to: '/', label: 'Inicio', Icon: Home, end: true },
  { to: '/explorar', label: 'Explorar', Icon: Compass },
  { to: '/cocineros', label: 'Cocineros', Icon: Users },
  { to: '/favoritas', label: 'Favoritas', Icon: Heart },
]

export function TabBar() {
  const { pathname } = useLocation()
  const visible = pathname === '/' || ['/explorar', '/cocineros', '/cocinero', '/favoritas', '/ajustes', '/avisos'].some((p) => pathname.startsWith(p))
  if (!visible) return null
  return (
    <nav aria-label="Principal" className="fixed inset-x-0 bottom-0 z-30 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <ul className="mx-auto flex max-w-md items-center justify-around rounded-full border border-hairline bg-ivory/90 p-1.5 shadow-soft backdrop-blur-md">
        {TABS.map(({ to, label, Icon, end }) => (
          <li key={to} className="flex-1">
            <NavLink to={to} end={end} className={({ isActive }) => `flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-full text-[11px] transition-[background-color,color] duration-200 ${isActive ? 'bg-rose text-cocoa' : 'text-cocoa-soft'}`}>
              <Icon size={19} strokeWidth={1.7} />
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
