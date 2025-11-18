import { FastifyInstance } from "fastify";
import { assignRole, getRoles, listPermissions } from "../controllers/roleController.js";
import { authorize } from "../middleware/authorize.js";

export async function roleRoutes(app: FastifyInstance) {
  app.get("/roles", { preHandler: [app.authenticate] }, getRoles);
  app.get("/permissions", { preHandler: [app.authenticate, authorize(["ADMIN", "SUPERADMIN"])], handler: listPermissions });
  app.post("/assign-role", { preHandler: [app.authenticate, authorize(["ADMIN", "SUPERADMIN"])], handler: assignRole });
}
