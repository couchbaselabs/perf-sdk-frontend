/**
 * SDK AND TAG UTILITY FUNCTIONS
 * Consolidates duplicate SDK detection and color functions across the codebase
 */

/**
 * Extract SDK name from tags array - consolidates 3 duplicate getSDKFromTags functions
 * Used in FaaS components to determine SDK from job tags
 */
export const getSDKFromTags = (tags: string[]): string => {
  if (!tags || !Array.isArray(tags)) return 'Unknown'
  
  for (const tag of tags) {
    if (tag.startsWith('JCBC')) return 'Java'
    if (tag.startsWith('GOCBC')) return 'Go'
    if (tag.startsWith('PYCBC')) return 'Python'
    if (tag.startsWith('DOTNET')) return '.NET'
    if (tag.startsWith('NCBC')) return 'Node.js'
    if (tag.startsWith('KCBC')) return 'Kotlin'
    if (tag.startsWith('RCBC')) return 'Ruby'
    if (tag.startsWith('SCBC')) return 'Scala'
    if (tag.startsWith('CCBC')) return 'C++'
    if (tag.startsWith('RSCBC')) return 'Rust'
  }
  return 'Unknown'
}


/**
 * Get a list of all supported SDKs
 * Useful for dropdowns and filters
 */
export const getSupportedSDKs = (): string[] => {
  return [
    'Java',
    'Python', 
    'Node.js',
    'Go',
    '.NET',
    'Kotlin',
    'Ruby',
    'Scala',
    'C++',
    'Rust',
  ]
}

/**
 * Validate if an SDK name is supported
 */
export const isValidSDK = (sdk: string): boolean => {
  return getSupportedSDKs().includes(sdk)
}
