import 'server-only'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import { getDb } from './db'

// E-mail through Brevo's API (developers.brevo.com). Only this file talks to Brevo, so changing
// provider later means replacing send().
//
// BREVO_API_KEY plus EMAIL_FROM, a sender confirmed in Brevo. Without them nothing is sent and
// the site hides password recovery.

const SENDER_NAME = 'VivoBuy'
const SEND_PER_RUN = 50
// Don't send old news (e.g. a backlog from before e-mail was set up)
const MAX_AGE_HOURS = 24

class EmailError extends Error {
  // Refused for good (e.g. a bad address), as opposed to Brevo being down or over the limit
  constructor(message: string, public permanent: boolean) {
    super(message)
  }
}

function config() {
  const env = getCloudflareContext().env
  if (!env.BREVO_API_KEY || !env.EMAIL_FROM) return null
  return { key: env.BREVO_API_KEY, from: env.EMAIL_FROM, url: env.BREVO_API_URL || 'https://api.brevo.com/v3/smtp/email' }
}

export const emailEnabled = () => config() !== null

const escapeHtml = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

async function send(to: { email: string; name?: string }, subject: string, text: string, link?: { label: string; url: string }) {
  const c = config()
  if (!c) throw new EmailError('E-mail não configurado', false)
  const button = link
    ? `<p><a href="${escapeHtml(link.url)}" style="background:#ff6b00;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none">${escapeHtml(link.label)}</a></p>`
    : ''
  const res = await fetch(c.url, {
    method: 'POST',
    headers: { 'api-key': c.key, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sender: { name: SENDER_NAME, email: c.from },
      to: [to],
      subject,
      textContent: link ? `${text}\n\n${link.label}: ${link.url}` : text,
      htmlContent: `<div style="font-family:sans-serif;font-size:15px;color:#222"><p>${escapeHtml(text)}</p>${button}<p style="color:#888;font-size:12px">${SENDER_NAME}</p></div>`,
    }),
  }).catch((e: unknown) => {
    throw new EmailError(`Brevo fora do ar: ${e instanceof Error ? e.message : String(e)}`, false)
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new EmailError(`Brevo respondeu ${res.status}: ${detail.slice(0, 200)}`, res.status < 500 && res.status !== 401 && res.status !== 429)
  }
}

export async function sendPasswordResetEmail(user: { email: string; name: string }, url: string) {
  await send(
    { email: user.email, name: user.name },
    'Redefina sua senha da VivoBuy',
    'Recebemos um pedido para redefinir sua senha. O link vale por 1 hora. Se não foi você, ignore este e-mail.',
    { label: 'Criar nova senha', url }
  )
}

// Sends order notifications waiting for their e-mail (run by the cron in worker.ts).
// If Brevo is down or over its limit, the rest wait for the next run.
export async function sendPendingEmails() {
  if (!emailEnabled()) return
  const db = getDb()
  const siteUrl = getCloudflareContext().env.BETTER_AUTH_URL
  const { results } = await db
    .prepare(
      `SELECT n.id, n.title, n.message, n.action_url, u.email, u.name
       FROM notifications n JOIN users u ON u.id = n.user_id
       WHERE n.email_status = 'pending'
         AND n.created_at >= strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-${MAX_AGE_HOURS} hours')
       ORDER BY n.created_at LIMIT ${SEND_PER_RUN}`
    )
    .all<{ id: string; title: string; message: string; action_url: string | null; email: string | null; name: string }>()
  const mark = (id: string, status: 'sent' | 'failed') =>
    db.prepare('UPDATE notifications SET email_status = ? WHERE id = ?').bind(status, id).run()

  for (const n of results) {
    if (!n.email) {
      await mark(n.id, 'failed')
      continue
    }
    const link = n.action_url ? { label: 'Ver no site', url: `${siteUrl}${n.action_url}` } : undefined
    try {
      await send({ email: n.email, name: n.name }, n.title, n.message, link)
      await mark(n.id, 'sent')
    } catch (e) {
      if (!(e instanceof EmailError)) throw e
      console.error('E-mail failed', n.id, e.message)
      if (!e.permanent) return
      await mark(n.id, 'failed')
    }
  }
}
