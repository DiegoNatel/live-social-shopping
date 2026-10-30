import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Format currency to BRL
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

// Format number with Brazilian separators
export function formatNumber(value: number): string {
  return new Intl.NumberFormat('pt-BR').format(value)
}

// Format viewer count (1.2K, 15K, etc.)
export function formatViewerCount(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1).replace('.0', '')}M`
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1).replace('.0', '')}K`
  }
  return count.toString()
}

// Calculate discount percentage
export function calculateDiscount(original: number, current: number): number {
  return Math.round(((original - current) / original) * 100)
}

// Dates show in Brasília time on the server (UTC) and in every browser, so the server-rendered
// HTML matches what the browser renders (otherwise React reports a hydration error)
export const BR_TIME_ZONE = 'America/Sao_Paulo'

// Format date to Brazilian format
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: BR_TIME_ZONE,
  }).format(d)
}

// Format time to Brazilian format
export function formatTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: BR_TIME_ZONE,
  }).format(d)
}

// Format relative time (há 5 minutos, etc.)
export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const seconds = Math.trunc(diff / 1000)
  const minutes = Math.trunc(seconds / 60)
  const hours = Math.trunc(minutes / 60)
  const days = Math.trunc(hours / 24)

  // Future dates (scheduled lives) read "em 2 horas"; past ones "há 2 horas"
  const ago = (n: number, unit: string) => {
    const abs = Math.abs(n)
    const text = `${abs} ${unit}${abs > 1 ? 's' : ''}`
    return n > 0 ? `há ${text}` : `em ${text}`
  }
  if (Math.abs(days) > 0) return ago(days, 'dia')
  if (Math.abs(hours) > 0) return ago(hours, 'hora')
  if (Math.abs(minutes) > 0) return ago(minutes, 'minuto')
  return 'agora mesmo'
}

// Generate random ID
export function generateId(): string {
  return Math.random().toString(36).substring(2, 9)
}

// Truncate text with ellipsis
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return `${text.substring(0, maxLength)}...`
}

// Sleep utility for async operations
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Debounce function
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

// Check if running on mobile
export function isMobile(): boolean {
  if (typeof window === 'undefined') return false
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  )
}

// Parse installment options
export function calculateInstallments(
  total: number,
  maxInstallments: number = 12
): Array<{ installments: number; value: number; hasInterest: boolean }> {
  const options = []
  for (let i = 1; i <= maxInstallments; i++) {
    const hasInterest = i > 3
    const interestRate = hasInterest ? 0.0199 : 0 // 1.99% per month after 3x
    const value = hasInterest
      ? total * (interestRate * Math.pow(1 + interestRate, i)) / (Math.pow(1 + interestRate, i) - 1)
      : total / i
    
    if (value >= 10) { // Minimum R$10 per installment
      options.push({
        installments: i,
        value: Math.ceil(value * 100) / 100,
        hasInterest,
      })
    }
  }
  return options
}

