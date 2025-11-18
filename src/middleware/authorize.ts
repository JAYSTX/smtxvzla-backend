import { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../lib/prisma.js";

/**
 * Middleware para verificar permisos
 * @param roles Lista de roles permitidos
 */
export function authorize(roles: string[] = []) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    if (!user) return reply.code(401).send({ error: "No autenticado" });

    if (roles.length > 0 && !roles.includes(user.role)) {
      return reply.code(403).send({ error: "No autorizado" });
    }
  };
}

/**
 * Verifica si un usuario tiene un permiso específico
 */
export async function hasPermission(userId: number, permissionName: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      rolePermissions: {
        include: { permission: true },
      },
    },
  });

  if (!user) return false;
  return user.rolePermissions.some((rp) => rp.permission.name === permissionName);
}
