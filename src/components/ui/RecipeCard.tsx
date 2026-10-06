import { Link } from 'react-router-dom'
import { useSignedUrl, type RecipeListItem } from '../../features/recipes/api'
import { Avatar } from './Avatar'

export function RecipeCard({ r, i = 0 }: { r: RecipeListItem; i?: number }) {
  const img = useSignedUrl(r.cover_url)
  const mins = (r.prep_min ?? 0) + (r.cook_min ?? 0) + (r.rest_min ?? 0)
  return (
    <Link to={`/receta/${r.id}`} className="rise group block overflow-hidden rounded-[22px] border border-hairline bg-white/75 shadow-soft transition-transform duration-200 [transition-timing-function:var(--ease-out)] active:scale-[0.985]" style={{ animationDelay: `${Math.min(i, 8) * 50}ms` }}>
      <div className="aspect-[4/3] bg-rose/40">{img && <img src={img} alt="" loading="lazy" className="size-full object-cover" />}</div>
      <div className="grid gap-1.5 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display text-2xl font-medium leading-tight">{r.title}</h3>
          {r.status === 'draft' && <span className="mt-1 shrink-0 rounded-full bg-pearl px-2 py-0.5 text-xs text-cocoa-soft">Borrador</span>}
        </div>
        {r.subtitle && <p className="line-clamp-2 text-sm text-cocoa-soft">{r.subtitle}</p>}
        <div className="mt-1 flex items-center gap-2 text-sm text-cocoa-soft">
          <Avatar path={r.author?.avatar_url} name={r.author?.display_name} size={24} />
          <span className="truncate">{r.author?.display_name}</span>
          {mins > 0 && <span className="ml-auto shrink-0">{mins >= 60 ? `${Math.floor(mins / 60)} h${mins % 60 ? ` ${mins % 60} min` : ''}` : `${mins} min`}</span>}
        </div>
      </div>
    </Link>
  )
}
