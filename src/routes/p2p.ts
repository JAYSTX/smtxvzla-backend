// src/routes/p2p.ts
import { FastifyInstance } from "fastify";
import { createOrder, listOrders, acceptOrder } from "../controllers/p2pController.js";

export async function p2pRoutes(app: FastifyInstance) {
  app.post("/p2p/create", { onRequest: [app.authenticate] }, createOrder);
  app.get("/p2p/orders", listOrders);
  app.post("/p2p/accept/:id", { onRequest: [app.authenticate] }, acceptOrder);
}
