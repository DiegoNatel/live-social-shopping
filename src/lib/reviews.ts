import 'server-only'
import { getDb } from './db'

type Row = Record<string, any>

export interface ReviewItem {
  productId: string
  productName: string
  image?: string
  review?: { rating: number; comment?: string; createdAt: string }
}

// Every product the user has ordered (not cancelled), with their review if they wrote one
export async function getReviewItems(userId: string): Promise<ReviewItem[]> {
  const { results } = await getDb()
    .prepare(
      `SELECT p.id, p.name, json_extract(p.images, '$[0]') AS image,
              r.rating, r.comment, r.created_at, max(o.created_at) AS last_order
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id AND o.user_id = ?1 AND o.status != 'cancelled'
       JOIN products p ON p.id = oi.product_id
       LEFT JOIN reviews r ON r.product_id = p.id AND r.user_id = ?1
       GROUP BY p.id
       ORDER BY r.id IS NOT NULL, last_order DESC`
    )
    .bind(userId)
    .all<Row>()
  return results.map(r => ({
    productId: r.id,
    productName: r.name,
    image: r.image ?? undefined,
    review: r.rating ? { rating: r.rating, comment: r.comment ?? undefined, createdAt: r.created_at } : undefined,
  }))
}

// Writes or replaces the user's review; only buyers of the product can review it.
// The product's average is updated incrementally because seeded/imported products carry
// ratings and counts that have no rows in reviews.
export async function saveReview(userId: string, productId: string, rating: number, comment: string | null) {
  const db = getDb()
  const previous = await db
    .prepare('SELECT rating FROM reviews WHERE product_id = ? AND user_id = ?')
    .bind(productId, userId)
    .first<number>('rating')

  const [upsert] = await db.batch([
    db
      .prepare(
        `INSERT INTO reviews (id, product_id, user_id, rating, comment)
         SELECT ?1, ?2, ?3, ?4, ?5 WHERE EXISTS (
           SELECT 1 FROM order_items oi JOIN orders o ON o.id = oi.order_id
           WHERE oi.product_id = ?2 AND o.user_id = ?3 AND o.status != 'cancelled'
         )
         ON CONFLICT (product_id, user_id) DO UPDATE SET
           rating = excluded.rating, comment = excluded.comment,
           created_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`
      )
      .bind(crypto.randomUUID(), productId, userId, rating, comment),
    previous == null
      ? db
          .prepare(
            `UPDATE products SET rating = (rating * reviews_count + ?1) / (reviews_count + 1), reviews_count = reviews_count + 1
             WHERE id = ?2 AND changes() > 0`
          )
          .bind(rating, productId)
      : db
          .prepare(`UPDATE products SET rating = rating + (?1 - ?2) * 1.0 / max(reviews_count, 1) WHERE id = ?3`)
          .bind(rating, previous, productId),
  ])
  return upsert.meta.changes > 0
}
