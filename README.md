# SmartX P2P Backend — Bloque 2 (Auth + Users + Wallet)

Endpoints incluidos:
- `POST /auth/signup` — crea usuario (nickname `$...`, asigna `STX######` según email), crea balances 0 y wallet BSC derivada.
- `POST /auth/login` — devuelve JWT + datos + balances + wallet.
- `GET /me` — perfil y balances (requiere JWT).
- `GET /wallet/deposit-address?asset=USDT|USDC|SMTX` — dirección BSC del usuario (JWT).

Validaciones:
- Nickname: debe **comenzar con `$`** y tener 3–20 caracteres `[A-Za-z0-9_]`.
- Email `@smartxp2p.io` cae en rango reservado `STX000001–STX000200`; el resto `STX000201+`.

## Desarrollo
```bash
npm i
npm run prisma:generate
npm run db:push
# seed founder (del Bloque 1, con FOUNDER_PASSWORD y WALLET_XPRV)
npm run seed

# iniciar API
npm run dev
```

Agregar en `.env`:
- `DATABASE_URL`
- `JWT_SECRET`
- `WALLET_XPRV`
- `PORT` (opcional), `ORIGIN` (CORS)
