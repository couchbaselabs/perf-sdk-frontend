import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
require('dotenv').config();
import * as sourceMapSupport from 'source-map-support';
sourceMapSupport.install();
import * as fs from 'fs';


async function bootstrap() {
  let httpsOptions = undefined
  if (fs.existsSync('/etc/nginx/ca.key')) {
    console.info("Found key, assuming prod and enabling https")
    httpsOptions = {
      key: fs.readFileSync('/etc/nginx/ca.key'),
      cert: fs.readFileSync('/etc/nginx/ca.crt'),
    }
  }
  else {
    console.info("Did not find key, assuming local dev and not enabling https")
  }

  const app = await NestFactory.create(AppModule, {httpsOptions});
  app.enableCors();
  await app.listen(3002);
}

if (!process.env.CB_DATABASE_PASSWORD) {
  console.info('Must provide CB_DATABASE_PASSWORD.  Can edit nest/.env');
} else {
  bootstrap();
}
