import crypto from 'crypto';

export function hashPassword(pwd: string) {
  return crypto.createHash('sha256').update(pwd).digest('hex');
}
