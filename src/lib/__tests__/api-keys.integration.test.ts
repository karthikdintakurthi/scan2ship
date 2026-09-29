/**
 * @jest-environment node
 *
 * Checks the API key migration against a real Postgres database, only when
 * S2S_SESSION_DATABASE_URL is set and names a session database. Read-only.
 */
jest.unmock('path');
jest.unmock('fs/promises');

const SESSION_DATABASE_URL = process.env.S2S_SESSION_DATABASE_URL;
const databaseName = SESSION_DATABASE_URL ? new URL(SESSION_DATABASE_URL).pathname.slice(1) : '';

jest.mock('@/lib/prisma', () => {
  const url = process.env.S2S_SESSION_DATABASE_URL;
  if (!url) return { prisma: {} };
  const { PrismaClient } = jest.requireActual('@prisma/client');
  return { prisma: new PrismaClient({ datasources: { db: { url } } }) };
});

import { prisma } from '@/lib/prisma';
import { hashApiKey } from '@/lib/api-key-auth';

const describeWithDatabase = SESSION_DATABASE_URL ? describe : describe.skip;

describeWithDatabase(`API key migration (database ${databaseName || 'none'})`, () => {
  beforeAll(() => {
    if (!databaseName.includes('session')) {
      throw new Error(`Refusing to run against ${databaseName}: only session databases may be used`);
    }
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("hashes existing keys exactly as the application's hashApiKey does", async () => {
    const raw = 'sk_' + 'f'.repeat(64);
    const [{ hashed }] = await prisma.$queryRaw<{ hashed: string }[]>`
      SELECT 'sha256:' || encode(sha256(convert_to(${raw}, 'UTF8')), 'hex') AS hashed
    `;
    expect(hashed).toBe(hashApiKey(raw));
  });

  it('adds the keyPrefix and createdById columns', async () => {
    const columns = await prisma.$queryRaw<{ column_name: string }[]>`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'api_keys' AND column_name IN ('keyPrefix', 'createdById')
    `;
    expect(columns.map((c) => c.column_name).sort()).toEqual(['createdById', 'keyPrefix']);
  });
});
