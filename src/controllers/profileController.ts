import { prisma } from "../lib/prisma.js";
import { FastifyRequest, FastifyReply } from "fastify";
import { KycStatus, UserType } from "@prisma/client";

/**
 * Obtener perfil del usuario autenticado
 */
export async function getProfile(request: FastifyRequest, reply: FastifyReply) {
  try {
    const user = (request as any).user;

    const profile = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        userId: true,
        nickname: true,
        email: true,
        phone: true,
        type: true,
        kycStatus: true,
        status: true,
        createdAt: true,
      },
    });

    reply.send({ success: true, profile });
  } catch (err) {
    console.error("❌ Error al obtener perfil:", err);
    reply.code(500).send({ error: "Error interno al obtener perfil" });
  }
}

/**
 * Actualizar información básica del usuario
 */
export async function updateProfile(request: FastifyRequest, reply: FastifyReply) {
  try {
    const user = (request as any).user;
    const { nickname, phone } = request.body as any;

    if (!nickname && !phone)
      return reply.code(400).send({ error: "No hay datos para actualizar" });

    if (nickname && !nickname.startsWith("$"))
      return reply.code(400).send({ error: "El nickname debe comenzar con $" });

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { nickname, phone },
    });

    reply.send({ success: true, user: updated });
  } catch (err) {
    console.error("❌ Error al actualizar perfil:", err);
    reply.code(500).send({ error: "Error interno al actualizar perfil" });
  }
}

/**
 * Enviar solicitud KYC
 */
export async function uploadKyc(request: FastifyRequest, reply: FastifyReply) {
  try {
    const user = (request as any).user;
    const { documentType, documentNumber, country, photoUrl } = request.body as any;

    if (!documentType || !documentNumber || !country)
      return reply.code(400).send({ error: "Datos incompletos para KYC" });

    await prisma.user.update({
      where: { id: user.id },
      data: {
        kycStatus: KycStatus.PENDING,
      },
    });

    // Guarda registro del intento de verificación (auditoría)
    await prisma.transaction.create({
      data: {
        userId: user.id,
        type: "KYC_SUBMIT",
        asset: "USDT",
        amount: 0,
        description: `Solicitud KYC enviada (${documentType} ${documentNumber})`,
      },
    });

    reply.send({
      success: true,
      message: "Solicitud KYC enviada con éxito. Pendiente de revisión.",
    });
  } catch (err) {
    console.error("❌ Error al subir KYC:", err);
    reply.code(500).send({ error: "Error interno al procesar KYC" });
  }
}

/**
 * Consultar estado KYC
 */
export async function getKycStatus(request: FastifyRequest, reply: FastifyReply) {
  try {
    const user = (request as any).user;
    const record = await prisma.user.findUnique({
      where: { id: user.id },
      select: { kycStatus: true },
    });
    reply.send({ success: true, kycStatus: record?.kycStatus });
  } catch (err) {
    reply.code(500).send({ error: "Error al consultar estado KYC" });
  }
}

/**
 * Revisar KYC (solo TEAM)
 */
export async function reviewKyc(request: FastifyRequest, reply: FastifyReply) {
  try {
    const admin = (request as any).user;
    const { userId, action } = request.body as any;

    if (admin.type !== UserType.TEAM)
      return reply.code(403).send({ error: "No autorizado" });

    if (!["APPROVED", "REJECTED"].includes(action))
      return reply.code(400).send({ error: "Acción inválida" });

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { kycStatus: action },
    });

    await prisma.transaction.create({
      data: {
        userId,
        type: `KYC_${action}`,
        asset: "USDT",
        amount: 0,
        description: `KYC ${action.toLowerCase()} por admin ${admin.nickname}`,
      },
    });

    reply.send({
      success: true,
      message: `KYC del usuario ${updated.userId} ${action.toLowerCase()}`,
    });
  } catch (err) {
    reply.code(500).send({ error: "Error interno al revisar KYC" });
  }
}
