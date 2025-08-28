import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

// Assign userId (STX######) depending on email domain
export async function assignUserId(email: string): Promise<string> {
  const isTeam = email.toLowerCase().endsWith('@smartxp2p.io')
  if (isTeam) {
    // Reserved STX000001..STX000200
    for (let i = 1; i <= 200; i++) {
      const uid = formatUserId(i)
      const exists = await prisma.user.findUnique({ where: { userId: uid } })
      if (!exists) return uid
    }
    // Fallback to general pool if exhausted
  }
  // General pool starts at 201
  let i = 201
  while (true) {
    const uid = formatUserId(i)
    const exists = await prisma.user.findUnique({ where: { userId: uid } })
    if (!exists) return uid
    i++
  }
}

export function formatUserId(n: number) {
  return `STX${n.toString().padStart(6, '0')}`
}

export function isValidNickname(nickname: string) {
  // Must start with $, then 2-19 of [a-zA-Z0-9_]
  return /^\$[A-Za-z0-9_]{2,19}$/.test(nickname)
}
