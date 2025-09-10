#!/bin/bash
set -e

echo "==> Postdeploy: Prisma db push..."
npm run db:push

echo "==> Postdeploy: Seed founder STX000001..."
# Usa variables de entorno definidas en Railway:
#  - FOUNDER_PASSWORD (dejarla configurada en Variables)
#  - WALLET_XPRV (tu xprv maestro)
FOUNDER_PASSWORD="${FOUNDER_PASSWORD:-@lan$M.0906}" WALLET_XPRV="$WALLET_XPRV" npm run seed

echo "==> Postdeploy completado ✅"
