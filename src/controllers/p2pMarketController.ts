// src/controllers/p2pMarketController.ts
import { prisma } from "../lib/prisma.js";
import { FastifyRequest, FastifyReply } from "fastify";
import { Decimal } from "@prisma/client/runtime/library";

/**
 * Crear una orden de compra o venta
 */
export async function createP2POrder(request: FastifyRequest, reply: FastifyReply) {
  try {
    const user = (request as any).user;
    const { type, asset, amount, price } = request.body as any;

    const validAssets = ["USDT", "USDC", "SMTX"];
    if (!["BUY", "SELL"].includes(type) || !validAssets.includes(asset)) {
      return reply.code(400).send({ error: "Tipo o token inválido" });
    }

    const amountDec = new Decimal(amount);
    const priceDec = new Decimal(price);

    // Verificar fondos si es venta
    if (type === "SELL") {
      const balance = await prisma.balance.findFirst({
        where: { userId: user.id, asset },
      });
      if (!balance || balance.available.lessThan(amountDec)) {
        return reply.code(400).send({ error: "Saldo insuficiente" });
      }
      // Bloquear fondos
      await prisma.balance.updateMany({
        where: { userId: user.id, asset },
        data: {
          available: balance.available.minus(amountDec),
          locked: balance.locked.plus(amountDec),
        },
      });
    }

    const order = await prisma.order.create({
      data: {
        userId: user.id,
        type,
        asset,
        amount: amountDec,
        price: priceDec,
        status: "OPEN",
      },
    });

    reply.send({ success: true, order });
  } catch (error) {
    console.error("Error creando orden:", error);
    reply.code(500).send({ error: "Error interno" });
  }
}

/**
 * Listar todas las órdenes abiertas
 */
export async function listP2POrders(_req: FastifyRequest, reply: FastifyReply) {
  const orders = await prisma.order.findMany({
    where: { status: "OPEN" },
    include: { user: { select: { nickname: true, userId: true } } },
    orderBy: { createdAt: "desc" },
  });
  reply.send({ success: true, orders });
}

/**
 * Aceptar una orden
 */
export async function acceptP2POrder(request: FastifyRequest, reply: FastifyReply) {
  try {
    const user = (request as any).user;
    const id = Number((request.params as any).id);

    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) return reply.code(404).send({ error: "Orden no encontrada" });
    if (order.userId === user.id)
      return reply.code(400).send({ error: "No puedes aceptar tu propia orden" });
    if (order.status !== "OPEN")
      return reply.code(400).send({ error: "Orden no disponible" });

    await prisma.order.update({
      where: { id },
      data: { status: "TAKEN", takerId: user.id },
    });

    reply.send({ success: true, message: "Orden aceptada correctamente" });
  } catch (error) {
    console.error("Error al aceptar orden:", error);
    reply.code(500).send({ error: "Error interno" });
  }
}

/**
 * Liberar una orden completada (vendedor libera fondos)
 */
export async function releaseP2POrder(request: FastifyRequest, reply: FastifyReply) {
  try {
    const user = (request as any).user;
    const id = Number((request.params as any).id);

    const order = await prisma.order.findUnique({ where: { id } });
    if (!order || order.status !== "TAKEN")
      return reply.code(400).send({ error: "Orden no válida o no tomada" });

    // Solo el creador de la orden tipo SELL puede liberar
    if (order.userId !== user.id || order.type !== "SELL")
      return reply.code(403).send({ error: "No autorizado para liberar fondos" });

    const amountDec = new Decimal(order.amount);

    // Liberar fondos al comprador
    await prisma.$transaction(async (tx) => {
      await tx.balance.updateMany({
        where: { userId: user.id, asset: order.asset },
        data: { locked: { decrement: amountDec } },
      });

      const buyerBalance = await tx.balance.findFirst({
        where: { userId: order.takerId!, asset: order.asset },
      });

      if (buyerBalance) {
        await tx.balance.updateMany({
          where: { userId: order.takerId!, asset: order.asset },
          data: { available: { increment: amountDec } },
        });
      } else {
        await tx.balance.create({
          data: {
            userId: order.takerId!,
            asset: order.asset,
            available: amountDec,
            locked: 0,
          },
        });
      }

      await tx.transaction.createMany({
        data: [
          {
            userId: user.id,
            type: "P2P_RELEASE",
            asset: order.asset,
            amount: amountDec,
            description: `Liberación de orden #${order.id}`,
          },
          {
            userId: order.takerId!,
            type: "P2P_RECEIVE",
            asset: order.asset,
            amount: amountDec,
            description: `Recibido por orden #${order.id}`,
          },
        ],
      });

      await tx.order.update({
        where: { id },
        data: { status: "COMPLETED" },
      });
    });

    reply.send({ success: true, message: "Fondos liberados exitosamente" });
  } catch (error) {
    console.error("Error liberando orden:", error);
    reply.code(500).send({ error: "Error interno" });
  }
}

/**
 * Historial de órdenes del usuario autenticado
 */
export async function myP2POrders(request: FastifyRequest, reply: FastifyReply) {
  const user = (request as any).user;
  const orders = await prisma.order.findMany({
    where: { OR: [{ userId: user.id }, { takerId: user.id }] },
    orderBy: { createdAt: "desc" },
  });
  reply.send({ success: true, orders });
}
