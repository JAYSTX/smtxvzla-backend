// src/routes/p2pMarket.ts
import { FastifyInstance } from "fastify";
import {
  createP2POrder,
  listP2POrders,
  acceptP2POrder,
  releaseP2POrder,
  myP2POrders,
} from "../controllers/p2pMarketController.js";

export async function p2pMarketRoutes(app: FastifyInstance) {
  app.post("/p2p/create", { preHandler: [app.authenticate] }, createP2POrder);
  app.get("/p2p/orders", listP2POrders);
  app.post("/p2p/accept/:id", { preHandler: [app.authenticate] }, acceptP2POrder);
  app.post("/p2p/release/:id", { preHandler: [app.authenticate] }, releaseP2POrder);
  app.get("/p2p/my-orders", { preHandler: [app.authenticate] }, myP2POrders);
}
