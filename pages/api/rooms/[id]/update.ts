import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { getDb } from '../../../../lib/mongodb';
import type { AppointmentType, RoomStateDoc, RoomPayload } from '../../../../lib/models';

const appointmentTypes: AppointmentType[] = [
  'Primera Vez',
  'Emergencia',
  'En Tratamiento',
  'Otro Diente',
];

const BodySchema = z.object({
  doctorName: z.string().min(1),
  doctorColor: z.string().regex(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i, 'color inválido'),
  assistantName: z.string().optional().default(''),
  patientName: z.string().optional().default(''),
  recordNumber: z.string().optional().default(''),
  type: z.enum(appointmentTypes as [AppointmentType, ...AppointmentType[]]).optional(),
  tooth: z.string().optional().default(''),
  // Puede venir como "HH:MM" (hora local) o ISO completo
  scheduledAt: z.string().optional(),
});

// Convierte "HH:MM" local a ISO; si ya viene ISO válido, lo respeta
function normalizeScheduledAt(input?: string): string {
  if (!input) return new Date().toISOString();
  if (/^\d{2}:\d{2}$/.test(input)) {
    const [hh, mm] = input.split(':').map(Number);
    const d = new Date();
    d.setHours(hh, mm, 0, 0);
    return d.toISOString();
  }
  const d = new Date(input);
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const id = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
  const roomId = Number(id);
  if (!roomId || Number.isNaN(roomId)) {
    return res.status(400).json({ ok: false, error: 'roomId inválido' });
  }

  try {
    const parsed = BodySchema.parse(req.body);
    const db = await getDb();

    const payload: RoomPayload = {
      doctorName: parsed.doctorName,
      doctorColor: parsed.doctorColor,
      assistantName: parsed.assistantName,
      patientName: parsed.patientName,
      recordNumber: parsed.recordNumber,
      type: parsed.type,
      tooth: parsed.tooth,
      scheduledAt: normalizeScheduledAt(parsed.scheduledAt),
    };

    // 🔁 Sobrescribe el snapshot del cubículo (sin historial)
    await db.collection<RoomStateDoc>('room_state').updateOne(
      { roomId },
      { $set: { payload, updatedAt: new Date().toISOString() } },
      { upsert: true }
    );

    return res.status(200).json({ ok: true, roomId, payload });
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : String(err);
    return res.status(400).json({ ok: false, error });
  }
}
