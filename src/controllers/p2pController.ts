// src/controllers/p2pController.ts
import { prisma } from "../lib/prisma.js";
import { FastifyRequest, FastifyReply } from "fastify";
import { ethers } from "ethers";

export async function createOrder(request: FastifyRequest, reply: FastifyReply) {
  const user = (request as any).user;
  const { type, amount, price } = request.body as any;

  if (!["BUY", "SELL"].includes(type)) return reply.code(400).send({ error: "invalid type" });

  const order = await prisma.order.create({
    data: { userId: user.id, type, amount: parseFloat(amount), price: parseFloat(price) },
  });

  reply.send({ success: true, order });
}

export async function listOrders(_req: FastifyRequest, reply: FastifyReply) {
  const orders = await prisma.order.findMany({ where: { status: "OPEN" }, include: { user: true } });
  reply.send(orders);
}

export async function acceptOrder(request: FastifyRequest, reply: FastifyReply) {
  const user = (request as any).user;
  const id = Number((request.params as any).id);

  const order = await prisma.order.update({
    where: { id },
    data: { status: "TAKEN", takerId: user.id },
  });

  reply.send({ success: true, order });
}

export async function releaseOrder(request: FastifyRequest, reply: FastifyReply) {
  const id = Number((request.params as any).id);

  const order = await prisma.order.update({
    where: { id },
    data: { status: "COMPLETED" },
  });

  reply.send({ success: true, message: "Order completed and funds released.", order });
}
