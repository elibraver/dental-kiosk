import { SessionOptions } from 'iron-session';

export const sessionOptions: SessionOptions = {
  password: process.env.IRON_SESSION_PASSWORD as string,
  cookieName: 'kiosco_admin',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  },
};

export type AdminSession = {
  isAdmin?: boolean;
};
