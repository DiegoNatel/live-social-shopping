// Package sizes a seller can pick with one tap on the quick first-product form, instead of
// typing weight and measures. Freight is quoted from these, so each one is the top of its range.
export const PACKAGE_PRESETS = [
  { id: 'small', label: 'Pequeno', hint: 'até 300 g · cabe num envelope', package: { weightG: 300, heightCm: 4, widthCm: 12, lengthCm: 17 } },
  { id: 'medium', label: 'Médio', hint: 'até 1 kg · caixa de sapato', package: { weightG: 1000, heightCm: 12, widthCm: 20, lengthCm: 30 } },
  { id: 'large', label: 'Grande', hint: 'até 5 kg · caixa de mudança pequena', package: { weightG: 5000, heightCm: 30, widthCm: 30, lengthCm: 40 } },
] as const

export type PackagePresetId = (typeof PACKAGE_PRESETS)[number]['id']
