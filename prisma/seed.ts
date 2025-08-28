import 'dotenv/config';
import { PrismaClient, Asset, KycStatus, UserStatus, UserType } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { HDNodeWallet } from 'ethers';

const prisma = new PrismaClient();

function formatUserId(n: number) {
  const s = n.toString().padStart(6, '0');
  return `STX${s}`;
}

function indexFromUserId(userId: string) {
  // STX000001 -> 1
  const num = parseInt(userId.replace('STX', ''), 10);
  return isNaN(num) ? 0 : num;
}

async function main() {
  // Founder data from env
  const founderEmail = process.env.FOUNDER_EMAIL || 'jaymokded@smartxp2p.io';
  const founderPhone = process.env.FOUNDER_PHONE || '+34645400712';
  const founderNickname = process.env.FOUNDER_NICKNAME || '$CriptoJay';
  const founderPassword = process.env.FOUNDER_PASSWORD;
  const xprv = process.env.WALLET_XPRV; // Extended private key (Ethereum/BSC)

  if (!founderPassword) {
    throw new Error('FOUNDER_PASSWORD env var is required for seeding the founder user.');
  }
  if (!xprv) {
    throw new Error('WALLET_XPRV env var is required to derive the founder address.');
  }

  const founderUserId = formatUserId(1); // STX000001

  const passwordHash = await bcrypt.hash(founderPassword, 12);

  // Derive address for founder from XPRV using path m/44'/60'/0'/0/index
  const index = indexFromUserId(founderUserId);
  const root = HDNodeWallet.fromExtendedKey(xprv);
  const path = `m/44'/60'/0'/0/${index}`;
  const wallet = root.derivePath(path);
  const address = wallet.address;

  // Upsert founder
  const founder = await prisma.user.upsert({
    where: { email: founderEmail },
    update: {},
    create: {
      userId: founderUserId,
      nickname: founderNickname,
      email: founderEmail,
      phone: founderPhone,
      passwordHash,
      type: UserType.TEAM,
      kycStatus: KycStatus.APPROVED,
      status: UserStatus.ONLINE,
    },
  });

  // Ensure balances exist
  const assets: Asset[] = [Asset.USDT, Asset.USDC, Asset.SMTX];
  for (const asset of assets) {
    await prisma.balance.upsert({
      where: {
        userId_asset: {
          userId: founder.id,
          asset,
        },
      },
      update: {},
      create: {
        userId: founder.id,
        asset,
        available: '0',
        locked: '0',
      },
    });
  }

  // Ensure wallet record exists
  await prisma.userWallet.upsert({
    where: { address },
    update: {},
    create: {
      userId: founder.id,
      chain: 'BSC',
      address,
    },
  });

  console.log('Founder seeded:');
  console.log({
    userId: founder.userId,
    nickname: founder.nickname,
    email: founder.email,
    phone: founder.phone,
    address,
    derivationPath: path,
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
