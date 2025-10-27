import type { NextApiRequest, NextApiResponse } from 'next';
import { ObjectId } from 'mongodb';
import { z } from 'zod';
import { getDb } from '../../../lib/mongodb';
import type { Assistant } from '../../../lib/models';

const AssistantSchema = z.object({
  _id: z.string().optional(),          // si viene, actualiza; si no, crea
  name: z.string().min(1),
  active: z.boolean().optional().default(true),
});

// Para DELETE sin "any"
const DeleteSchema = z.object({
  _id: z.string().optional(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const db = await getDb();
  const col = db.collection('assistants'); // sin genérico para evitar choques con ObjectId

  if (req.method === 'GET') {
    const raw = (await col.find({}).sort({ name: 1 }).toArray()) as Array<Record<string, unknown>>;
    const items: Assistant[] = raw.map((d) => ({
      _id: d._id ? String(d._id) : undefined,
      name: String(d.name ?? ''),
      active: typeof d.active === 'boolean' ? d.active : true,
    }));
    return res.status(200).json({ ok: true, items });
  }

  if (req.method === 'POST') {
    try {
      const parsed = AssistantSchema.parse(req.body);

      if (parsed._id) {
        const _id = new ObjectId(parsed._id);
        await col.updateOne(
          { _id },
          { $set: { name: parsed.name, active: parsed.active ?? true } },
          { upsert: false }
        );
        return res.status(200).json({ ok: true, action: 'updated', _id: parsed._id });
      }

      const result = await col.insertOne({
        name: parsed.name,
        active: parsed.active ?? true,
      });
      return res.status(200).json({ ok: true, action: 'created', _id: String(result.insertedId) });
    } catch (err: unknown) {
      const error = err instanceof Error ? err.message : String(err);
      return res.status(400).json({ ok: false, error });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const idFromQuery = typeof req.query.id === 'string' ? req.query.id : undefined;
      const bodyParsed = DeleteSchema.safeParse(req.body);
      const idFromBody = bodyParsed.success ? bodyParsed.data._id : undefined;

      const id = idFromQuery ?? idFromBody;
      if (!id) return res.status(400).json({ ok: false, error: 'Falta id' });

      const _id = new ObjectId(id);
      const r = await col.deleteOne({ _id });
      return res.status(200).json({ ok: true, deletedCount: r.deletedCount });
    } catch (err: unknown) {
      const error = err instanceof Error ? err.message : String(err);
      return res.status(400).json({ ok: false, error });
    }
  }

  return res.status(405).end();
}
