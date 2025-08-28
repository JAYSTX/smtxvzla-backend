import 'dotenv/config'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import rateLimit from '@fastify/rate-limit'
import jwt from '@fastify/jwt'
import { authRoutes } from './routes/auth.js'
import { userRoutes } from './routes/user.js'
import { walletRoutes } from './routes/wallet.js'

const app = Fastify({ logger: true })

await app.register(cors, { origin: process.env.ORIGIN?.split(',') ?? true })
await app.register(rateLimit, { max: 100, timeWindow: '1 minute' })
await app.register(jwt, { secret: process.env.JWT_SECRET || 'devsecret' })

app.decorate('authenticate', async (request, reply) => {
  try {
    await request.jwtVerify()
  } catch (err) {
    reply.code(401).send({ error: 'unauthorized' })
  }
})

app.get('/health', async () => ({ ok: true }))

await app.register(authRoutes, { prefix: '/auth' })
await app.register(userRoutes, { prefix: '/me' })
await app.register(walletRoutes, { prefix: '' })

const port = Number(process.env.PORT || 3000)
app.listen({ port, host: '0.0.0.0' }).catch((e) => {
  app.log.error(e)
  process.exit(1)
})
