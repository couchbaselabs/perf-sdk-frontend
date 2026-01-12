// Database Models based on the provided schema
export interface Run {
  id: string;
  datetime: string;
  params: Record<string, any>;
}

export interface Bucket {
  time: string;
  run_id: string;
  operations_total: number;
  operations_success: number;
  operations_failed: number;
  duration_min_us: number;
  duration_max_us: number;
  duration_average_us: number;
  duration_p50_us: number;
  duration_p95_us: number;
  duration_p99_us: number;
  errors: Record<string, any> | null;
  time_offset_secs: number;
}

export interface Metric {
  initiated: string;
  run_id: string;
  metrics: Record<string, any>;
  time_offset_secs: number;
}

export interface RunEvent {
  run_id: string;
  datetime: string;
  params: Record<string, any>;
}

export interface FaasJob {
  id: string;
  job_type: string;
  datetime: string;
  config: Record<string, any> | null;
  tags: string[] | null;
}

export interface FaasPerfJobRunJoin {
  job_id: string;
  run_id: string;
}

export interface FaasSituationalJobRunJoin {
  job_id: string;
  situational_run_id: string;
  run_id: string;
}

// Database-specific types
export interface DatabaseBucket {
  time: string;
  run_id: string;
  operations_total: number;
  operations_success: number;
  operations_failed: number;
  duration_min_us: number;
  duration_max_us: number;
  duration_average_us: number;
  duration_p50_us: number;
  duration_p95_us: number;
  duration_p99_us: number;
  errors: string | null;
  time_offset_secs: number;
}

export interface DatabaseFaasJob {
  id: string;
  job_type: string;
  datetime: string;
  config: Record<string, any>;
  tags: Record<string, any>;
}

export interface DatabaseMetrics {
  initiated: string;
  run_id: string;
  metrics: Record<string, any>;
  time_offset_secs: number;
}

export interface DatabaseRun {
  id: string;
  datetime: string;
  params: Record<string, any>;
}

export interface DatabaseRunEvent {
  run_id: string;
  datetime: string;
  params: Record<string, any>;
}

export interface DatabaseSituationalRun {
  id: string;
  datetime: string;
}

export interface DatabaseSituationalRunJoin {
  situational_run_id: string;
  run_id: string;
  params: Record<string, any>;
}
