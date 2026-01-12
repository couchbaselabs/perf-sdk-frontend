/**
 * STATUS AND BADGE UTILITY FUNCTIONS
 * Consolidates duplicate color and badge functions across the codebase
 */

/**
 * Get status color classes - consolidates 3 duplicate getStatusColor functions
 * Handles variations in status names (ongoing vs running)
 */
export const getStatusColor = (status: string): string => {
  switch (status?.toLowerCase()) {
    case 'completed': 
      return 'bg-green-100 text-green-800 border-green-200'
    case 'running': 
    case 'ongoing': 
      return 'bg-blue-100 text-blue-800 border-blue-200'
    case 'failed': 
      return 'bg-red-100 text-red-800 border-red-200'
    default: 
      return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

/**
 * Get environment badge variant - consolidates 2 duplicate getEnvironmentBadgeVariant functions
 */
export const getEnvironmentBadgeVariant = (env: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
  switch (env?.toLowerCase()) {
    case 'production': 
    case 'prod': 
      return 'destructive'
    case 'staging': 
    case 'stage': 
      return 'secondary'
    case 'development': 
    case 'dev': 
      return 'default'
    default: 
      return 'outline'
  }
}

/**
 * Get score badge color - consolidates 2 duplicate getScoreBadgeColor functions
 * Returns appropriate color classes based on score value
 */
export const getScoreBadgeColor = (score: number): string => {
  if (score >= 90) {
    return 'bg-green-100 text-green-800 border-green-200'
  } else if (score >= 70) {
    return 'bg-yellow-100 text-yellow-800 border-yellow-200'
  } else if (score >= 50) {
    return 'bg-orange-100 text-orange-800 border-orange-200'
  } else {
    return 'bg-red-100 text-red-800 border-red-200'
  }
}

/**
 * Get CSP badge variant - maps CSP providers to badge variants
 */
export const getCspBadgeVariant = (csp: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
  switch (csp?.toLowerCase()) {
    case 'aws': 
      return 'default'
    case 'azure': 
      return 'secondary'
    case 'gcp': 
    case 'google': 
      return 'outline'
    default: 
      return 'secondary'
  }
}

/**
 * Get SDK badge variant based on language
 */
export const getSdkBadgeVariant = (sdk: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
  switch (sdk?.toLowerCase()) {
    case 'java': 
      return 'default'
    case 'python': 
      return 'secondary'
    case 'node': 
    case 'nodejs': 
      return 'outline'
    case 'dotnet': 
    case '.net': 
      return 'destructive'
    default: 
      return 'secondary'
  }
}

/**
 * Format status text - normalizes status display
 */
export const formatStatus = (status: string): string => {
  switch (status?.toLowerCase()) {
    case 'ongoing': 
      return 'Running'
    case 'completed': 
      return 'Completed'
    case 'failed': 
      return 'Failed'
    default: 
      return status || 'Unknown'
  }
}

/**
 * Get severity badge color for alerts/notifications
 */
export const getSeverityColor = (severity: string): string => {
  switch (severity?.toLowerCase()) {
    case 'critical': 
      return 'bg-red-100 text-red-800 border-red-200'
    case 'high': 
      return 'bg-orange-100 text-orange-800 border-orange-200'
    case 'medium': 
      return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    case 'low': 
      return 'bg-blue-100 text-blue-800 border-blue-200'
    default: 
      return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

/**
 * Score badge class for aggregated situational scores
 * Green if all runs have score 100 (score === runs * 100), otherwise red
 */
export const getAggregateScoreBadgeClass = (score: number | string, runs: number | string): string => {
  const totalScore = Number(score)
  const numRuns = Number(runs)
  if (!Number.isFinite(totalScore) || !Number.isFinite(numRuns) || numRuns <= 0) {
    return "bg-slate-500 text-white border-slate-400 border-2"
  }
  // Aggregate score is per-run total; treat perfect as runs*100
  if (totalScore === numRuns * 100) return "bg-emerald-500 text-white border-emerald-400 border-2"
  // Any non-perfect, including negative, shows red
  return "bg-red-500 text-white border-red-400 border-2"
}
