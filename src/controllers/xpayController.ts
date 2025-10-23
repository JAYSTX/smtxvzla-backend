// src/controllers/xpayController.ts
import { prisma } from "../lib/prisma.js";
import { FastifyRequest, FastifyReply } from "fastify";
import { Decimal } from "@prisma/client/runtime/library";

/**
 * 💸 Transferir saldo entre usuarios (USDT, USDC o SMTX)
 */
export async function xpayTransfer(request: FastifyRequest, reply: FastifyReply) {
  try {
    const user = (request as any).user;
    const { toNickname, asset, amount } = request.body as any;

    if (!toNickname || !asset || !amount) {
      return reply.code(400).send({ error: "Faltan datos requeridos" });
    }

    const validAssets = ["USDT", "USDC", "SMTX"];
    if (!validAssets.includes(asset)) {
      return reply.code(400).send({ error: "Token no soportado" });
    }

    // Buscar usuario receptor
    const receiver = await prisma.user.findUnique({ where: { nickname: toNickname } });
    if (!receiver) {
      return reply.code(404).send({ error: "Usuario destino no encontrado" });
    }

    if (receiver.id === user.id) {
      return reply.code(400).send({ error: "No puedes enviarte fondos a ti mismo" });
    }

    const amountDec = new Decimal(amount);

    // Verificar balance disponible
    const senderBalance = await prisma.balance.findFirst({
      where: { userId: user.id, asset },
    });

    if (!senderBalance || senderBalance.available.lessThan(amountDec)) {
      return reply.code(400).send({ error: "Saldo insuficiente" });
    }

    // Ejecutar transferencia dentro de una transacción segura
    await prisma.$transaction(async (tx) => {
      // Descontar al emisor
      await tx.balance.updateMany({
        where: { userId: user.id, asset },
        data: { available: senderBalance.available.minus(amountDec) },
      });

      // Aumentar al receptor
      const receiverBalance = await tx.balance.findFirst({
        where: { userId: receiver.id, asset },
      });

      if (receiverBalance) {
        await tx.balance.updateMany({
          where: { userId: receiver.id, asset },
          data: { available: receiverBalance.available.plus(amountDec) },
        });
      } else {
        // Si el receptor no tiene balance creado, se crea
        await tx.balance.create({
          data: { userId: receiver.id, asset, available: amountDec, locked: 0 },
        });
      }

      // Registrar ambas transacciones (emisor y receptor)
      await tx.transaction.createMany({
        data: [
          {
            userId: user.id,
            type: "XPAY_SEND",
            asset,
            amount: amountDec,
            description: `Enviado a ${toNickname}`,
          },
          {
            userId: receiver.id,
            type: "XPAY_RECEIVE",
            asset,
            amount: amountDec,
            description: `Recibido de ${(user as any).nickname}`,
          },
        ],
      });
    });

    reply.send({
      success: true,
      message: `Transferencia de ${amount} ${asset} enviada a ${toNickname}`,
    });
  } catch (error) {
    console.error("Error en xpayTransfer:", error);
    reply.code(500).send({ error: "Error interno al procesar transferencia" });
  }
}

/**
 * 📜 Consultar historial de transacciones del usuario autenticado
 */
export async function xpayHistory(request: FastifyRequest, reply: FastifyReply) {
  try {
    const user = (request as any).user;

    const transactions = await prisma.transaction.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });

    reply.send({ success: true, transactions });
  } catch (error) {
    console.error("Error al obtener historial:", error);
    reply.code(500).send({ error: "Error interno al obtener historial" });
  }
}
