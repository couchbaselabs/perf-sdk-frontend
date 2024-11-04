const semver = require('semver');

export function versionCompare(version1: string, version2: string) {
    return semver.compare(normalizeVersion(version1), normalizeVersion(version2))
}

/**
 * Normalizes a version string to make it compatible with semver.
 * E.g. handles "1.0.3-20241025.022106+960bdda", where the ".0" is illegal.
 * @param version - The version string to normalize.
 * @returns The normalized version string.
 */
function normalizeVersion(version: string): string {
    return version.replace(/\.0(\d{5})/, '-$1');
}
