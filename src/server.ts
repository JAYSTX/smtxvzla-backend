// src/server.ts
import 'dotenv/config';
import Fastify, { type FastifyRequest, type FastifyReply } from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import jwt from '@fastify/jwt';

// Rutas existentes
import { authRoutes } from './routes/auth.js';
import { userRoutes } from './routes/user.js';
import { walletRoutes } from './routes/wallet.js';
// Nueva ruta P2P
import { p2pRoutes } from './routes/p2p.js';

const app = Fastify({ logger: true });

// Configuración general
await app.register(cors, { origin: process.env.ORIGIN?.split(',') ?? true });
await app.register(rateLimit, { max: 100, timeWindow: '1 minute' });
await app.register(jwt, { secret: process.env.JWT_SECRET || 'devsecret' });

// Middleware de autenticación
app.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    await (request as any).jwtVerify();
  } catch {
    reply.code(401).send({ error: 'unauthorized' });
  }
});

// Endpoint de prueba
app.get('/health', async () => ({ ok: true }));

// Rutas principales
await app.register(authRoutes, { prefix: '/auth' });
await app.register(userRoutes, { prefix: '/me' });
await app.register(walletRoutes, { prefix: '/wallet' });

// ✅ Prefijo estándar REST para el módulo P2P
await app.register(p2pRoutes, { prefix: '/api' });

// Puerto
const port = Number(process.env.PORT || 3000);
app.listen({ port, host: '0.0.0.0' }).catch((e) => {
  app.log.error(e);
  process.exit(1);
});
