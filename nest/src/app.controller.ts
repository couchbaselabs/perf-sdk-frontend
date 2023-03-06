import {Body, Controller, Get, Post, Query} from '@nestjs/common';
import {DashboardService, Input, MetricsQuery, Single} from './dashboard.service';

// Returns what's available filtered by display option
export class Filtered {
  clusters: Array<string>;
  workloads: Array<string>;
  impls: Array<string>;
  vars: Array<string>;

  // There are going to be too many vars and they're too workload-distinct to display all of them
  // vars_by_workload: { [workload: string]: string }
  vars_by_workload: Map<string, Set<string>>;

  constructor(
    clusters: Array<string>,
    workloads: Array<string>,
    impls: Array<string>,
    vars: Array<string>,
    varsByWorkload: Map<string, Set<string>>,
  ) {
    this.clusters = clusters;
    this.workloads = workloads;
    this.impls = impls;
    this.vars = vars;
    this.vars_by_workload = varsByWorkload;
  }
}

@Controller('dashboard')
export class AppController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get('/filtered')
  async filtered(@Query() query: { group_by: string }) {
    return await this.dashboard.getFiltered(query.group_by);
  }

  @Get('/group_by_options')
  async group_by_options() {
    return await this.dashboard.getGroupBy();
  }

  @Post('/query')
  async query(@Body() query: Input) {
    console.info(JSON.stringify(query));
    const input = Object.assign(new Input(), query);
    return await this.dashboard.genDashboardWrapper(input);
  }

  @Post('/single')
  async single(@Body() query: Single) {
    console.info(JSON.stringify(query));
    const input = Object.assign(new Single(), query);
    return await this.dashboard.genSingle(input);
  }

  @Post('/metrics')
  async metrics(@Body() query: MetricsQuery) {
    console.info(JSON.stringify(query));
    const input = Object.assign(new MetricsQuery(), query);
    return await this.dashboard.genMetrics(input);
  }
}
