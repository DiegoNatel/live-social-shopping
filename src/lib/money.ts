// Prices typed by people, in Brazilian format first: "1.299,90", "1299,90", "79,90", "79.90",
// "R$ 1.299". Also unambiguous international input ("1,299.90"). Anything else is refused
// rather than guessed, so a typo never publishes a product at the wrong price.
// Returns reais rounded to centavos, or null.
export function parseBrlAmount(input: unknown): number | null {
  if (typeof input === 'number') return Number.isFinite(input) ? Math.round(input * 100) / 100 : null
  if (typeof input !== 'string') return null
  const text = input.replace(/^\s*R\$\s*/i, '').replace(/\s/g, '')
  if (!/^\d[\d.,]*$/.test(text)) return null

  const lastComma = text.lastIndexOf(',')
  const lastDot = text.lastIndexOf('.')
  let intPart: string
  let decimals = ''
  let thousands: '.' | ',' | null

  if (lastComma >= 0 && lastDot >= 0) {
    // Both: whichever comes last separates the centavos ("1.299,90" or "1,299.90")
    const decimalSep = lastComma > lastDot ? ',' : '.'
    thousands = decimalSep === ',' ? '.' : ','
    const at = text.lastIndexOf(decimalSep)
    intPart = text.slice(0, at)
    decimals = text.slice(at + 1)
    if (intPart.includes(decimalSep)) return null
  } else if (lastComma >= 0) {
    // Comma only: the Brazilian decimal separator ("79,90"). "1,299" would be read as
    // R$ 1,30 by some and R$ 1.299 by others, so more than 2 digits after it is refused.
    if (text.indexOf(',') !== lastComma) return null
    intPart = text.slice(0, lastComma)
    decimals = text.slice(lastComma + 1)
    thousands = null
  } else if (lastDot >= 0) {
    // Dot only: thousands when every group after it has 3 digits ("1.299", "1.299.000"),
    // otherwise the centavos ("79.90", "79.9")
    const groups = text.split('.')
    if (groups.slice(1).every(g => g.length === 3)) {
      intPart = text
      thousands = '.'
    } else if (groups.length === 2 && groups[1].length >= 1 && groups[1].length <= 2) {
      intPart = groups[0]
      decimals = groups[1]
      thousands = null
    } else {
      return null
    }
  } else {
    intPart = text
    thousands = null
  }

  if (decimals.length > 2 || !/^\d*$/.test(decimals)) return null
  if (thousands) {
    const groups = intPart.split(thousands)
    if (!/^\d{1,3}$/.test(groups[0]) || groups.slice(1).some(g => !/^\d{3}$/.test(g))) return null
    intPart = groups.join('')
  }
  if (!/^\d+$/.test(intPart)) return null

  const value = Number(`${intPart}.${decimals || '0'}`)
  return Number.isFinite(value) ? Math.round(value * 100) / 100 : null
}

// A price as the seller would type it back: "1299,9" → "1299,90"
export const toPriceInput = (reais: number) => reais.toFixed(2).replace('.', ',')

export const INVALID_PRICE_MESSAGE = 'Preço inválido. Use o formato 1.299,90'
