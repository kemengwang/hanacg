import type { Database } from './connection';
import { normalizeSubject } from '../catalog/normalize';
/** Reuse stored detail payloads; no upstream requests or changes to manually locked regions. */
export async function backfillRegions(database: Database) {
  let cursor = 0;
  let updated = 0;
  while (true) {
    const result = await database.pool.query<{ id: number; subject_id: number; raw: unknown }>(
      "SELECT id,subject_id,raw FROM subject_external_refs WHERE provider='bangumi' AND id>$1 ORDER BY id LIMIT 200",
      [cursor],
    );
    if (!result.rows.length) return updated;
    for (const row of result.rows) {
      const subject = normalizeSubject(row.raw);
      if (subject) {
        const r = await database.pool.query(
          "UPDATE subjects SET regions=$2 WHERE id=$1 AND NOT locked_fields ? 'regions' AND regions IS DISTINCT FROM $2::text[]",
          [row.subject_id, subject.regions],
        );
        updated += r.rowCount ?? 0;
      }
      cursor = row.id;
    }
  }
}
