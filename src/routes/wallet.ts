// src/routes/wallet.ts
import { FastifyInstance } from "fastify";
import { createWallet, getWalletInfo, updateBalance } from "../controllers/walletController.js";

export async function walletRoutes(app: FastifyInstance) {
  // Generar wallet automáticamente
  app.post("/wallet/create", { preHandler: [app.authenticate] }, createWallet);

  // Obtener wallet y balances
  app.get("/wallet/info", { preHandler: [app.authenticate] }, getWalletInfo);

  // Actualizar balance manual (testing/admin)
  app.post("/wallet/update", { preHandler: [app.authenticate] }, updateBalance);
}
