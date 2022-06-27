import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { DatabaseService } from './database.service';
import { DashboardService, Input, Panel } from './dashboard.service';
const Promise = require('bluebird');
Promise.config({
  longStackTraces: true,
});

const initOptions = {
  promiseLib: Promise,
};
const pgp = require('pg-promise')(initOptions);

describe('AppController', () => {
  let service: DashboardService;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: DatabaseService,
          useFactory: async () => {
            const client = pgp({
              user: 'postgres',
              host: 'localhost',
              database: 'perf',
              password: 'postgres',
              port: 5432,
            });
            await client.connect();
            return new DatabaseService(client);
          },
        },
        DashboardService,
      ],
    }).compile();

    service = app.get(DashboardService);
  });

  function make_input(): Input {
    const input = new Input();

    input.group_by = 'cluster.version';
    input.display = 'latency_average_us';
    input.impl = { version: '1.0.0', language: 'cxx' };
    input.vars = {
      durability: 'MAJORITY',
      doc_pool_size: 1000,
      number_of_inserts: 3,
      horizontal_scaling: 5,
    };
    // input.fixed =  {"fit_driver_vers": "1", "fit_performer_vers": "1"}
    // input.other = {"runtime": 10}
    // input.cluster = {"env": "AWS", "disk": "ssd", "nodes": 3, "version": "7.0.0-4545", "node_size": "m4"}
    input.workload = {
      description:
        '$number_of_inserts inserts, one replace with chance of contention',
    };
    return input;
  }

  describe('dashboard', () => {
    it('by lang"', async () => {
      const input = make_input();
      const i = new Input();
      const panel = new Panel();
      panel.viewing = 'cluster';
      panel.params = [{ env: 'AWS', disk: 'ssd', nodes: 3, node_size: 'm4' }];
      input.inputs = [panel];
      const res = await service.gen_dashboard_wrapper(input);
      console.info(res);
    });
    // it('impl.language"', async () => {
    //   const res = await service.gen_dashboard_wrapper(new Input(["impl.language (latest)"], "impl.language"))
    //   console.info(res)
    // });
    // it('cluster.version + impl.language', async () => {
    //   const res = await service.gen_dashboard_wrapper(new Input(["cluster.version"], "impl.language"))
    //   console.info(res)
    // });
  });

  // describe('display options', () => {
  //   it('parsing', () => {
  //     const input = `{"impl": {"version": "1.0.0", "language": "cxx"}, "vars": {"durability": "MAJORITY", "doc_pool_size": 1000, "number_of_inserts": 3, "horizontal_scaling": 5}}`
  //     const out = DashboardService.gen_strings("", JSON.parse(input))
  //     expect(out).toContain("impl.version")
  //     expect(out.length).toEqual(6)
  //   });
  //
  //   it('from db', async () => {
  //     const out = await service.get_group_by()
  //     expect(out).toContain("impl.version")
  //     expect(out.length).toEqual(6)
  //   });
  //
  //   it('filtered cluster.version', async () => {
  //     const app: TestingModule = await Test.createTestingModule({
  //       providers: [{
  //         provide: DatabaseService,
  //         useFactory: async () => {
  //           const client = pgp({
  //             user: 'postgres',
  //             host: 'localhost',
  //             database: 'perf',
  //             password: 'postgres',
  //             port: 5432,
  //           })
  //           await client.connect()
  //           return new DatabaseService(client);
  //         },
  //       }, DashboardService],
  //     }).compile();
  //
  //     const svc = app.get(DashboardService);
  //
  //
  //     const out = await svc.get_filtered('cluster.version')
  //     expect(out).toContain("impl.version")
  //   });
  // });
});
