import bcrypt from 'bcryptjs';
import { env } from '../../config/env';

const SALT_ROUNDS = env.SALT_ROUNDS;

export async function hash_password(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function compare_password(
  password: string,
  password_hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, password_hash);
}
