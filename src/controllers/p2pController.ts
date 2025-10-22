import { prisma } from "../lib/prisma.js";
import { FastifyRequest, FastifyReply } from "fastify";

export async function createOrder(request: FastifyRequest, reply: FastifyReply) {
  const user = (request as any).user;
  const { type, amount, price } = request.body as any;
  const order = await prisma.order.create({
    data: { userId: user.id, type, amount, price },
  });
  reply.send({ success: true, order });
}

export async function listOrders(_req: FastifyRequest, reply: FastifyReply) {
  const orders = await prisma.order.findMany({ where: { status: "OPEN" } });
  reply.send(orders);
}

export async function acceptOrder(request: FastifyRequest, reply: FastifyReply) {
  const user = (request as any).user;
  const id = Number(request.params.id);
  const order = await prisma.order.update({
    where: { id },
    data: { status: "TAKEN" },
  });
  reply.send({ success: true, order, taker: user.id });
}
