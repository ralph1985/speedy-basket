import type { FastifyRequest } from 'fastify';
import jwt from 'jsonwebtoken';
import jwksRsa from 'jwks-rsa';

type AuthTokenPayload = {
  sub?: string;
  role?: string;
};

const jwksUri = process.env.SUPABASE_JWKS_URL;
const jwksClient = jwksUri
  ? jwksRsa({
      jwksUri,
      cache: true,
      cacheMaxEntries: 5,
      cacheMaxAge: 10 * 60 * 1000,
    })
  : null;

function getToken(request: FastifyRequest) {
  const header = request.headers.authorization;
  if (!header) return null;
  const [type, token] = header.split(' ');
  if (type !== 'Bearer' || !token) return null;
  return token;
}

async function verifyToken(token: string) {
  const secret = process.env.SUPABASE_JWT_SECRET;
  if (secret) {
    return new Promise<AuthTokenPayload>((resolve, reject) => {
      jwt.verify(token, secret, { algorithms: ['HS256'] }, (err, payload) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(payload as AuthTokenPayload);
      });
    });
  }

  if (!jwksClient) {
    throw new Error('SUPABASE_JWKS_URL is required');
  }

  return new Promise<AuthTokenPayload>((resolve, reject) => {
    jwt.verify(
      token,
      (header, callback) => {
        if (!header.kid) {
          callback(new Error('Missing kid'));
          return;
        }
        jwksClient.getSigningKey(header.kid, (err, key) => {
          if (err || !key) {
            callback(err || new Error('Signing key not found'));
            return;
          }
          callback(null, key.getPublicKey());
        });
      },
      { algorithms: ['RS256', 'ES256'] },
      (err, payload) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(payload as AuthTokenPayload);
      }
    );
  });
}

export async function getAuthUserId(request: FastifyRequest): Promise<string | null> {
  const token = getToken(request);
  if (!token) return null;

  try {
    const payload = await verifyToken(token);
    if (!payload?.sub) return null;
    return payload.sub;
  } catch {
    return null;
  }
}
