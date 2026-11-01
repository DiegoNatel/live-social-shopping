// Why something can be reported (shown in the report dialog and the admin area)
export const REPORT_REASONS = {
  scam: 'Golpe ou fraude',
  counterfeit: 'Produto falsificado',
  prohibited: 'Produto proibido',
  hate: 'Ódio ou assédio',
  sexual: 'Conteúdo sexual',
  minors: 'Risco a crianças ou adolescentes',
  violence: 'Violência',
  spam: 'Spam',
  other: 'Outro motivo',
} as const

export type ReportReason = keyof typeof REPORT_REASONS
export type ReportTarget = 'product' | 'stream' | 'message'
