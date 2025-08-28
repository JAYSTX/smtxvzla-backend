import { PrismaClient } from '@prisma/client'
import { HDNodeWallet } from 'ethers'

const prisma = new PrismaClient()

export async function ensureUserWalletBSC(userId: number, stxId: string) {
  const existing = await prisma.userWallet.findFirst({ where: { userId, chain: 'BSC' } })
  if (existing) return existing.address
  const xprv = process.env.WALLET_XPRV
  if (!xprv) throw new Error('WALLET_XPRV not set')
  const index = parseInt(stxId.replace('STX', ''), 10) || 0
  const root = HDNodeWallet.fromExtendedKey(xprv)
  const path = `m/44'/60'/0'/0/${index}`
  const wallet = root.derivePath(path)
  const address = wallet.address
  await prisma.userWallet.create({
    data: { userId, chain: 'BSC', address }
  })
  return address
}
