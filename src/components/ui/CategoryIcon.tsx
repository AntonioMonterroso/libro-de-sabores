import { BookHeart, ChefHat, Flame, Leaf, PartyPopper, Sun, Sunrise, Utensils, Wine, Zap, type LucideIcon } from 'lucide-react'
import type { CSSProperties } from 'react'

const ICONS: Record<string, LucideIcon> = { zap: Zap, wine: Wine, sunrise: Sunrise, utensils: Utensils, 'party-popper': PartyPopper, leaf: Leaf, 'chef-hat': ChefHat, 'book-heart': BookHeart, flame: Flame, sun: Sun }

export function CategoryIcon({ icon, anim, delay = 0, size = 28 }: { icon: string; anim: string; delay?: number; size?: number }) {
  const Icon = ICONS[icon] ?? Utensils
  const key = ['fast', 'gala', 'sun', 'soft', 'twinkle', 'sprout', 'sizzle'].includes(anim) ? anim : 'soft'
  const style = { '--sig': `sig-${key}`, '--sig-h': `sig-${key}-h`, '--delay': `${delay}ms` } as CSSProperties
  return (
    <span className="cat-icon" style={style} aria-hidden="true">
      <Icon size={size} strokeWidth={1.6} />
    </span>
  )
}
