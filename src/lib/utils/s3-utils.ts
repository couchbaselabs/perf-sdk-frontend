/**
 * S3 utilities for generating console URLs following FIT-as-a-service patterns
 */

/**
 * Get current date in ISO format (YYYY-MM-DD)
 */
function getIso8601Date(): string {
  return new Date().toISOString().split('T')[0]
}

/**
 * Format job ID with date prefix following FIT-as-a-service convention
 * @param jobId - The job/situational run ID
 * @returns Formatted job ID: YYYY-MM-DD-{jobId}
 */
function formatJobIdWithDate(jobId: string, date?: string): string {
  // Prefix with the run's date to match the S3 folder.
  // TODO: file an SDKQE ticket. The date is the run's UTC day but the folder uses the
  // backend's local start-date, so it can be off by a day near midnight; the backend
  // should store the exact date so the UI doesn't have to guess.
  const parsed = date ? new Date(date) : null
  const isoDate = parsed && !isNaN(parsed.getTime()) ? parsed.toISOString().split('T')[0] : getIso8601Date()
  return `${isoDate}-${jobId}`
}

/**
 * Build S3 console URL following AWS console format
 * @param bucketName - S3 bucket name
 * @param prefix - S3 prefix path
 * @param region - AWS region (default: us-west-2)
 * @returns Complete S3 console URL
 */
function buildS3ConsoleUrl(bucketName: string, prefix: string, region: string = 'us-west-2'): string {
  // Remove leading slash from prefix if present
  const cleanPrefix = prefix.startsWith('/') ? prefix.slice(1) : prefix
  return `https://${region}.console.aws.amazon.com/s3/buckets/${bucketName}?prefix=${cleanPrefix}&region=${region}&bucketType=general`
}

/**
 * Generate S3 console URL for a job's artifacts
 * @param jobId - The job/situational run ID  
 * @param bucketName - S3 bucket name (default: fit-as-a-service-artifacts)
 * @param region - AWS region (default: us-west-2)
 * @param date - The run's date; defaults to today
 * @returns S3 console URL for the job's artifacts
 */
export function generateS3ConsoleUrl(
  jobId: string,
  bucketName: string = 'fit-as-a-service-artifacts',
  region: string = 'us-west-2',
  date?: string
): string {
  const datePrefixedJobId = formatJobIdWithDate(jobId, date)
  const prefix = `jobs/${datePrefixedJobId}/`
  return buildS3ConsoleUrl(bucketName, prefix, region)
}

/**
 * Configuration object for S3 settings
 */
export const S3_CONFIG = {
  DEFAULT_BUCKET: 'fit-as-a-service-artifacts',
  DEFAULT_REGION: 'us-west-2',
} as const
