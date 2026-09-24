import { Database } from './prisma';

export const database = new Database();

export const prisma = database.client;
