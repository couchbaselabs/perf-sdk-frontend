const semver = require('semver');

export function versionCompare(version1: string, version2: string) {
    return semver.compare(version1, version2)
}
