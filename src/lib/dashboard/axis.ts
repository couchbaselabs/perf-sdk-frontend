// Consolidated axis utilities for dashboard operations
// Single source of truth for HorizontalAxisDynamicUtil

import { HorizontalAxisDynamic } from '.././dashboard/dashboard-query-types';

const AXIS_DATABASE_FIELD_PATTERN = /^[A-Za-z0-9_]+(?:\.[A-Za-z0-9_]+)*$/;

function parseValidatedAxisSegments(databaseField: string): string[] {
  if (typeof databaseField !== 'string' || !AXIS_DATABASE_FIELD_PATTERN.test(databaseField)) {
    throw new Error(`Invalid axis databaseField: ${String(databaseField)}`);
  }
  return databaseField.split('.');
}

export class HorizontalAxisDynamicUtil {
  // Turns `databaseField` into a form we can use in a SQL query.
  static databaseRepresentation1(input: HorizontalAxisDynamic): string {
    const segments = parseValidatedAxisSegments(input.databaseField);
    const leaf = segments[segments.length - 1];
    if (segments.length === 1) {
      return `params->>'${leaf}'`;
    }
    const prefix = segments
      .slice(0, -1)
      .map((seg) => `'${seg}'`)
      .join('->');
    return `params->${prefix}->>'${leaf}'`;
  }

  // Turns `databaseField` into a form we can use in a SQL query... but different!
  static databaseRepresentation2(input: HorizontalAxisDynamic): string {
    const segments = parseValidatedAxisSegments(input.databaseField);
    return `{${segments.join(',')}}`;
  }
}
