// src/controllers/p2pController.ts
import { prisma } from "../lib/prisma.js";
import { FastifyRequest, FastifyReply } from "fastify";

/**
 * Crear una nueva orden P2P (compra o venta)
 */
export async function createOrder(request: FastifyRequest, reply: FastifyReply) {
  try {
    const user = (request as any).user;
    const { type, amount, price } = request.body as any;

    if (!["BUY", "SELL"].includes(type)) {
      return reply.code(400).send({ error: "Tipo de orden inválido (BUY o SELL)" });
    }

    const order = await prisma.order.create({
      data: {
        userId: user.id,
        type,
        amount: parseFloat(amount),
        price: parseFloat(price),
        status: "OPEN",
      },
    });

    reply.send({ success: true, order });
  } catch (error) {
    console.error("Error al crear orden:", error);
    reply.code(500).send({ error: "Error interno al crear la orden" });
  }
}

/**
 * Listar todas las órdenes abiertas
 */
export async function listOrders(_req: FastifyRequest, reply: FastifyReply) {
  try {
    const orders = await prisma.order.findMany({
      where: { status: "OPEN" },
      include: {
        user: {
          select: {
            nickname: true,
            type: true,
            kycStatus: true,
          },
        },
      },
    });

    reply.send(orders);
  } catch (error) {
    console.error("Error al listar órdenes:", error);
    reply.code(500).send({ error: "Error interno al listar las órdenes" });
  }
}

/**
 * Aceptar una orden existente
 */
export async function acceptOrder(request: FastifyRequest, reply: FastifyReply) {
  try {
    const user = (request as any).user;
    const id = Number((request.params as any).id);

    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) return reply.code(404).send({ error: "Orden no encontrada" });
    if (order.status !== "OPEN") return reply.code(400).send({ error: "Orden no disponible" });

    const updated = await prisma.order.update({
      where: { id },
      data: { status: "TAKEN", takerId: user.id },
    });

    reply.send({ success: true, order: updated });
  } catch (error) {
    console.error("Error al aceptar orden:", error);
    reply.code(500).send({ error: "Error interno al aceptar la orden" });
  }
}

/**
 * Liberar una orden completada
 */
export async function releaseOrder(request: FastifyRequest, reply: FastifyReply) {
  try {
    const id = Number((request.params as any).id);

    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) return reply.code(404).send({ error: "Orden no encontrada" });

    const updated = await prisma.order.update({
      where: { id },
      data: { status: "COMPLETED" },
    });

    reply.send({ success: true, message: "Orden completada y fondos liberados", order: updated });
  } catch (error) {
    console.error("Error al liberar orden:", error);
    reply.code(500).send({ error: "Error interno al liberar la orden" });
  }
}
