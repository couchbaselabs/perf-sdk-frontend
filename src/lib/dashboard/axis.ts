// Consolidated axis utilities for dashboard operations
// Single source of truth for HorizontalAxisDynamicUtil

import { HorizontalAxisDynamic } from '.././dashboard/dashboard-query-types';

export class HorizontalAxisDynamicUtil {
  // Turns `databaseField` into a form we can use in a SQL query.
  static databaseRepresentation1(input: HorizontalAxisDynamic): string {
    return `params->'${input.databaseField.replace('.', "'->>'")}'`;
  }

  // Turns `databaseField` into a form we can use in a SQL query... but different!
  static databaseRepresentation2(input: HorizontalAxisDynamic): string {
    const split = input.databaseField.split('.');
    return `{${split.join(',')}}`;
  }
}
