import 'server-only'
import { getDb } from './db'

const KEEP_DAYS = 30

// Records a failure for the founders' dashboard as well as the logs. Never throws: failing
// to record an error mustn't turn into a second one.
export async function logError(source: string, message: string, ref?: string | null) {
  console.error(`[${source}]`, message, ref ?? '')
  await getDb()
    .prepare('INSERT INTO error_log (id, source, message, ref) VALUES (?, ?, ?, ?)')
    .bind(crypto.randomUUID(), source, message.slice(0, 500), ref ?? null)
    .run()
    .catch(e => console.error('Could not record the error', e))
}

// Run by the cron in worker.ts
export const pruneErrorLog = () =>
  getDb().prepare(`DELETE FROM error_log WHERE created_at < strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-${KEEP_DAYS} days')`).run()
