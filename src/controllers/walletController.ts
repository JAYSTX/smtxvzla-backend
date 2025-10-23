// src/controllers/walletController.ts
import { prisma } from "../lib/prisma.js";
import { Prisma, Asset } from "@prisma/client";
import { FastifyRequest, FastifyReply } from "fastify";
import { ethers } from "ethers";

export async function createWallet(request: FastifyRequest, reply: FastifyReply) {
  try {
    const user = (request as any).user;

    const existing = await prisma.userWallet.findFirst({
      where: { userId: user.id, chain: "BSC" },
    });

    if (existing) {
      return reply.code(400).send({
        success: false,
        error: "El usuario ya posee una wallet asociada",
      });
    }

    const wallet = ethers.Wallet.createRandom();
    const newWallet = await prisma.userWallet.create({
      data: {
        userId: user.id,
        chain: "BSC",
        address: wallet.address,
      },
    });

    const assets: Asset[] = [Asset.SMTX, Asset.USDT, Asset.USDC];
    for (const asset of assets) {
      await prisma.balance.create({
        data: {
          userId: user.id,
          asset,
          available: new Prisma.Decimal(0),
          locked: new Prisma.Decimal(0),
        },
      });
    }

    return reply.send({
      success: true,
      message: "Wallet generada correctamente",
      wallet: newWallet,
      balances: assets.map((a) => ({ asset: a, available: 0 })),
    });
  } catch (error) {
    console.error("Error al crear la wallet:", error);
    return reply.code(500).send({ error: "Error interno al crear la wallet" });
  }
}

export async function getWalletInfo(request: FastifyRequest, reply: FastifyReply) {
  try {
    const user = (request as any).user;

    const wallet = await prisma.userWallet.findFirst({
      where: { userId: user.id },
    });

    if (!wallet) {
      return reply.code(404).send({
        success: false,
        error: "El usuario no posee una wallet",
      });
    }

    const balances = await prisma.balance.findMany({
      where: { userId: user.id },
      select: { asset: true, available: true, locked: true },
    });

    return reply.send({
      success: true,
      wallet,
      balances,
    });
  } catch (error) {
    console.error("Error al obtener la wallet:", error);
    return reply.code(500).send({ error: "Error interno al obtener la wallet" });
  }
}

export async function updateBalance(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { asset, amount } = request.body as { asset: Asset; amount: number };
    const user = (request as any).user;

    const validAssets: Asset[] = [Asset.SMTX, Asset.USDT, Asset.USDC];
    if (!validAssets.includes(asset)) {
      return reply.code(400).send({ error: "Token no soportado" });
    }

    const updated = await prisma.balance.updateMany({
      where: { userId: user.id, asset },
      data: { available: new Prisma.Decimal(amount) },
    });

    return reply.send({
      success: true,
      message: "Balance actualizado correctamente",
      updated,
    });
  } catch (error) {
    console.error("Error al actualizar balance:", error);
    return reply.code(500).send({ error: "Error interno al actualizar balance" });
  }
}
