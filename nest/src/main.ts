import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
require('dotenv').config();
import * as sourceMapSupport from 'source-map-support';
sourceMapSupport.install();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  await app.listen(3002);
}

if (!process.env.CB_DATABASE_PASSWORD) {
  console.info('Must provide CB_DATABASE_PASSWORD.  Can edit nest/.env');
} else {
  bootstrap();
}
