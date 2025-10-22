// src/routes/p2p.ts
import { FastifyInstance } from "fastify";
import { createOrder, listOrders, acceptOrder, releaseOrder } from "../controllers/p2pController.js";

export async function p2pRoutes(app: FastifyInstance) {
  app.post("/create", { onRequest: [app.authenticate] }, createOrder);
  app.get("/orders", listOrders);
  app.post("/accept/:id", { onRequest: [app.authenticate] }, acceptOrder);
  app.post("/release/:id", { onRequest: [app.authenticate] }, releaseOrder);
}
