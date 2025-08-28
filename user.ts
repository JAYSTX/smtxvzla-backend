import { FastifyInstance } from 'fastify'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function userRoutes(app: FastifyInstance) {
  app.addHook('onRequest', app.authenticate as any)

  app.get('/', async (request: any) => {
    const me = await prisma.user.findUnique({ where: { id: request.user.sub } })
    const balances = await prisma.balance.findMany({ where: { userId: request.user.sub } })
    return {
      user: {
        userId: me?.userId,
        nickname: me?.nickname,
        email: me?.email,
        phone: me?.phone,
        type: me?.type,
        kycStatus: me?.kycStatus
      },
      balances: balances.map(b => ({ asset: b.asset, available: b.available, locked: b.locked }))
    }
  })
}
