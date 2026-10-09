/**
 * Configuración del servicio, leída del entorno al arrancar. Si falta un
 * secreto el servicio no levanta: es mejor caer al inicio que correr abierto.
 */
function exigirSecreto(nombre: string): string {
  const valor = process.env[nombre];
  if (!valor || valor.length < 32) {
    console.error(
      `Falta ${nombre} (mínimo 32 caracteres). Genera uno con: openssl rand -hex 32`,
    );
    process.exit(1);
  }
  return valor;
}

export const config = {
  puerto: Number(process.env.PORT ?? 3001),
  secretoJwt: exigirSecreto('CHAT_JWT_SECRET'),
  secretoEmitir: exigirSecreto('CHAT_EMIT_SECRET'),
  origenes: (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
};
