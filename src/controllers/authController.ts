// src/controllers/authController.ts
import { prisma } from "../lib/prisma.js";
import { FastifyRequest, FastifyReply } from "fastify";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { ethers } from "ethers";
import { Asset } from "@prisma/client";

/**
 * Registrar un nuevo usuario con wallet y balances automáticos
 */
export async function register(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { nickname, email, phone, password } = request.body as {
      nickname: string;
      email: string;
      phone: string;
      password: string;
    };

    if (!nickname || !email || !phone || !password) {
      return reply.code(400).send({ error: "Todos los campos son obligatorios" });
    }

    // Validar nickname
    if (!nickname.startsWith("$")) {
      return reply.code(400).send({ error: "El nickname debe comenzar con $" });
    }

    // Verificar si ya existe el usuario
    const exists = await prisma.user.findFirst({
      where: { OR: [{ email }, { nickname }] },
    });
    if (exists) {
      return reply.code(400).send({ error: "El usuario ya está registrado" });
    }

    // Crear usuario base
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

    // Crear wallet derivada en BSC
    const wallet = ethers.Wallet.createRandom();
    const newWallet = await prisma.userWallet.create({
      data: {
        userId: user.id,
        chain: "BSC",
        address: wallet.address,
      },
    });

    // Crear balances iniciales usando enum Asset
    const assets: Asset[] = [Asset.SMTX, Asset.USDT, Asset.USDC];
    for (const asset of assets) {
      await prisma.balance.create({
        data: {
          userId: user.id,
          asset,
          available: new prisma.Prisma.Decimal(0),
          locked: new prisma.Prisma.Decimal(0),
        },
      });
    }

    // Crear token JWT
    const token = jwt.sign(
      { id: user.id, nickname: user.nickname },
      process.env.JWT_SECRET ?? "devsecret",
      { expiresIn: "7d" }
    );

    return reply.send({
      success: true,
      message: "Usuario registrado correctamente",
      user: {
        id: user.id,
        userId: user.userId,
        nickname: user.nickname,
        email: user.email,
        phone: user.phone,
        wallet: newWallet.address,
      },
      balances: assets.map((a) => ({ asset: a, available: 0 })),
      token,
    });
  } catch (error) {
    console.error("Error al registrar usuario:", error);
    return reply.code(500).send({ error: "Error interno al registrar usuario" });
  }
}

/**
 * Iniciar sesión
 */
export async function login(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { email, password } = request.body as {
      email: string;
      password: string;
    };

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return reply.code(404).send({ error: "Usuario no encontrado" });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return reply.code(401).send({ error: "Credenciales inválidas" });
    }

    const token = jwt.sign(
      { id: user.id, nickname: user.nickname },
      process.env.JWT_SECRET ?? "devsecret",
      { expiresIn: "7d" }
    );

    return reply.send({
      success: true,
      message: "Inicio de sesión exitoso",
      token,
      user: {
        id: user.id,
        userId: user.userId,
        nickname: user.nickname,
        email: user.email,
        phone: user.phone,
      },
    });
  } catch (error) {
    console.error("Error en login:", error);
    return reply.code(500).send({ error: "Error interno al iniciar sesión" });
  }
}

/**
 * Generar ID tipo STX000001
 */
function generateUserId(): string {
  const random = Math.floor(100000 + Math.random() * 900000);
  return `STX${random}`;
}
