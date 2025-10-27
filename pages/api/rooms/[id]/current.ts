import type { NextApiRequest, NextApiResponse } from 'next';
import { getDb } from '../../../../lib/mongodb';

type RoomPayload = {
  doctorName: string;
  doctorColor: string; // hex ej. #0ea5e9
  assistantName?: string;
  patientName?: string; // sólo nombre por privacidad
  type?: 'primera_vez' | 'emergencia' | 'tratamiento';
  tooth?: string;
  scheduledAt?: string; // ISO
};

type RoomStateDoc = {
  roomId: number;
  payload: RoomPayload | null;
  updatedAt: string; // ISO
};

/**
 * GET /api/rooms/:id/current
 * Devuelve el "snapshot" del cubículo (o null si está libre).
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end();

  const id = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
  const roomId = Number(id);

  if (!roomId || Number.isNaN(roomId)) {
    return res.status(400).json({ ok: false, error: 'roomId inválido' });
  }

  try {
    const db = await getDb();
    const doc = await db.collection<RoomStateDoc>('room_state').findOne({ roomId });

    if (!doc) {
      return res.status(200).json({
        ok: true,
        roomId,
        payload: null,
        updatedAt: null,
      });
    }

    return res.status(200).json({
      ok: true,
      roomId: doc.roomId,
      payload: doc.payload,
      updatedAt: doc.updatedAt,
    });
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ ok: false, error });
  }
}
