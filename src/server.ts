import 'dotenv/config';
import Fastify, { type FastifyRequest, type FastifyReply } from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import jwt from '@fastify/jwt';
import { authRoutes } from './routes/auth.js';
import { userRoutes } from './routes/user.js';
import { walletRoutes } from './routes/wallet.js';

async function startServer() {
  const app = Fastify({ logger: true });

  await app.register(cors, { origin: process.env.ORIGIN?.split(',') ?? true });
  await app.register(rateLimit, { max: 100, timeWindow: '1 minute' });
  await app.register(jwt, { secret: process.env.JWT_SECRET || 'devsecret' });

  app.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await (request as any).jwtVerify();
    } catch {
      reply.code(401).send({ error: 'unauthorized' });
    }
  });

  app.get('/health', async () => ({ ok: true }));

  await app.register(authRoutes, { prefix: '/auth' });
  await app.register(userRoutes, { prefix: '/me' });
  await app.register(walletRoutes, { prefix: '' });

  const port = Number(process.env.PORT || 8080);
  const host = '0.0.0.0';

  try {
    await app.listen({ port, host });
    console.log(`✅ Server running on port ${port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

startServer();
