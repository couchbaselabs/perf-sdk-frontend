import {Body, Controller, Get, Post, Query} from '@nestjs/common';
import {
  DashboardService,
  Input,
  MetricsQuery,
  Single,
  SituationalRunAndRunQuery,
  SituationalRunQuery
} from './dashboard.service';

// Returns what's available filtered by display option
export class Filtered {
  clusters: Array<string>;
  workloads: Array<string>;
  impls: Array<string>;
  vars: Array<string>;

  // There are going to be too many vars and they're too workload-distinct to display all of them
  varsByWorkload: Map<string, Set<string>>;

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
    this.varsByWorkload = varsByWorkload;
  }
}

@Controller('dashboard')
export class AppController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get('/filtered')
  async filtered(@Query() query: { hAxis: string }) {
    return await this.dashboard.getFiltered(query.hAxis);
  }

  @Get('/groupByOptions')
  async groupByOptions() {
    return await this.dashboard.getGroupBy();
  }

  @Post('/query')
  async query(@Body() query: Input) {
    console.info(JSON.stringify(query));
    const input = Object.assign(new Input(), query);
    return await this.dashboard.genGraph(input);
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

  @Post('/situationalRun')
  async situationalRun(@Body() query: SituationalRunQuery) {
    console.info(JSON.stringify(query));
    const input = Object.assign(new SituationalRunQuery(), query);
    return await this.dashboard.genSituationalRun(input);
  }

  @Get('/situationalRuns')
  async situationalRuns() {
    return await this.dashboard.genSituationalRuns();
  }

  @Post('/situationalRunRun')
  async situationalRunRun(@Body() query: SituationalRunAndRunQuery) {
    console.info(JSON.stringify(query));
    const input = Object.assign(new SituationalRunAndRunQuery(), query);
    return await this.dashboard.genSituationalRunRun(input);
  }

  @Post('/situationalRunRunEvents')
  async situationalRunRunEvents(@Body() query: SituationalRunAndRunQuery) {
    console.info(JSON.stringify(query));
    const input = Object.assign(new SituationalRunAndRunQuery(), query);
    return await this.dashboard.genSituationalRunRunEvents(input);
  }

  @Post('/situationalRunRunErrorsSummary')
  async situationalRunRunErrorsSummary(@Body() query: SituationalRunAndRunQuery) {
    console.info(JSON.stringify(query));
    const input = Object.assign(new SituationalRunAndRunQuery(), query);
    return await this.dashboard.genSituationalRunRunErrorsSummary(input);
  }

  @Get('/metrics')
  async getAvailableMetrics() {
    return await this.dashboard.getAvailableMetrics();
  }

}
