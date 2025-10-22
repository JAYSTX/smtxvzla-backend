// src/routes/p2p.ts
import { FastifyInstance } from "fastify";
import { createOrder, listOrders, acceptOrder, releaseOrder } from "../controllers/p2pController.js";

export async function p2pRoutes(app: FastifyInstance) {
  // ✅ Todas las rutas P2P quedan bajo /api/p2p/ gracias al prefix del server.ts

  // Crear orden de compra o venta
  app.post("/order", { preHandler: [app.authenticate] }, async (request, reply) => {
    try {
      await createOrder(request, reply);
    } catch (error) {
      app.log.error(error);
      reply.code(500).send({ error: "Error al crear la orden" });
    }
  });

  // Listar todas las órdenes abiertas
  app.get("/orders", async (_request, reply) => {
    try {
      await listOrders(_request, reply);
    } catch (error) {
      app.log.error(error);
      reply.code(500).send({ error: "Error al obtener las órdenes" });
    }
  });

  // Aceptar una orden existente
  app.post("/order/:id/accept", { preHandler: [app.authenticate] }, async (request, reply) => {
    try {
      await acceptOrder(request, reply);
    } catch (error) {
      app.log.error(error);
      reply.code(500).send({ error: "Error al aceptar la orden" });
    }
  });

  // Liberar una orden completada
  app.post("/order/:id/release", { preHandler: [app.authenticate] }, async (request, reply) => {
    try {
      await releaseOrder(request, reply);
    } catch (error) {
      app.log.error(error);
      reply.code(500).send({ error: "Error al liberar la orden" });
    }
  });
}
