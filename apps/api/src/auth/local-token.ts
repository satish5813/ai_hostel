import { SignJWT, decodeJwt, jwtVerify } from 'jose';

/** Tokens this API issues itself for password logins (migration 128), beside the university's OIDC tokens. */
export const LOCAL_ISSUER = 'klu-hostel-local';
export type LocalClaims = { sub: string; acc: number; ver: number; kind: 'student' | 'staff'; roles: string[]; name?: string };

function secret() {
  const s = process.env.AUTH_SECRET;
  if (s && s.length >= 32) return new TextEncoder().encode(s);
  if (process.env.NODE_ENV === 'production') throw new Error('AUTH_SECRET (32 characters or more) is not set');
  return new TextEncoder().encode('development-only-secret-do-not-use-in-production');
}

/** Students stay signed in on their phone for a month; staff sign in again each working day. */
export function signLocal(c: LocalClaims) {
  return new SignJWT({ acc: c.acc, ver: c.ver, kind: c.kind, roles: c.roles, name: c.name })
    .setProtectedHeader({ alg: 'HS256' }).setSubject(c.sub).setIssuer(LOCAL_ISSUER).setIssuedAt()
    .setExpirationTime(c.kind === 'student' ? '30d' : '12h').sign(secret());
}

/** True for a token this API issued (checked before verifying, so OIDC tokens go to the university's keys). */
export const isLocal = (token: string) => { try { return decodeJwt(token).iss === LOCAL_ISSUER; } catch { return false; } };

export async function verifyLocal(token: string): Promise<LocalClaims> {
  const { payload } = await jwtVerify(token, secret(), { issuer: LOCAL_ISSUER, algorithms: ['HS256'] });
  return { sub: String(payload.sub), acc: Number(payload['acc']), ver: Number(payload['ver']), kind: payload['kind'] as 'student' | 'staff', roles: (payload['roles'] as string[]) ?? [], name: payload['name'] as string | undefined };
}
