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

/**
 * Un origen puede traer comodín en el subdominio ("https://*.facilapr.cl"),
 * porque el portal de cada comité vive en su propio subdominio. Sin
 * comodín se compara tal cual.
 */
function aOrigen(origen: string): string | RegExp {
  if (!origen.includes('*')) return origen;
  // Se escapa todo lo que sea especial en una regex, salvo el "*", que pasa a ser un subdominio.
  const escapado = origen.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^${escapado.replace('*', '[a-z0-9-]+')}$`, 'i');
}

export const config = {
  puerto: Number(process.env.PORT ?? 3001),
  secretoJwt: exigirSecreto('CHAT_JWT_SECRET'),
  secretoEmitir: exigirSecreto('CHAT_EMIT_SECRET'),
  origenes: (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean)
    .map(aOrigen),
};
