import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ensureUserWalletBSC } from '../services/wallet.js';

export async function walletRoutes(app: FastifyInstance) {
  app.addHook('onRequest', app.authenticate);

  app.get('/wallet/deposit-address', async (request: any) => {
    const query = z.object({ asset: z.enum(['USDT', 'USDC', 'SMTX']) }).parse(request.query);
    const address = await ensureUserWalletBSC(request.user.sub, request.user.userId);
    return { chain: 'BSC', asset: query.asset, address };
  });
}
