import 'reflect-metadata';
import { createServer, type AddressInfo, type Server, type Socket } from 'node:net';
import { describe, expect, it } from 'vitest';
import { PrismaService } from './prisma.service';

/** A TCP server that accepts connections and never says a word, like a blackholed database host. */
async function startSilentServer(): Promise<{ port: number; stop: () => void }> {
  const sockets: Socket[] = [];
  const server: Server = createServer((socket) => {
    sockets.push(socket);
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  return {
    port,
    stop: () => {
      sockets.forEach((socket) => socket.destroy());
      server.close();
    },
  };
}

describe('PrismaService.isHealthy', () => {
  it('is true against the reachable test database', async () => {
    const prisma = new PrismaService({ DATABASE_URL: process.env['DATABASE_URL']! });
    await expect(prisma.isHealthy()).resolves.toBe(true);
    await prisma.$disconnect();
  });

  it('is false, without throwing, when the database refuses connections', async () => {
    const prisma = new PrismaService({ DATABASE_URL: 'postgresql://localhost:5999/nowhere' });
    await expect(prisma.isHealthy()).resolves.toBe(false);
    await prisma.$disconnect();
  });

  it('is false within its time limit when the database host never answers', async () => {
    const silent = await startSilentServer();
    const prisma = new PrismaService({
      DATABASE_URL: `postgresql://user:pass@127.0.0.1:${silent.port}/db`,
      DB_CONNECT_TIMEOUT_MS: 300,
    });

    const started = Date.now();
    await expect(prisma.isHealthy(1000)).resolves.toBe(false);
    expect(Date.now() - started).toBeLessThan(2500);

    await prisma.$disconnect();
    silent.stop();
  }, 10_000);
});
