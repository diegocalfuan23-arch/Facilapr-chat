import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { config } from './config';
import { AppModule } from './app.module';

async function arrancar() {
  const app = await NestFactory.create(AppModule, { bodyParser: true });
  app.enableShutdownHooks(); // cierra limpio al recibir SIGTERM (docker stop)
  await app.listen(config.puerto);
  console.log(`Servicio de chat escuchando en el puerto ${config.puerto}`);
}

void arrancar();
