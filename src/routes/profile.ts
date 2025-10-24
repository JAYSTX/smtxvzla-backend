import { FastifyInstance } from "fastify";
import {
  getProfile,
  updateProfile,
  uploadKyc,
  getKycStatus,
  reviewKyc,
} from "../controllers/profileController.js";

export async function profileRoutes(app: FastifyInstance) {
  app.get("/profile", { preHandler: [app.authenticate] }, getProfile);
  app.put("/profile/update", { preHandler: [app.authenticate] }, updateProfile);
  app.post("/kyc/upload", { preHandler: [app.authenticate] }, uploadKyc);
  app.get("/kyc/status", { preHandler: [app.authenticate] }, getKycStatus);
  app.post("/kyc/review", { preHandler: [app.authenticate] }, reviewKyc);
}
