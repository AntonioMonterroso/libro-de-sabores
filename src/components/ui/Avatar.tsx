import { ChefHat } from '../brand/ChefHat'
import { useSignedUrl } from '../../features/recipes/api'

export function Avatar({ path, name, size = 36 }: { path?: string | null; name?: string; size?: number }) {
  const url = useSignedUrl(path, 'avatars')
  return (
    <span className="inline-grid shrink-0 place-items-center overflow-hidden rounded-full bg-rose ring-1 ring-champagne/60" style={{ width: size, height: size }}>
      {url ? <img src={url} alt={name ?? ''} className="size-full object-cover" /> : <ChefHat size={size * 0.55} />}
    </span>
  )
}
