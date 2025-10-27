import type { NextApiRequest, NextApiResponse } from 'next';
import { getDb } from '../../lib/mongodb';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const db = await getDb();
    const count = await db.collection('room_state').countDocuments();

    res.status(200).json({
      ok: true,
      mongo: 'connected',
      room_state_count: count,
    });
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : String(err);
    res.status(500).json({
      ok: false,
      error,
    });
  }
}
