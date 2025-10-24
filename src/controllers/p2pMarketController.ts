import { prisma } from "../lib/prisma.js";
import { FastifyRequest, FastifyReply } from "fastify";
import { Decimal } from "@prisma/client/runtime/library";

/**
 * Crear orden P2P (compra o venta)
 */
export async function createOrder(request: FastifyRequest, reply: FastifyReply) {
  try {
    const user = (request as any).user;
    const { type, asset, amount, price } = request.body as any;

    if (!["BUY", "SELL"].includes(type)) {
      return reply.code(400).send({ error: "Tipo inválido" });
    }
    if (!["USDT", "USDC", "SMTX"].includes(asset)) {
      return reply.code(400).send({ error: "Asset inválido" });
    }

    // Verificar balance si es venta
    if (type === "SELL") {
      const balance = await prisma.balance.findFirst({
        where: { userId: user.id, asset },
      });
      if (!balance || balance.available.lt(amount)) {
        return reply.code(400).send({ error: "Fondos insuficientes" });
      }

      // Bloquear fondos
      await prisma.balance.update({
        where: { id: balance.id },
        data: {
          available: balance.available.minus(amount),
          locked: balance.locked.plus(amount),
        },
      });
    }

    const order = await prisma.order.create({
      data: {
        userId: user.id,
        type,
        asset,
        amount: new Decimal(amount),
        price: new Decimal(price),
      },
    });

    // Registrar transacción
    await prisma.transaction.create({
      data: {
        userId: user.id,
        type: "P2P_CREATE",
        asset,
        amount: new Decimal(amount),
        description: `Creación de orden ${type} ${asset}`,
      },
    });

    reply.send({ success: true, order });
  } catch (error) {
    console.error("❌ Error en createOrder:", error);
    reply.code(500).send({ error: "Error interno al crear orden" });
  }
}

/**
 * Listar todas las órdenes abiertas
 */
export async function listOrders(_req: FastifyRequest, reply: FastifyReply) {
  try {
    const orders = await prisma.order.findMany({
      where: { status: "OPEN" },
      include: { user: { select: { nickname: true } } },
    });
    reply.send(orders);
  } catch (error) {
    console.error("❌ Error en listOrders:", error);
    reply.code(500).send({ error: "Error al listar órdenes" });
  }
}

/**
 * Aceptar una orden (bloquea fondos del comprador)
 */
export async function acceptOrder(request: FastifyRequest, reply: FastifyReply) {
  try {
    const user = (request as any).user;
    const id = Number((request.params as any).id);

    const order = await prisma.order.findUnique({ where: { id } });
    if (!order || order.status !== "OPEN") {
      return reply.code(400).send({ error: "Orden no disponible" });
    }

    // Si el usuario acepta una orden de tipo BUY, él vende
    if (order.type === "BUY") {
      const balance = await prisma.balance.findFirst({
        where: { userId: user.id, asset: order.asset },
      });
      if (!balance || balance.available.lt(order.amount)) {
        return reply.code(400).send({ error: "Fondos insuficientes" });
      }

      await prisma.balance.update({
        where: { id: balance.id },
        data: {
          available: balance.available.minus(order.amount),
          locked: balance.locked.plus(order.amount),
        },
      });
    }

    const updated = await prisma.order.update({
      where: { id },
      data: { takerId: user.id, status: "TAKEN" },
    });

    await prisma.transaction.create({
      data: {
        userId: user.id,
        type: "P2P_TAKE",
        asset: order.asset,
        amount: order.amount,
        description: `Orden ${id} tomada`,
      },
    });

    reply.send({ success: true, order: updated });
  } catch (error) {
    console.error("❌ Error en acceptOrder:", error);
    reply.code(500).send({ error: "Error interno al aceptar orden" });
  }
}

/**
 * Liberar orden (completar operación y transferir fondos)
 */
export async function releaseOrder(request: FastifyRequest, reply: FastifyReply) {
  try {
    const user = (request as any).user;
    const id = Number((request.params as any).id);

    const order = await prisma.order.findUnique({ where: { id } });
    if (!order || order.status !== "TAKEN") {
      return reply.code(400).send({ error: "Orden no disponible" });
    }

    // Transferencia de fondos bloqueados → comprador
    const sellerBalance = await prisma.balance.findFirst({
      where: { userId: order.userId, asset: order.asset },
    });
    const buyerBalance = await prisma.balance.findFirst({
      where: { userId: order.takerId!, asset: order.asset },
    });

    if (!sellerBalance || !buyerBalance) {
      return reply.code(400).send({ error: "Balances no encontrados" });
    }

    await prisma.$transaction([
      prisma.balance.update({
        where: { id: sellerBalance.id },
        data: {
          locked: sellerBalance.locked.minus(order.amount),
        },
      }),
      prisma.balance.update({
        where: { id: buyerBalance.id },
        data: {
          available: buyerBalance.available.plus(order.amount),
        },
      }),
      prisma.order.update({
        where: { id },
        data: { status: "COMPLETED" },
      }),
      prisma.transaction.createMany({
        data: [
          {
            userId: order.userId,
            type: "P2P_RELEASE_SELLER",
            asset: order.asset,
            amount: order.amount,
            description: `Venta completada - orden ${id}`,
          },
          {
            userId: order.takerId!,
            type: "P2P_RELEASE_BUYER",
            asset: order.asset,
            amount: order.amount,
            description: `Compra completada - orden ${id}`,
          },
        ],
      }),
    ]);

    reply.send({ success: true, message: "Orden completada y fondos liberados." });
  } catch (error) {
    console.error("❌ Error en releaseOrder:", error);
    reply.code(500).send({ error: "Error interno al liberar orden" });
  }
}

/**
 * Ver historial de órdenes del usuario
 */
export async function myOrders(request: FastifyRequest, reply: FastifyReply) {
  try {
    const user = (request as any).user;

    const orders = await prisma.order.findMany({
      where: { OR: [{ userId: user.id }, { takerId: user.id }] },
      orderBy: { createdAt: "desc" },
    });

    reply.send(orders);
  } catch (error) {
    console.error("❌ Error en myOrders:", error);
    reply.code(500).send({ error: "Error al obtener historial de órdenes" });
  }
}
