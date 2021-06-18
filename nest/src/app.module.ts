import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { DatabaseService } from './database.service';
import { DashboardService } from './dashboard.service';
const Promise = require('bluebird');
Promise.config({
    longStackTraces: true,
});
const initOptions = {
    promiseLib: Promise
};
const pgp = require('pg-promise')(initOptions);

@Module({
  imports: [],
  controllers: [AppController],
  providers: [{
    provide: DatabaseService,
    // TODO get database config properly
    useFactory: async () => {
      const client = pgp({
        user: 'postgres',
        host: '3.101.74.156',
        database: 'perf',
        password: 'rSKkN4MTKmRe89Rw',
        port: 5432,
      })
      await client.connect()
      return new DatabaseService(client);
    },
  }, DashboardService],
})
export class AppModule {}
