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
| Servicio (`.env`) | `CORS_ORIGINS` | `https://facilapr.cl,https://www.facilapr.cl,https://*.facilapr.cl` |
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

## Desplegar en Railway

Railway construye el `Dockerfile` desde GitHub y da HTTPS (`wss`) sin configurar
nada más. Lee el puerto de la variable `PORT` que él mismo inyecta.

1. New Project → Deploy from GitHub repo → `Facilapr-chat`.
2. Pestaña **Variables**: cargar `CHAT_JWT_SECRET`, `CHAT_EMIT_SECRET` y
   `CORS_ORIGINS` (no definir `PORT`). Sin los dos secretos el servicio no
   arranca, a propósito.
3. Pestaña **Settings → Networking**: *Generate Domain* (o un dominio propio,
   `chat.facilapr.cl`, con el CNAME que indique Railway). Mientras el servicio
   diga "Unexposed service", Vercel no puede llegar a él.
4. Comprobar: `https://<dominio>/salud` debe responder `ok`.
5. Cargar las variables de Facilapr en Vercel (tabla de arriba) con esa URL y
   redesplegar.

También corre en cualquier VPS con `docker compose up -d --build`, poniendo
delante un proxy con HTTPS (Caddy, por ejemplo).

## Seguridad

- El token dura 2 minutos y solo trae las salas que esa persona puede escuchar;
  Facilapr lo firma después de revisar la sesión (`/api/chat/token`).
- `/emitir` exige el secreto compartido y compara en tiempo constante.
- Para más de un servidor haría falta un adaptador (Redis) para repartir los
  mensajes entre ellos; con uno solo no.
