import { FastifyInstance } from 'fastify'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { ensureUserWalletBSC } from '../services/wallet.js'

const prisma = new PrismaClient()

export async function walletRoutes(app: FastifyInstance) {
  app.addHook('onRequest', async (request, reply) => {
    if (request.routerPath?.startsWith('/wallet')) {
      // require auth for wallet endpoints
      try { await (app as any).authenticate(request, reply) } catch { return }
    }
  })

  app.get('/wallet/deposit-address', async (request: any, reply) => {
    const query = z.object({ asset: z.enum(['USDT','USDC','SMTX']) }).parse(request.query)
    // Currently we return the same BSC address for all BEP20 assets
    const address = await ensureUserWalletBSC(request.user.sub, request.user.userId)
    return { chain: 'BSC', asset: query.asset, address }
  })
}
