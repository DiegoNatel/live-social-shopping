import { MainLayout } from '@/components/layout/MainLayout'
import { StreamCard } from '@/components/stream/StreamCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { getStreams } from '@/lib/db'
import type { Stream } from '@/types'

export const dynamic = 'force-dynamic'

// Rendered on the server, so dates use Brazil's time zone rather than the server's
const TIME_ZONE = 'America/Sao_Paulo'
const dayKey = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: TIME_ZONE })

function dayLabel(date: Date) {
  const today = new Date()
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000)
  if (dayKey(date) === dayKey(today)) return 'Hoje'
  if (dayKey(date) === dayKey(tomorrow)) return 'Amanhã'
  const label = date.toLocaleDateString('pt-BR', { timeZone: TIME_ZONE, weekday: 'long', day: 'numeric', month: 'long' })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

export default async function SchedulePage() {
  const streams = await getStreams({ live: false })
  const days = new Map<string, { label: string; streams: Stream[] }>()
  for (const stream of streams) {
    const date = new Date(stream.scheduledTime ?? stream.startTime)
    const key = dayKey(date)
    const day = days.get(key) ?? { label: dayLabel(date), streams: [] }
    day.streams.push(stream)
    days.set(key, day)
  }

  return (
    <MainLayout headerProps={{ title: 'Agenda de lives' }}>
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {days.size === 0 && <EmptyState title="Nenhuma live agendada" href="/discover" linkLabel="Ver lives ao vivo" />}
        {[...days].map(([key, day]) => (
          <section key={key}>
            <h2 className="text-gray-900 font-semibold mb-2">{day.label}</h2>
            <div className="space-y-2">
              {day.streams.map((stream, index) => (
                <StreamCard key={stream.id} stream={stream} variant="horizontal" index={index} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </MainLayout>
  )
}
