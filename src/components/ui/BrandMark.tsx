// VivoBuy's mark: a sunflower head grown by Vogel's rule. Each seed turns by the golden angle
// from the last and sits at sqrt(n) from the centre; the spirals aren't drawn, they just appear.
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5))
const SEEDS = 21 // A Fibonacci number, few enough to stay readable at header size
const FIRST_SEED = 4 // Leaves room for the dark centre dot
const RADIUS = 186
const SCALE = RADIUS / Math.sqrt(SEEDS + FIRST_SEED - 1)
const SMALLEST_DOT = 17
const LARGEST_DOT = 33

// Goes on an orange tile: white seeds around the live dot
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="-256 -256 512 512" aria-hidden="true" className={className}>
      {Array.from({ length: SEEDS }, (_, i) => {
        const n = i + FIRST_SEED
        const r = SCALE * Math.sqrt(n)
        return (
          <circle
            key={n}
            cx={(r * Math.cos(n * GOLDEN_ANGLE)).toFixed(2)}
            cy={(r * Math.sin(n * GOLDEN_ANGLE)).toFixed(2)}
            r={(SMALLEST_DOT + (LARGEST_DOT - SMALLEST_DOT) * Math.sqrt(i / (SEEDS - 1))).toFixed(2)}
            fill="#fff"
          />
        )
      })}
      <circle r={44} fill="#0A1628" />
    </svg>
  )
}
