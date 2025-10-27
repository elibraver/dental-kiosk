import type { NextApiRequest, NextApiResponse } from 'next';
import { getIronSession } from 'iron-session';
import { sessionOptions, AdminSession } from '../../../lib/session';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getIronSession(req, res, sessionOptions);
  const isAdmin = Boolean((session as AdminSession).isAdmin);
  res.status(200).json({ ok: true, isAdmin });
}
