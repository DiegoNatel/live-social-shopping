import 'server-only'
import { getDb } from './db'

// Usernames show up in page addresses (watchhaul.com/creator/<username>) and in chat.
// 3 to 30 characters: lowercase letters, numbers, "." and "_", not starting or ending
// with a symbol and without two symbols in a row.
const PATTERN = /^(?=.{3,30}$)[a-z0-9](?:[a-z0-9]|[._](?=[a-z0-9]))*$/

// Names that could pass as the platform or clash with its pages
const RESERVED = new Set([
  'admin', 'administrador', 'ajuda', 'api', 'atendimento', 'conta', 'contato', 'feedback', 'help', 'login',
  'moderacao', 'oficial', 'perfil', 'root', 'seguranca', 'seller', 'sistema', 'suporte', 'support', 'staff',
  'vendedor', 'vender', 'watchhaul', 'watchhaul_oficial', 'watchhaul.oficial',
])

export const normalizeUsername = (input: string) => input.trim().replace(/^@+/, '').toLowerCase()

// Why a username can't be used, in words for the person typing it; null when it's fine
export function usernameProblem(username: string): string | null {
  if (username.length < 3) return 'Use pelo menos 3 caracteres.'
  if (username.length > 30) return 'Use no máximo 30 caracteres.'
  if (!PATTERN.test(username))
    return 'Use só letras minúsculas, números, ponto e sublinhado, sem começar ou terminar com símbolo.'
  if (RESERVED.has(username) || username.startsWith('watchhaul')) return 'Esse nome é reservado. Escolha outro.'
  return null
}

// Changes the username, keeping the old one as a redirect to this account.
// Returns an error message for the person, or null when it worked.
export async function changeUsername(userId: string, input: string): Promise<{ error: string } | { username: string }> {
  const username = normalizeUsername(input)
  const problem = usernameProblem(username)
  if (problem) return { error: problem }

  const db = getDb()
  const current = await db.prepare('SELECT username FROM users WHERE id = ?').bind(userId).first<string>('username')
  if (current === null) return { error: 'Conta não encontrada.' }
  if (current === username) return { username }

  const [taken, oldOwner] = await Promise.all([
    db.prepare('SELECT 1 AS x FROM users WHERE username = ? AND id != ?').bind(username, userId).first<number>('x'),
    db.prepare('SELECT user_id FROM username_redirects WHERE old_username = ?').bind(username).first<string>('user_id'),
  ])
  // Someone else's current or old name (their old links still point to them)
  if (taken || (oldOwner && oldOwner !== userId)) return { error: 'Esse nome já está em uso. Escolha outro.' }

  try {
    await db.batch([
      // Taking back one of your own old names: it's no longer a redirect
      db.prepare('DELETE FROM username_redirects WHERE old_username = ? AND user_id = ?').bind(username, userId),
      db.prepare('INSERT OR REPLACE INTO username_redirects (old_username, user_id) VALUES (?, ?)').bind(current, userId),
      db.prepare('UPDATE users SET username = ? WHERE id = ?').bind(username, userId),
    ])
  } catch {
    // Someone took it between the check and the update (users.username is UNIQUE)
    return { error: 'Esse nome já está em uso. Escolha outro.' }
  }
  return { username }
}

// The current username of whoever used this name before, for redirecting old links
export async function findRenamedUsername(oldUsername: string): Promise<string | null> {
  return getDb()
    .prepare(
      `SELECT u.username FROM username_redirects r JOIN users u ON u.id = r.user_id
       WHERE r.old_username = ? AND u.banned_at IS NULL`
    )
    .bind(oldUsername)
    .first<string>('username')
}
