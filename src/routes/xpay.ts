// src/routes/xpay.ts
import { FastifyInstance } from "fastify";
import { xpayTransfer, xpayHistory } from "../controllers/xpayController.js";

export async function xpayRoutes(app: FastifyInstance) {
  // Transferir saldo entre usuarios
  app.post("/xpay/transfer", { preHandler: [app.authenticate] }, xpayTransfer);

  // Consultar historial de transacciones
  app.get("/xpay/history", { preHandler: [app.authenticate] }, xpayHistory);
}
