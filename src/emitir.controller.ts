import {
  BadRequestException,
  Body,
  CanActivate,
  Controller,
  ExecutionContext,
  Get,
  HttpCode,
  Injectable,
  Post,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { timingSafeEqual } from 'node:crypto';
import { ChatGateway } from './chat.gateway';
import { config } from './config';

/** Solo Facilapr puede publicar: exige el secreto compartido, comparado en tiempo constante. */
@Injectable()
export class SecretoGuard implements CanActivate {
  canActivate(contexto: ExecutionContext): boolean {
    const recibido = contexto.switchToHttp().getRequest().headers['x-api-secret'];
    if (typeof recibido !== 'string') throw new UnauthorizedException();

    const a = Buffer.from(recibido);
    const b = Buffer.from(config.secretoEmitir);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      throw new UnauthorizedException();
    }
    return true;
  }
}

@Controller()
export class EmitirController {
  constructor(private readonly chat: ChatGateway) {}

  @Get('salud')
  salud() {
    return 'ok';
  }

  @Post('emitir')
  @HttpCode(204)
  @UseGuards(SecretoGuard)
  emitir(@Body() cuerpo: { sala?: unknown; evento?: unknown; datos?: unknown }) {
    if (typeof cuerpo?.sala !== 'string' || typeof cuerpo?.evento !== 'string') {
      throw new BadRequestException();
    }
    this.chat.emitir(cuerpo.sala, cuerpo.evento, cuerpo.datos);
  }
}
