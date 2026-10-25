import 'server-only'
import { getDb } from './db'
import { str } from './validate'
import type { Address } from '@/types'

type Row = Record<string, any>
const MAX_ADDRESSES = 10

export function toAddress(r: Row): Address {
  return {
    id: r.id,
    name: r.name,
    street: r.street,
    number: r.number,
    complement: r.complement ?? undefined,
    neighborhood: r.neighborhood,
    city: r.city,
    state: r.state,
    zipCode: r.zip_code,
    phone: r.phone,
    isDefault: !!r.is_default,
  }
}

// Validates an address from a request body; name/phone fall back to the given defaults
export function parseAddress(a: Record<string, unknown>, defaults: { name?: string; phone?: string } = {}) {
  const zipCode = str(a.zipCode, 9)?.replace(/\D/g, '') ?? ''
  const address = {
    name: str(a.name, 100) ?? defaults.name ?? null,
    street: str(a.street),
    number: str(a.number, 20),
    complement: str(a.complement, 100) ?? undefined,
    neighborhood: str(a.neighborhood, 100),
    city: str(a.city, 100),
    state: str(a.state, 2)?.toUpperCase() ?? null,
    zipCode,
    phone: str(a.phone, 20) ?? defaults.phone ?? '',
  }
  const { name, street, number, neighborhood, city, state } = address
  if (zipCode.length !== 8 || !name || !street || !number || !neighborhood || !city || !state || !/^[A-Z]{2}$/.test(state)) {
    return null
  }
  return address as Omit<Address, 'id' | 'isDefault'>
}

export async function listAddresses(userId: string): Promise<Address[]> {
  const { results } = await getDb()
    .prepare('SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, rowid DESC')
    .bind(userId)
    .all<Row>()
  return results.map(toAddress)
}

export async function addAddress(userId: string, a: Omit<Address, 'id' | 'isDefault'>, makeDefault: boolean) {
  const db = getDb()
  const count = await db.prepare('SELECT count(*) AS n FROM addresses WHERE user_id = ?').bind(userId).first<number>('n')
  if ((count ?? 0) >= MAX_ADDRESSES) return null
  const id = crypto.randomUUID()
  // The first address is always the default
  const isDefault = makeDefault || count === 0
  await db.batch([
    ...(isDefault ? [db.prepare('UPDATE addresses SET is_default = 0 WHERE user_id = ?').bind(userId)] : []),
    db
      .prepare(
        `INSERT INTO addresses (id, user_id, name, street, number, complement, neighborhood, city, state, zip_code, phone, is_default)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(id, userId, a.name, a.street, a.number, a.complement ?? null, a.neighborhood, a.city, a.state, a.zipCode, a.phone, isDefault ? 1 : 0),
  ])
  return id
}

export async function setDefaultAddress(userId: string, id: string) {
  const db = getDb()
  const [, result] = await db.batch([
    db.prepare('UPDATE addresses SET is_default = 0 WHERE user_id = ? AND EXISTS (SELECT 1 FROM addresses WHERE id = ? AND user_id = ?)').bind(userId, id, userId),
    db.prepare('UPDATE addresses SET is_default = 1 WHERE id = ? AND user_id = ?').bind(id, userId),
  ])
  return result.meta.changes > 0
}

// Deleting the default promotes the most recent remaining address
export async function deleteAddress(userId: string, id: string) {
  const db = getDb()
  const [result] = await db.batch([
    db.prepare('DELETE FROM addresses WHERE id = ? AND user_id = ?').bind(id, userId),
    db
      .prepare(
        `UPDATE addresses SET is_default = 1
         WHERE id = (SELECT id FROM addresses WHERE user_id = ?1 ORDER BY rowid DESC LIMIT 1)
           AND NOT EXISTS (SELECT 1 FROM addresses WHERE user_id = ?1 AND is_default = 1)`
      )
      .bind(userId),
  ])
  return result.meta.changes > 0
}
