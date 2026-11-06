import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Get a consistent color for cluster versions
 * Used across charts and components for cluster version visualization
 */
export function getClusterVersionColor(version: string): string {
  // Generate consistent colors based on version string
  const colors = [
    '#3b82f6', // blue-500
    '#ef4444', // red-500
    '#10b981', // emerald-500
    '#f59e0b', // amber-500
    '#8b5cf6', // violet-500
    '#06b6d4', // cyan-500
    '#84cc16', // lime-500
    '#f97316', // orange-500
    '#ec4899', // pink-500
    '#6b7280', // gray-500
  ]
  
  // Simple hash function to consistently map version strings to colors
  let hash = 0
  for (let i = 0; i < version.length; i++) {
    const char = version.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  
  const index = Math.abs(hash) % colors.length
  return colors[index]
}

/**
 * Generate a UUID v4
 * Used for creating unique identifiers
 */
export function generateUuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

// formatDateTime moved to lib/utils/date.ts for centralized date formatting

// ==========================================
// CONSOLIDATED UTILITIES FROM MICRO-FILES
// ==========================================

/**
 * Version comparison utilities (from versions.ts)
 * Consolidating 14-line file into main utils
 */
const semver = require('semver')

/**
 * The kind of SDK version, derived from the performer docker image tag that
 * produced the run (see fit-performer-docker-image-conventions.md).
 *
 *  - release         -> immutable release tag, e.g. "3.12.0"
 *  - branch-snapshot -> branch snapshot tag "<major>.<minor>.x", e.g. "3.11.x".
 *                       The image is overwritten on every build, so only the
 *                       latest run is meaningful.
 *  - main            -> the "main" branch snapshot. Also overwritten each build.
 *  - gerrit          -> on-demand Gerrit/GitHub PR build ("refs/..." or "refs-...").
 *  - ondemand        -> on-demand git-hash build ("sha-...").
 *  - other           -> anything unrecognised.
 *
 * Note: legacy jenkins-sdk snapshots like "3.4.0-20241025.022106+960bdda" are
 * classified as `release` so they keep their existing semver ordering.
 */
export type VersionKind =
  | 'release'
  | 'branch-snapshot'
  | 'main'
  | 'gerrit'
  | 'ondemand'
  | 'other'

export function classifyVersion(version: string | undefined | null): VersionKind {
  if (!version) return 'other'
  const v = baseVersion(version).trim()
  if (v === 'main' || v === 'master') return 'main'
  if (/^\d+\.\d+\.x$/.test(v)) return 'branch-snapshot'
  if (v.startsWith('refs/') || v.startsWith('refs-')) return 'gerrit'
  if (v.startsWith('sha-')) return 'ondemand'
  return 'release'
}

/**
 * A version is a "moving" tag if its docker image is overwritten on every build
 * (main + branch snapshots). Version charts show one bar per recent commit of
 * these (see commitGrouping); other charts show only the latest commit.
 */
export function isMovingVersion(version: string | undefined | null): boolean {
  const kind = classifyVersion(version)
  return kind === 'main' || kind === 'branch-snapshot'
}

/**
 * How many of a moving version's most recent commits get a bar on version charts.
 * fit-cli's ingest keeps the last MOVING_COMMITS_KEPT (10) commits per branch,
 * so this should not exceed that.
 */
export const MOVING_COMMITS_SHOWN = 10

// Moving-version bars are labelled "<version>@<short commit>", e.g. "main@a1b2c3d".
const COMMIT_SEPARATOR = '@'
const SHORT_COMMIT_LENGTH = 7

/** The version part of a bar label, i.e. without any "@<commit>" suffix. */
export function baseVersion(grouping: string): string {
  const at = grouping.indexOf(COMMIT_SEPARATOR)
  return at < 0 ? grouping : grouping.slice(0, at)
}

/**
 * The bar a run belongs to on a version chart: its version, plus its short
 * commit for a moving version whose image recorded one. Must agree with
 * COMMIT_GROUPING_SQL, which does the same grouping in the database.
 */
export function commitGrouping(version: string, revision: string | null | undefined): string {
  return isMovingVersion(version) && revision
    ? `${version}${COMMIT_SEPARATOR}${revision.slice(0, SHORT_COMMIT_LENGTH)}`
    : version
}

/** SQL for commitGrouping over a runs row. `params` must resolve to runs.params. */
export const COMMIT_GROUPING_SQL = `(CASE
    WHEN (params->'impl'->>'version' IN ('main', 'master') OR params->'impl'->>'version' ~ '^[0-9]+[.][0-9]+[.]x$')
         AND coalesce(params->'impl'->'image'->>'revision', '') <> ''
    THEN params->'impl'->>'version' || '${COMMIT_SEPARATOR}' || left(params->'impl'->'image'->>'revision', ${SHORT_COMMIT_LENGTH})
    ELSE params->'impl'->>'version'
  END)`

/**
 * X-axis order for version bars: versionCompare on the version, then, for the
 * commits of one moving version, oldest build first so the newest is rightmost.
 * `builtAt` gives a bar's image build time, when known.
 */
export function compareVersionGroupings(a: string, b: string, builtAt: (grouping: string) => number | undefined): number {
  const byVersion = versionCompare(baseVersion(a), baseVersion(b))
  if (byVersion !== 0) return byVersion
  const at = builtAt(a)
  const bt = builtAt(b)
  if (at !== undefined && bt !== undefined && at !== bt) return at - bt
  return a.localeCompare(b)
}

// Ordering of version kinds along the bar-chart X-axis (left -> right):
// releases first (sorted by semver), then PR/Gerrit changes, then on-demand
// builds, then branch snapshots, and finally main at the very end.
const VERSION_KIND_ORDER: Record<VersionKind, number> = {
  release: 0,
  gerrit: 1,
  ondemand: 2,
  'branch-snapshot': 3,
  main: 4,
  other: 5,
}

function safeSemverCompare(version1: string, version2: string): number {
  try {
    return semver.compare(normalizeVersion(version1), normalizeVersion(version2))
  } catch {
    // Non-semver input (e.g. partial versions): fall back to a stable order.
    return version1.localeCompare(version2)
  }
}

// Ranking used to pick the single "latest" version to display. Released
// versions always win over moving and on-demand tags, so the default is the
// newest release rather than a main or branch snapshot. This is deliberately
// distinct from versionCompare, which orders the X-axis.
const VERSION_RECENCY_RANK: Record<VersionKind, number> = {
  release: 5,
  'branch-snapshot': 4,
  main: 3,
  ondemand: 2,
  gerrit: 1,
  other: 0,
}

/**
 * True when `candidate` is a better choice than `current` for the "latest"
 * version of an SDK. Releases beat everything else, then ties break by semver
 * (releases) or stable lexical order (moving/on-demand tags).
 */
export function isMoreRecentVersion(candidate: string, current: string): boolean {
  const candidateKind = classifyVersion(candidate)
  const currentKind = classifyVersion(current)

  if (candidateKind !== currentKind) {
    return VERSION_RECENCY_RANK[candidateKind] > VERSION_RECENCY_RANK[currentKind]
  }
  if (candidateKind === 'release') {
    return safeSemverCompare(candidate, current) > 0
  }
  if (candidateKind === 'branch-snapshot') {
    return safeSemverCompare(candidate.replace(/\.x$/, '.0'), current.replace(/\.x$/, '.0')) > 0
  }
  return candidate.localeCompare(current) > 0
}

/**
 * Compares two version strings for X-axis ordering. Releases sort by semver;
 * moving/on-demand tags are grouped by kind and pushed to the end (gerrit, then
 * on-demand, then branch snapshot, then main) so the branch-snapshot and main
 * bars always appear last. Never throws on non-semver input.
 */
export function versionCompare(version1: string, version2: string): number {
  const kind1 = classifyVersion(version1)
  const kind2 = classifyVersion(version2)

  if (kind1 !== kind2) {
    return VERSION_KIND_ORDER[kind1] - VERSION_KIND_ORDER[kind2]
  }

  if (kind1 === 'release') {
    return safeSemverCompare(version1, version2)
  }
  if (kind1 === 'branch-snapshot') {
    // Order "3.11.x" by its major.minor (treated as "3.11.0").
    return safeSemverCompare(version1.replace(/\.x$/, '.0'), version2.replace(/\.x$/, '.0'))
  }
  // main / gerrit / ondemand / other: stable lexical order within the kind.
  return version1.localeCompare(version2)
}

/**
 * Normalizes a version string to make it compatible with semver.
 * E.g. handles "1.0.3-20241025.022106+960bdda", where the ".0" is illegal.
 */
function normalizeVersion(version: string): string {
  return version.replace(/\.0(\d{5})/, '-$1')
}

/**
 * Color shade provider for charts (from shade-provider.ts)
 * Consolidating 15-line file into main utils
 */
export class ShadeProvider {
  private shades = [
    '#E2F0CB',
    '#B5EAD7', 
    '#C7CEEA',
    '#FF9AA2',
    '#FFB7B2',
    '#FFDAC1',
  ]
  private shadeIdx = 0

  nextShade(): string {
    return this.shades[this.shadeIdx++ % this.shades.length]
  }
}
