// src/controllers/walletController.ts
import { prisma } from "../lib/prisma.js";
import { FastifyRequest, FastifyReply } from "fastify";
import { ethers } from "ethers";

/**
 * Crear una wallet automáticamente para el usuario
 * (se ejecuta después del registro o manualmente vía endpoint)
 */
export async function createWallet(request: FastifyRequest, reply: FastifyReply) {
  try {
    const user = (request as any).user;

    // Verificar si ya tiene wallet
    const existing = await prisma.userWallet.findFirst({
      where: { userId: user.id },
    });

    if (existing) {
      return reply.code(400).send({ error: "El usuario ya posee una wallet asociada" });
    }

    // Generar nueva dirección en BSC (sin exponer clave privada)
    const wallet = ethers.Wallet.createRandom();
    const newWallet = await prisma.userWallet.create({
      data: {
        userId: user.id,
        chain: "BSC",
        address: wallet.address,
      },
    });

    // Crear balances iniciales (SMTX, USDT, USDC)
    const tokens = ["SMTX", "USDT", "USDC"];
    for (const asset of tokens) {
      await prisma.balance.create({
        data: {
          userId: user.id,
          asset,
          available: 0,
          locked: 0,
        },
      });
    }

    reply.send({
      success: true,
      message: "Wallet generada correctamente",
      wallet: newWallet,
      balances: tokens.map((t) => ({ asset: t, available: 0 })),
    });
  } catch (error) {
    console.error("Error al crear la wallet:", error);
    reply.code(500).send({ error: "Error interno al crear la wallet" });
  }
}

/**
 * Obtener información de la wallet y balances del usuario
 */
export async function getWalletInfo(request: FastifyRequest, reply: FastifyReply) {
  try {
    const user = (request as any).user;

    const wallet = await prisma.userWallet.findFirst({
      where: { userId: user.id },
    });

    if (!wallet) {
      return reply.code(404).send({ error: "El usuario no posee una wallet" });
    }

    const balances = await prisma.balance.findMany({
      where: { userId: user.id },
      select: { asset: true, available: true, locked: true },
    });

    reply.send({ wallet, balances });
  } catch (error) {
    console.error("Error al obtener la wallet:", error);
    reply.code(500).send({ error: "Error interno al obtener la wallet" });
  }
}

/**
 * Actualizar balance manualmente (solo para pruebas o administración)
 */
export async function updateBalance(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { asset, amount } = request.body as any;
    const user = (request as any).user;

    const validAssets = ["SMTX", "USDT", "USDC"];
    if (!validAssets.includes(asset)) {
      return reply.code(400).send({ error: "Token no soportado" });
    }

    const updated = await prisma.balance.updateMany({
      where: { userId: user.id, asset },
      data: { available: parseFloat(amount) },
    });

    reply.send({ success: true, updated });
  } catch (error) {
    console.error("Error al actualizar balance:", error);
    reply.code(500).send({ error: "Error interno al actualizar balance" });
  }
}
