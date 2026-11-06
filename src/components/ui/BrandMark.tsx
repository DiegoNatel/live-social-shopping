// Watchhaul's mark: a yellow four-point star. Goes on a black tile.
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="-256 -256 512 512" aria-hidden="true" className={className}>
      <path
        d="M0 -210Q38 -38 210 0Q38 38 0 210Q-38 38 -210 0Q-38 -38 0 -210Z"
        fill="#F5F01E"
        stroke="#F5F01E"
        strokeWidth="18"
        strokeLinejoin="round"
      />
    </svg>
  )
}
