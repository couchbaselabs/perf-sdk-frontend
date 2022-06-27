import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { DashboardService, Input, Params } from './dashboard.service';
import { Query } from '@nestjs/common';

// export class QueryInput {
//     input1: string
//     input2: string
//     input3: string
//     group_by: string
//     display: string
// }

// Returns what's available filtered by display option
export class Filtered {
  clusters: Array<Object>;
  workloads: Array<string>;
  impls: Array<Object>;
  vars: Array<Object>;

  // There are going to be too many vars and they're too workload-distinct to display all of them
  // vars_by_workload: { [workload: string]: string }
  vars_by_workload: Map<string, Set<string>>;

  constructor(
    clusters: Array<Object>,
    workloads: Array<string>,
    impls: Array<Object>,
    vars: Array<Object>,
    // vars_by_workload: { [p: string]: string }) {
    vars_by_workload: Map<string, Set<string>>,
  ) {
    this.clusters = clusters;
    this.workloads = workloads;
    this.impls = impls;
    this.vars = vars;
    this.vars_by_workload = vars_by_workload;
  }
}

@Controller('dashboard')
export class AppController {
  constructor(private readonly dashboard: DashboardService) {}

  // @Get()
  // async index() {
  //   return await this.dashboard.gen_dashboard_wrapper(new Input([DashboardService.LANG_LATEST]))
  // }

  @Get('/filtered')
  async filtered(@Query() query: { group_by: string }) {
    return await this.dashboard.get_filtered(query.group_by);
  }

  @Get('/group_by_options')
  async group_by_options() {
    return await this.dashboard.get_group_by();
  }

  @Post('/query')
  async query(@Body() query: Input) {
    // const inputs = []
    // if (query.input1) inputs.push(query.input1)
    // if (query.input2) inputs.push(query.input2)
    // if (query.input3) inputs.push(query.input3)
    // const input = new Input(inputs, query.group_by, query.display)
    console.info(JSON.stringify(query));
    const input = Object.assign(new Input(), query);
    const out = await this.dashboard.gen_dashboard_wrapper(input);
    console.info(JSON.stringify(out));
    return out;
  }
}
