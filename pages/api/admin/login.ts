import type { NextApiRequest, NextApiResponse } from 'next';
import { getIronSession } from 'iron-session';
import { sessionOptions, AdminSession } from '../../../lib/session';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { pin } = (req.body ?? {}) as { pin?: string };
  if (!pin) return res.status(400).json({ ok: false, error: 'PIN requerido' });

  // Crea/lee la sesión sin el wrapper de "iron-session/next"
  const session = await getIronSession(req, res, sessionOptions);

  if (pin === process.env.ADMIN_PIN) {
    (session as AdminSession).isAdmin = true;
    await session.save();
    return res.status(200).json({ ok: true });
  }

  return res.status(401).json({ ok: false, error: 'PIN incorrecto' });
}
