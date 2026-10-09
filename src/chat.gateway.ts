import {
  OnGatewayConnection,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import * as jwt from 'jsonwebtoken';
import { config } from './config';

/**
 * Puerta de entrada de los navegadores. Cada conexión trae un token (JWT) que
 * firma Facilapr tras comprobar la sesión; dice a qué salas puede entrar esa
 * persona. Aquí no se consulta ninguna base de datos.
 */
@WebSocketGateway({
  cors: { origin: config.origenes.length ? config.origenes : false },
  // En el campo la señal se corta seguido: se tolera más antes de dar por caída la conexión.
  pingInterval: 25_000,
  pingTimeout: 30_000,
})
export class ChatGateway implements OnGatewayInit, OnGatewayConnection {
  @WebSocketServer() private server!: Server;

  afterInit(server: Server) {
    server.use((socket, next) => {
      try {
        const token = String(socket.handshake.auth?.token ?? '');
        const payload = jwt.verify(token, config.secretoJwt, {
          algorithms: ['HS256'],
          issuer: 'facilapr',
        }) as jwt.JwtPayload;

        const salas: unknown = payload.salas;
        if (!Array.isArray(salas) || salas.length === 0 || salas.length > 20) {
          return next(new Error('sin salas'));
        }
        socket.data.salas = salas.filter((s): s is string => typeof s === 'string');
        next();
      } catch {
        next(new Error('no autorizado'));
      }
    });
  }

  handleConnection(socket: Socket) {
    for (const sala of socket.data.salas as string[]) void socket.join(sala);
  }

  /** Lo llama el controlador cuando Facilapr publica un mensaje. */
  emitir(sala: string, evento: string, datos: unknown) {
    this.server.to(sala).emit(evento, datos);
  }
}
