import { prisma } from "../lib/prisma.js";
import { FastifyRequest, FastifyReply } from "fastify";
import { createAuditLog } from "./auditController.js";

export async function assignRole(request: FastifyRequest, reply: FastifyReply) {
  try {
    const admin = (request as any).user;
    const { userId, role } = request.body as { userId: number; role: string };

    if (!["SUPPORT", "ADMIN", "SUPERADMIN"].includes(admin.role)) {
      return reply.code(403).send({ error: "No autorizado" });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { role },
    });

    await createAuditLog(admin.id, "ASSIGN_ROLE", `Usuario ${userId} ahora es ${role}`);
    reply.send({ success: true, message: "Rol asignado correctamente" });
  } catch (err) {
    console.error("Error asignando rol:", err);
    reply.code(500).send({ error: "Error interno" });
  }
}

export async function getRoles(_req: FastifyRequest, reply: FastifyReply) {
  const roles = ["USER", "MERCHANT", "SUPPORT", "ADMIN", "SUPERADMIN"];
  reply.send({ success: true, roles });
}

export async function listPermissions(_req: FastifyRequest, reply: FastifyReply) {
  const permissions = await prisma.permission.findMany();
  reply.send({ success: true, permissions });
}
