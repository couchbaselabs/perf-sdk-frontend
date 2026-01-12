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
function formatJobIdWithDate(jobId: string): string {
  const isoDate = getIso8601Date()
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
 * @returns S3 console URL for the job's artifacts
 */
export function generateS3ConsoleUrl(
  jobId: string, 
  bucketName: string = 'fit-as-a-service-artifacts', 
  region: string = 'us-west-2'
): string {
  const datePrefixedJobId = formatJobIdWithDate(jobId)
  const prefix = `jobs/${datePrefixedJobId}/`
  return buildS3ConsoleUrl(bucketName, prefix, region)
}

/**
 * Generate S3 console URL for specific artifact type (logs, metrics, cluster)
 * @param jobId - The job/situational run ID
 * @param runId - The specific run ID (optional, for more specific paths)
 * @param artifactType - Type of artifact (logs, metrics, cluster, etc.)
 * @param bucketName - S3 bucket name (default: fit-as-a-service-artifacts)  
 * @param region - AWS region (default: us-west-2)
 * @returns S3 console URL for the specific artifact type
 */
export function generateS3ArtifactUrl(
  jobId: string,
  runId: string | null = null,
  artifactType: string = 'artifacts',
  bucketName: string = 'fit-as-a-service-artifacts',
  region: string = 'us-west-2'
): string {
  const datePrefixedJobId = formatJobIdWithDate(jobId)
  
  // Use the job-level prefix that matches the working URL pattern
  // This points to the entire job directory, letting users navigate to subdirectories
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
