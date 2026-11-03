import Link from 'next/link'
import { AlertTriangle, ArrowDown, ArrowUp, CheckCircle2, OctagonAlert } from 'lucide-react'
import { BR_TIME_ZONE, formatCurrency, formatNumber } from '@/lib/utils'
import type { Alert, FoundersDashboard, Metric, MonthPoint } from '@/lib/founders'

const SOURCE_LABELS: Record<string, string> = {
  pagamento: 'Pagamento',
  reembolso: 'Reembolso',
  email: 'E-mail',
  frete: 'Frete',
  video: 'Vídeo',
  webhook: 'Webhook',
  cron: 'Rotina automática',
  pagina: 'Página',
}

const formatValue = (value: number, format: Metric['format']) =>
  format === 'money' ? formatCurrency(value) : format === 'percent' ? `${value.toFixed(1).replace('.', ',')}%` : formatNumber(value)

// Short enough to sit above a narrow bar; the hover text has the exact value
const barLabel = (value: number, format: Metric['format']) => {
  if (format !== 'money') return formatValue(value, format)
  return value >= 1000 ? `R$ ${(value / 1000).toFixed(1).replace('.', ',')} mil` : `R$ ${Math.round(value)}`
}

// Growth against the previous 30 days; from zero there's no percentage to show
function Change({ metric }: { metric: Metric }) {
  if (metric.previous === 0) return <span className="text-gray-400 text-xs">{metric.value > 0 ? 'Novo' : 'Sem dados antes'}</span>
  const change = ((metric.value - metric.previous) / metric.previous) * 100
  const Icon = change >= 0 ? ArrowUp : ArrowDown
  return (
    <span className="inline-flex items-center gap-0.5 text-gray-600 text-xs">
      <Icon className="w-3 h-3" aria-hidden />
      {Math.abs(change).toFixed(0)}% vs. 30 dias antes
    </span>
  )
}

function StatTile({ metric }: { metric: Metric }) {
  return (
    <div className="bg-white rounded-md shadow-card p-4" title={metric.hint}>
      <p className="text-gray-500 text-xs mb-1">{metric.label}</p>
      <p className="text-gray-900 font-semibold text-xl mb-1 truncate">{formatValue(metric.value, metric.format)}</p>
      <Change metric={metric} />
    </div>
  )
}

const monthName = (month: string) =>
  new Date(`${month}-15T12:00:00Z`).toLocaleDateString('pt-BR', { month: 'short', timeZone: BR_TIME_ZONE }).replace('.', '')

// One measure per chart. Orange alone is too light to read on white, so every bar has its value above it.
function MonthChart({ title, data, get, format }: { title: string; data: MonthPoint[]; get: (p: MonthPoint) => number; format: Metric['format'] }) {
  const max = Math.max(...data.map(get), 1)
  return (
    <div className="bg-white rounded-md shadow-card p-4">
      <h3 className="text-gray-900 font-medium text-sm mb-3">{title}</h3>
      <div className="flex items-end gap-2 h-36" role="img" aria-label={`${title}: ${data.map(p => `${monthName(p.month)} ${formatValue(get(p), format)}`).join(', ')}`}>
        {data.map(p => (
          <div key={p.month} className="flex-1 min-w-0 h-full flex flex-col justify-end items-center" title={`${monthName(p.month)}: ${formatValue(get(p), format)}`}>
            <span className="text-gray-600 text-[10px] mb-1 whitespace-nowrap">{barLabel(get(p), format)}</span>
            <div className="w-full max-w-8 bg-primary rounded-t" style={{ height: `${Math.max((get(p) / max) * 82, get(p) > 0 ? 2 : 0)}%` }} />
          </div>
        ))}
      </div>
      <div className="flex gap-2 border-t border-gray-200 pt-1 mt-px">
        {data.map(p => (
          <span key={p.month} className="flex-1 text-center text-gray-500 text-[10px]">
            {monthName(p.month)}
          </span>
        ))}
      </div>
    </div>
  )
}

function AlertRow({ alert }: { alert: Alert }) {
  const critical = alert.level === 'critical'
  const Icon = critical ? OctagonAlert : AlertTriangle
  const body = (
    <div className={`flex gap-3 p-3 rounded-md border ${critical ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
      <Icon className={`w-5 h-5 flex-shrink-0 ${critical ? 'text-red-700' : 'text-amber-700'}`} aria-hidden />
      <div className="min-w-0">
        <p className="text-gray-900 text-sm font-medium">
          <span className="sr-only">{critical ? 'Crítico: ' : 'Atenção: '}</span>
          {alert.title}
        </p>
        <p className="text-gray-600 text-xs">{alert.detail}</p>
      </div>
    </div>
  )
  return alert.href ? <Link href={alert.href}>{body}</Link> : body
}

export function FoundersView({ sandbox, metrics, months, alerts, errors, funnel, sellers }: FoundersDashboard) {
  const firstStep = funnel[0]?.value || 1
  return (
    <div className="space-y-8">
      {sandbox && (
        <p className="text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 text-sm">
          Modo de teste: vendas e receita são do sandbox do Asaas, não dinheiro real.
        </p>
      )}

      <section>
        <h2 className="text-gray-900 font-semibold mb-3">Precisa de atenção</h2>
        {alerts.length === 0 ? (
          <p className="flex items-center gap-2 text-gray-600 text-sm">
            <CheckCircle2 className="w-5 h-5 text-tropical-green-700" aria-hidden />
            Nada pendente
          </p>
        ) : (
          <div className="space-y-2">
            {alerts.map(a => (
              <AlertRow key={a.title} alert={a} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-gray-900 font-semibold mb-3">Últimos 30 dias</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {metrics.map(m => (
            <StatTile key={m.label} metric={m} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-gray-900 font-semibold mb-3">Por mês</h2>
        <div className="grid lg:grid-cols-3 gap-3">
          <MonthChart title="Vendas" data={months} get={p => p.sales} format="money" />
          <MonthChart title="Usuários ativos" data={months} get={p => p.activeUsers} format="number" />
          <MonthChart title="Novos cadastros" data={months} get={p => p.signups} format="number" />
        </div>
      </section>

      <div className="grid lg:grid-cols-2 gap-6">
        <section>
          <h2 className="text-gray-900 font-semibold mb-3">Jornada do vendedor</h2>
          <div className="bg-white rounded-md shadow-card p-4 space-y-3">
            {funnel.map(step => (
              <div key={step.label}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">{step.label}</span>
                  <span className="text-gray-900 font-medium">{formatNumber(step.value)}</span>
                </div>
                <div className="h-2 rounded bg-gray-100">
                  <div className="h-2 rounded bg-primary" style={{ width: `${(step.value / firstStep) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-gray-900 font-semibold mb-3">Vendedores que mais venderam</h2>
          <div className="bg-white rounded-md shadow-card divide-y divide-gray-100">
            {sellers.length === 0 && <p className="p-4 text-gray-400 text-sm">Nenhuma venda em 30 dias</p>}
            {sellers.map(s => (
              <div key={s.name} className="flex items-center justify-between gap-3 p-3 text-sm">
                <span className="text-gray-900 truncate">{s.name}</span>
                <span className="text-gray-600 whitespace-nowrap">
                  {formatCurrency(s.sales)} · {s.orders} {s.orders === 1 ? 'pedido' : 'pedidos'}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section>
        <h2 className="text-gray-900 font-semibold mb-1">Erros nos últimos 7 dias</h2>
        <p className="text-gray-500 text-xs mb-3">
          Erros 1102 da Cloudflare não aparecem aqui: o sistema é interrompido antes de conseguir registrar.
        </p>
        <div className="bg-white rounded-md shadow-card divide-y divide-gray-100">
          {errors.length === 0 && <p className="p-4 text-gray-400 text-sm">Nenhum erro registrado</p>}
          {errors.map(e => (
            <div key={`${e.source}:${e.message}`} className="p-3">
              <div className="flex justify-between gap-3 text-xs text-gray-500 mb-0.5">
                <span>
                  {SOURCE_LABELS[e.source] ?? e.source}
                  {e.times > 1 && ` · ${e.times} vezes`}
                </span>
                <span>{new Date(e.lastAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: BR_TIME_ZONE })}</span>
              </div>
              <p className="text-gray-900 text-sm break-words">{e.message}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
