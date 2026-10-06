type Props = { size?: number; className?: string }

export function ChefHat({ size = 96, className }: Props) {
  return (
    <svg
      width={size}
      height={(size * 154) / 128}
      viewBox="-64 -84 128 156"
      className={className}
      aria-hidden="true"
    >
      <g fill="none" stroke="#E0D2C3" strokeWidth="3" strokeLinejoin="round">
        <circle cx="-38" cy="-30" r="27" />
        <circle cx="38" cy="-30" r="27" />
        <circle cx="0" cy="-50" r="33" />
        <path d="M-50 48L-54 -24H54L50 48Z" />
      </g>
      <g fill="#fff">
        <circle cx="-38" cy="-30" r="27" />
        <circle cx="38" cy="-30" r="27" />
        <circle cx="0" cy="-50" r="33" />
        <path d="M-50 48L-54 -24H54L50 48Z" />
      </g>
      <g fill="none" stroke="#E6DACD" strokeWidth="2" strokeLinecap="round">
        <path d="M-36 -8C-38 12-37 30-35 44M-18 -10C-19 12-19 30-18 44M0 -12V44M18 -10C19 12 19 30 18 44M36 -8C38 12 37 30 35 44" />
        <path d="M-20 -62C-24 -50-22 -40-18 -30M20 -62C24 -50 22 -40 18 -30" />
      </g>
      <rect x="-56" y="44" width="112" height="28" rx="5" fill="#fff" stroke="#E0D2C3" strokeWidth="3" />
      <rect x="-56" y="44" width="112" height="28" rx="5" fill="#fff" />
      <rect x="-56" y="44" width="112" height="3" fill="#B8975A" />
      <line x1="-44" y1="59" x2="44" y2="59" stroke="#B8975A" strokeWidth="1" strokeDasharray="2 4" />
    </svg>
  )
}
