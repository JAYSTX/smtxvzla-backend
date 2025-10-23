// src/controllers/authController.ts
import { prisma } from "../lib/prisma.js";
import { Prisma } from "@prisma/client";
import { FastifyRequest, FastifyReply } from "fastify";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { ethers } from "ethers";

export async function register(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { nickname, email, phone, password } = request.body as any;

    if (!nickname || !email || !phone || !password) {
      return reply.code(400).send({ error: "Todos los campos son obligatorios" });
    }

    if (!nickname.startsWith("$")) {
      return reply.code(400).send({ error: "El nickname debe comenzar con $" });
    }

    const exists = await prisma.user.findFirst({
      where: { OR: [{ email }, { nickname }] },
    });
    if (exists) {
      return reply.code(400).send({ error: "El usuario ya está registrado" });
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        nickname,
        email,
        phone,
        passwordHash: hashed,
        userId: generateUserId(),
      },
    });

    // Crear wallet automática (solo dirección pública)
    const wallet = ethers.Wallet.createRandom();
    await prisma.userWallet.create({
      data: {
        userId: user.id,
        chain: "BSC",
        address: wallet.address,
      },
    });

    // Crear balances iniciales
    const assets = ["SMTX", "USDT", "USDC"] as const;
    for (const asset of assets) {
      await prisma.balance.create({
        data: {
          userId: user.id,
          asset: asset as any,
          available: new Prisma.Decimal(0),
          locked: new Prisma.Decimal(0),
        },
      });
    }

    const token = jwt.sign(
      { id: user.id, nickname: user.nickname },
      process.env.JWT_SECRET as string,
      { expiresIn: "7d" }
    );

    reply.send({
      success: true,
      message: "Usuario registrado correctamente",
      user: {
        id: user.id,
        nickname: user.nickname,
        email: user.email,
        phone: user.phone,
      },
      token,
    });
  } catch (error) {
    console.error("Error al registrar usuario:", error);
    reply.code(500).send({ error: "Error interno al registrar usuario" });
  }
}

export async function login(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { email, password } = request.body as any;
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) return reply.code(404).send({ error: "Usuario no encontrado" });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return reply.code(401).send({ error: "Credenciales inválidas" });

    const token = jwt.sign(
      { id: user.id, nickname: user.nickname },
      process.env.JWT_SECRET as string,
      { expiresIn: "7d" }
    );

    reply.send({
      success: true,
      message: "Inicio de sesión exitoso",
      token,
      user: {
        id: user.id,
        nickname: user.nickname,
        email: user.email,
        phone: user.phone,
      },
    });
  } catch (error) {
    console.error("Error en login:", error);
    reply.code(500).send({ error: "Error interno al iniciar sesión" });
  }
}

function generateUserId() {
  const random = Math.floor(100000 + Math.random() * 900000);
  return `STX${random}`;
}
