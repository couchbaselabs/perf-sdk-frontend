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
    useFactory: async () => {
      const client = pgp({
        user: 'postgres',
        host: 'localhost',
        database: 'perf',
        password: 'postgres',
        port: 5432,
      })
      await client.connect()
      return new DatabaseService(client);
    },
  }, DashboardService],
})
export class AppModule {}
