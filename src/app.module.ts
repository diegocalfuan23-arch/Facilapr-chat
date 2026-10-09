import { Module } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { EmitirController, SecretoGuard } from './emitir.controller';

@Module({
  controllers: [EmitirController],
  providers: [ChatGateway, SecretoGuard],
})
export class AppModule {}
