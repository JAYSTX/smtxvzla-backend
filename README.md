# SmartX P2P Backend — Bloque 1 (Users + Wallet + Seed)

Este skeleton contiene:
- Prisma schema para **Users**, **Balances** y **UserWallets**.
- Script de seed para crear el **Founder**: `STX000001 $CriptoJay`, KYC aprobado y wallet BSC derivada de un **XPRV**.
- Sin endpoints todavía (enfoque en Bloque 1).

## Requisitos
- Node 18+
- PostgreSQL (Railway recomendado)

## Setup rápido

```bash
npm i
npm run prisma:generate
echo "# copia .env.example a .env y completa valores"
npm run db:push
FOUNDER_PASSWORD="tu_clave" WALLET_XPRV="tu_xprv" node --loader=tsx prisma/seed.ts
```

> **Nunca** subas tu contraseña real ni tu `WALLET_XPRV` al repo.
> Pásalos como variables de entorno en Railway.

## Archivos clave
- `prisma/schema.prisma` — modelos y enums
- `prisma/seed.ts` — inserta Founder con balances 0 y wallet BSC derivada
- `.env.example` — referencia de variables
```

