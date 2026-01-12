// Types for SDK version data
export interface SdkVersion {
  id: string
  name: string
  language: string
  color: string
  icon: string
  latestVersion: string
  isActive: boolean
  description?: string
}

// Unified SDK color system - single source of truth
const SDK_COLORS = {
  node: "#10B981",      // Green
  java: "#F97316",      // Orange  
  kotlin: "#6366F1",    // Indigo
  python: "#3B82F6",    // Blue
  dotnet: "#8B5CF6",    // Purple
  go: "#06B6D4",        // Cyan
  ruby: "#EF4444",      // Red
  scala: "#EC4899",     // Pink
  cpp: "#6B7280",       // Gray
  rust: "#DEA584",     // Orange Brown
} as const

// Available SDK versions data
// In a real application, this would be fetched from an API
const AVAILABLE_SDK_VERSIONS: SdkVersion[] = [
  {
    id: "node",
    name: "Node.js",
    language: "JavaScript",
    color: SDK_COLORS.node,
    icon: "nodejs",
    latestVersion: "4.2.0",
    isActive: true,
    description: "JavaScript SDK for Node.js applications",
  },
  {
    id: "java",
    name: "Java",
    language: "Java",
    color: SDK_COLORS.java,
    icon: "java",
    latestVersion: "3.4.0",
    isActive: true,
    description: "Java SDK for enterprise applications",
  },
  {
    id: "kotlin",
    name: "Kotlin",
    language: "Kotlin",
    color: SDK_COLORS.kotlin,
    icon: "kotlin",
    latestVersion: "1.0.0",
    isActive: true,
    description: "Kotlin SDK for modern JVM applications",
  },
  {
    id: "python",
    name: "Python",
    language: "Python",
    color: SDK_COLORS.python,
    icon: "python",
    latestVersion: "4.1.2",
    isActive: true,
    description: "Python SDK for data science and web applications",
  },
  {
    id: "dotnet",
    name: ".NET",
    language: "C#",
    color: SDK_COLORS.dotnet,
    icon: "dotnet",
    latestVersion: "3.3.0",
    isActive: true,
    description: ".NET SDK for C# applications",
  },
  {
    id: "go",
    name: "Go",
    language: "Go",
    color: SDK_COLORS.go,
    icon: "go",
    latestVersion: "2.6.0",
    isActive: true,
    description: "Go SDK for high-performance applications",
  },
  {
    id: "ruby",
    name: "Ruby",
    language: "Ruby",
    color: SDK_COLORS.ruby,
    icon: "ruby",
    latestVersion: "3.2.0",
    isActive: true,
    description: "Ruby SDK for web applications",
  },
  {
    id: "scala",
    name: "Scala",
    language: "Scala",
    color: SDK_COLORS.scala,
    icon: "scala",
    latestVersion: "1.4.0",
    isActive: true,
    description: "Scala SDK for functional programming",
  },
  {
    id: "cpp",
    name: "C++",
    language: "C++",
    color: SDK_COLORS.cpp,
    icon: "cpp",
    latestVersion: "3.2.0",
    isActive: true,
    description: "C++ SDK for high-performance applications",
  },
  {
    id: "rust",
    name: "Rust",
    language: "Rust",
    color: SDK_COLORS.rust,
    icon: "rust",
    latestVersion: "1.0.0-beta",
    isActive: true,
    description: "Rust SDK for memory-safe high-performance applications",
  },
]

// Function to get all available SDK versions
export async function getAvailableSdkVersions(): Promise<SdkVersion[]> {
  // Simulate API call delay
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(AVAILABLE_SDK_VERSIONS)
    }, 300)
  })
}

// Function to get a specific SDK version by ID
export function getSdkVersionById(id: string): SdkVersion | undefined {
  return AVAILABLE_SDK_VERSIONS.find((version) => version.id === id)
}

// Function to get a color for a specific SDK version
export function getSdkVersionColor(id: string): string {
  const version = getSdkVersionById(id)
  return version?.color || SDK_COLORS.cpp // Default gray if not found
}

// Export unified SDK colors for use across the app
export function getUnifiedSdkColor(sdkId: string): string {
  return SDK_COLORS[sdkId as keyof typeof SDK_COLORS] || SDK_COLORS.cpp
}

// Get SDK color by language name (case-insensitive)
export function getSdkColorByLanguage(language: string): string {
  const lang = language.toLowerCase()
  if (lang.includes('java') && !lang.includes('script')) return SDK_COLORS.java
  if (lang.includes('javascript') || lang.includes('node')) return SDK_COLORS.node
  if (lang.includes('python')) return SDK_COLORS.python
  if (lang.includes('kotlin')) return SDK_COLORS.kotlin
  if (lang.includes('go')) return SDK_COLORS.go
  if (lang.includes('.net') || lang.includes('dotnet') || lang.includes('c#')) return SDK_COLORS.dotnet
  if (lang.includes('ruby')) return SDK_COLORS.ruby
  if (lang.includes('scala')) return SDK_COLORS.scala
  if (lang.includes('c++') || lang.includes('cpp')) return SDK_COLORS.cpp
  if (lang.includes('rust')) return SDK_COLORS.rust
  return SDK_COLORS.cpp
}

// Function to generate a performance factor based on SDK version
// Different SDKs have different performance characteristics
export function getSdkPerformanceFactor(id: string, operation: string): number {
  const version = getSdkVersionById(id)
  if (!version) return 1.0

  // Each SDK has different performance characteristics for different operations
  const performanceFactors: Record<string, Record<string, number>> = {
    node: {
      "KV Get": 1.0,
      "KV Replace": 1.1,
      "KV Insert": 1.05,
      Query: 1.2,
      Search: 1.15,
    },
    java: {
      "KV Get": 0.9,
      "KV Replace": 0.95,
      "KV Insert": 0.92,
      Query: 1.0,
      Search: 1.05,
    },
    kotlin: {
      "KV Get": 0.92,
      "KV Replace": 0.97,
      "KV Insert": 0.94,
      Query: 1.02,
      Search: 1.08,
    },
    python: {
      "KV Get": 1.3,
      "KV Replace": 1.35,
      "KV Insert": 1.4,
      Query: 1.5,
      Search: 1.45,
    },
    dotnet: {
      "KV Get": 0.95,
      "KV Replace": 1.0,
      "KV Insert": 0.98,
      Query: 1.1,
      Search: 1.05,
    },
    go: {
      "KV Get": 0.85,
      "KV Replace": 0.9,
      "KV Insert": 0.88,
      Query: 1.0,
      Search: 0.95,
    },
    ruby: {
      "KV Get": 1.4,
      "KV Replace": 1.45,
      "KV Insert": 1.5,
      Query: 1.6,
      Search: 1.55,
    },
    scala: {
      "KV Get": 1.1,
      "KV Replace": 1.15,
      "KV Insert": 1.2,
      Query: 1.3,
      Search: 1.25,
    },
    cpp: {
      "KV Get": 0.8,
      "KV Replace": 0.85,
      "KV Insert": 0.82,
      Query: 0.9,
      Search: 0.88,
    },
  }

  return performanceFactors[id]?.[operation] || 1.0
}
