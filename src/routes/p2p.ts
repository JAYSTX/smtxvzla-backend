// src/routes/p2p.ts
import { FastifyInstance } from "fastify";
import { createOrder, listOrders, acceptOrder, releaseOrder } from "../controllers/p2pController.js";

export async function p2pRoutes(app: FastifyInstance) {
  // Crear orden de compra/venta
  app.post("/p2p/order", { preHandler: [app.authenticate] }, createOrder);

  // Listar todas las órdenes abiertas
  app.get("/p2p/orders", listOrders);

  // Aceptar una orden
  app.post("/p2p/order/:id/accept", { preHandler: [app.authenticate] }, acceptOrder);

  // Liberar una orden completada
  app.post("/p2p/order/:id/release", { preHandler: [app.authenticate] }, releaseOrder);
}
