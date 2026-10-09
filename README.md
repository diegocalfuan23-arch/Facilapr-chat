# Facilapr-chat — servicio de chat en tiempo real

Servidor aparte (NestJS + Socket.IO) que reemplaza a Pusher. Facilapr (en Vercel) guarda los
mensajes y avisa a este servicio; este servicio los empuja a los navegadores.
No guarda nada: si se reinicia, los clientes se reconectan solos.

```
navegador ──(Socket.IO + token)──▶ este servicio ◀──(POST /emitir + secreto)── Facilapr
```

## Probarlo en local

```bash
npm install
npm run build && node prueba.mjs   # arranca el servidor, conecta clientes y verifica el flujo
```

## Variables

| Dónde | Variable | Valor |
|---|---|---|
| Servicio (`.env`) | `CHAT_JWT_SECRET` | 64 hex al azar (`openssl rand -hex 32`) |
| Servicio (`.env`) | `CHAT_EMIT_SECRET` | otro distinto |
| Servicio (`.env`) | `CORS_ORIGINS` | `https://facilapr.cl,https://www.facilapr.cl` |
| Facilapr (Vercel) | `CHAT_TRANSPORTE` | `socketio` |
| Facilapr (Vercel) | `NEXT_PUBLIC_CHAT_TRANSPORTE` | `socketio` |
| Facilapr (Vercel) | `NEXT_PUBLIC_CHAT_URL` | `https://chat.facilapr.cl` |
| Facilapr (Vercel) | `CHAT_URL_INTERNA` | `https://chat.facilapr.cl` |
| Facilapr (Vercel) | `CHAT_JWT_SECRET` | el MISMO del servicio |
| Facilapr (Vercel) | `CHAT_EMIT_SECRET` | el MISMO del servicio |

Los dos secretos nunca se pegan en el chat ni se suben al repositorio.
`NEXT_PUBLIC_*` se fija al compilar: tras cambiarla hay que volver a desplegar.

Volver a Pusher es borrar (o poner `pusher`) en `CHAT_TRANSPORTE` y
`NEXT_PUBLIC_CHAT_TRANSPORTE`, y redesplegar.

## Ponerlo en AWS (Lightsail)

1. Lightsail → Create instance → Linux, Ubuntu 24.04, plan de ~US$5–7/mes
   (precio fijo con transferencia incluida; es más predecible que EC2).
2. Redes: abrir los puertos 80 y 443 (el 22 solo para ti). Crear una IP estática
   y asignarla a la instancia.
3. DNS: registro `A` de `chat.facilapr.cl` hacia esa IP. Si el DNS está en
   Cloudflare, déjalo en "solo DNS" (nube gris) o activa WebSockets.
4. En la instancia:
   ```bash
   curl -fsSL https://get.docker.com | sh
   git clone https://github.com/diegocalfuan23-arch/Facilapr-chat.git && cd Facilapr-chat
   cp .env.example .env && nano .env     # completar los secretos
   docker compose up -d --build
   ```
5. HTTPS (obligatorio: facilapr.cl es https y el navegador exige `wss`).
   Lo más simple es Caddy, que consigue el certificado solo:
   ```bash
   sudo apt install -y caddy
   echo 'chat.facilapr.cl { reverse_proxy localhost:3001 }' | sudo tee /etc/caddy/Caddyfile
   sudo systemctl reload caddy
   ```
6. Comprobar: `https://chat.facilapr.cl/salud` debe responder `ok`.
7. Cargar las variables en Vercel y redesplegar.

## Seguridad

- El token dura 2 minutos y solo trae las salas que esa persona puede escuchar;
  Facilapr lo firma después de revisar la sesión (`/api/chat/token`).
- `/emitir` exige el secreto compartido y compara en tiempo constante.
- El puerto 3001 no debe abrirse a internet: solo Caddy (443) lo ve.
- Para más de un servidor haría falta un adaptador (Redis) para repartir los
  mensajes entre ellos; con uno solo no.
