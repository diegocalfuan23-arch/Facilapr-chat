/**
 * Prueba de humo del servicio: arranca el servidor, conecta clientes y publica.
 * Uso:  npm run build && node prueba.mjs     (desde esta carpeta)
 * Usa socket.io-client como dependencia de desarrollo.
 */
import { spawn } from "node:child_process";
import { createRequire } from "node:module";

const requerir = createRequire(import.meta.url);
const { io } = requerir("socket.io-client");
const jwt = requerir("jsonwebtoken");

const JWT = "a".repeat(40);
const EMIT = "b".repeat(40);
const PUERTO = 3917;
const URL_BASE = `http://localhost:${PUERTO}`;

const servidor = spawn(process.execPath, ["dist/main.js"], {
  env: { ...process.env, PORT: String(PUERTO), CHAT_JWT_SECRET: JWT, CHAT_EMIT_SECRET: EMIT, CORS_ORIGINS: "*" },
  stdio: "inherit",
});

servidor.on("exit", (c, s) => console.log("servidor terminó", c, s));
servidor.on("error", (e) => console.log("spawn error", e.message));
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
// Igual que firma Facilapr con jose: HS256, emisor "facilapr", salas permitidas.
const token = (salas, expiraEnSegundos = 120) =>
  jwt.sign({ salas }, JWT, { algorithm: "HS256", issuer: "facilapr", expiresIn: expiraEnSegundos });

const emitir = (sala, secreto = EMIT) =>
  fetch(`${URL_BASE}/emitir`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-secret": secreto },
    body: JSON.stringify({ sala, evento: "mensaje-nuevo", datos: { contenido: "hola" } }),
  });

let fallos = 0;
const verificar = (nombre, ok) => {
  console.log(`${ok ? "OK  " : "FALLA"} ${nombre}`);
  if (!ok) fallos++;
};

try {
  // El servidor tarda en arrancar: se consulta /salud hasta que responda.
  for (let i = 0; i < 120; i++) {
    try {
      if ((await fetch(`${URL_BASE}/salud`)).ok) break;
    } catch {
      await esperar(250);
    }
  }

  verificar("GET /salud responde ok", (await fetch(`${URL_BASE}/salud`)).status === 200);

  // Cliente con token de la sala A, otro con la sala B, otro sin token válido.
  const recibidos = { a: [], b: [] };
  const conectar = (t) => io(URL_BASE, { auth: { token: t }, transports: ["websocket"], reconnection: false });

  const a = conectar(await token(["chat-socio-A"]));
  const b = conectar(await token(["chat-socio-B"]));
  a.on("mensaje-nuevo", (m) => recibidos.a.push(m));
  b.on("mensaje-nuevo", (m) => recibidos.b.push(m));

  const malo = conectar("no-es-un-token");
  let errorMalo = null;
  malo.on("connect_error", (e) => (errorMalo = e.message));

  const vencido = conectar(await token(["chat-socio-A"], -10));
  let errorVencido = null;
  vencido.on("connect_error", (e) => (errorVencido = e.message));

  await esperar(800);

  verificar("token falso es rechazado", errorMalo === "no autorizado");
  verificar("token vencido es rechazado", errorVencido === "no autorizado");

  verificar("emitir sin secreto correcto → 401", (await emitir("chat-socio-A", "x".repeat(40))).status === 401);
  verificar("emitir con secreto correcto → 204", (await emitir("chat-socio-A")).status === 204);
  await esperar(500);

  verificar("el cliente de la sala A recibe el mensaje", recibidos.a.length === 1 && recibidos.a[0].contenido === "hola");
  verificar("el cliente de la sala B NO lo recibe", recibidos.b.length === 0);

  [a, b, malo, vencido].forEach((s) => s.disconnect());
} finally {
  servidor.kill();
}

console.log(fallos === 0 ? "\nTodo bien." : `\n${fallos} prueba(s) fallaron.`);
process.exit(fallos === 0 ? 0 : 1);
