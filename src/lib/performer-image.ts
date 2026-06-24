/**
 * Helpers for the performer image metadata at `params.impl.image` (from the
 * image's OCI labels). Every field is optional and absent for build-from-source
 * and pre-pipeline runs, so consumers must tolerate null/missing fields.
 */

export interface PerformerImage {
  /** Performer image build time (OCI org.opencontainers.image.created). */
  created?: string | null
  /** Full URL of the change under test (Gerrit review or GitHub PR). */
  pr?: string | null
  /** Git commit SHA the performer was built from. */
  revision?: string | null
  /** URL of the CI (GitHub Actions) run that built the image. */
  ciRun?: string | null
  /** Source repository URL. */
  source?: string | null
}

/** Narrow `params.impl.image` to a PerformerImage, or null if no usable field. */
export function parsePerformerImage(raw: unknown): PerformerImage | null {
  if (!raw || typeof raw !== 'object') return null
  const obj = raw as Record<string, unknown>
  const str = (v: unknown): string | undefined =>
    typeof v === 'string' && v.trim() !== '' ? v.trim() : undefined

  const image: PerformerImage = {
    created: str(obj.created),
    pr: str(obj.pr),
    revision: str(obj.revision),
    ciRun: str(obj.ciRun),
    source: str(obj.source),
  }

  const hasAny = Object.values(image).some((v) => v != null)
  return hasAny ? image : null
}

export interface ChangeLink {
  url: string
  /** Short human label, e.g. "Gerrit 247349" or "PR #123". */
  label: string
  /** Provider for icon/labelling decisions. */
  provider: 'gerrit' | 'github' | 'other'
}

/** Provider-aware link descriptor from the `pr` URL (Gerrit review / GitHub PR). */
export function describeChangeLink(pr: string | null | undefined): ChangeLink | null {
  if (!pr || pr.trim() === '') return null
  const url = pr.trim()

  // Gerrit: https://review.couchbase.org/c/<repo>/+/247349/3
  const gerrit = url.match(/\/\+\/(\d+)(?:\/\d+)?\/?$/)
  if (gerrit && /review\./.test(url)) {
    return { url, label: `Gerrit ${gerrit[1]}`, provider: 'gerrit' }
  }

  // GitHub PR: https://github.com/<org>/<repo>/pull/123
  const gh = url.match(/github\.com\/[^/]+\/[^/]+\/pull\/(\d+)/)
  if (gh) {
    return { url, label: `PR #${gh[1]}`, provider: 'github' }
  }

  return { url, label: 'Change', provider: 'other' }
}

/** First 7 characters of a git SHA, for compact display. */
export function shortRevision(revision: string | null | undefined): string | null {
  if (!revision || revision.trim() === '') return null
  return revision.trim().slice(0, 7)
}
