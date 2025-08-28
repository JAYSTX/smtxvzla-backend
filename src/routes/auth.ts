import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { PrismaClient, UserType, KycStatus, UserStatus } from '@prisma/client'
import { assignUserId, isValidNickname } from '../services/userId.js'
import { ensureUserWalletBSC } from '../services/wallet.js'

const prisma = new PrismaClient()

export async function authRoutes(app: FastifyInstance) {
  app.post('/signup', async (request, reply) => {
    const bodySchema = z.object({
      nickname: z.string(),
      email: z.string().email(),
      phone: z.string().min(6),
      password: z.string().min(10)
    })
    const body = bodySchema.parse(request.body)
    if (!isValidNickname(body.nickname)) {
      return reply.code(400).send({ error: 'invalid_nickname', message: 'Nickname debe empezar con $ y tener 3–20 chars [A-Za-z0-9_]' })
    }
    const exists = await prisma.user.findFirst({ where: { OR: [{ email: body.email }, { nickname: body.nickname }] } })
    if (exists) return reply.code(409).send({ error: 'user_exists' })

    const userId = await assignUserId(body.email)
    const passwordHash = await bcrypt.hash(body.password, 12)
    const type = body.email.toLowerCase().endsWith('@smartxp2p.io') ? UserType.TEAM : UserType.NATURAL

    const user = await prisma.user.create({
      data: {
        userId,
        nickname: body.nickname,
        email: body.email,
        phone: body.phone,
        passwordHash,
        type,
        kycStatus: type === UserType.TEAM ? KycStatus.APPROVED : KycStatus.PENDING,
        status: UserStatus.ONLINE
      }
    })

    // create zero balances
    const assets = ['USDT','USDC','SMTX'] as const
    await prisma.$transaction(assets.map(asset => prisma.balance.create({
      data: { userId: user.id, asset, available: '0', locked: '0' } as any
    })))

    const address = await ensureUserWalletBSC(user.id, user.userId)

    const token = app.jwt.sign({ sub: user.id, userId: user.userId })
    return reply.send({
      token,
      user: { userId: user.userId, nickname: user.nickname, email: user.email, phone: user.phone, type: user.type, kycStatus: user.kycStatus },
      wallet: { chain: 'BSC', address }
    })
  })

  app.post('/login', async (request, reply) => {
    const bodySchema = z.object({
      email: z.string().email(),
      password: z.string().min(10)
    })
    const body = bodySchema.parse(request.body)
    const user = await prisma.user.findUnique({ where: { email: body.email } })
    if (!user) return reply.code(401).send({ error: 'invalid_credentials' })
    const ok = await bcrypt.compare(body.password, user.passwordHash)
    if (!ok) return reply.code(401).send({ error: 'invalid_credentials' })

    const token = app.jwt.sign({ sub: user.id, userId: user.userId })
    const balances = await prisma.balance.findMany({ where: { userId: user.id } })
    const addressRecord = await prisma.userWallet.findFirst({ where: { userId: user.id, chain: 'BSC' } })
    return reply.send({
      token,
      user: { userId: user.userId, nickname: user.nickname, email: user.email, phone: user.phone, type: user.type, kycStatus: user.kycStatus },
      wallet: { chain: 'BSC', address: addressRecord?.address },
      balances: balances.map(b => ({ asset: b.asset, available: b.available, locked: b.locked }))
    })
  })
}
