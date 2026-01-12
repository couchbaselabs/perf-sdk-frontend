"use client"

import { Checkbox } from "@/src/components/ui/checkbox"
import { Label } from "@/src/components/ui/label"
import VersionSelector from "@/src/components/shared/version-selector"
import { Badge } from "@/src/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/src/components/ui/tooltip"
import { Button } from "@/src/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/components/ui/card"
import { getClusterVersionById, getAvailableClusterVersions } from "@/src/lib/cluster-version-service"

interface FiltersSectionProps {
  selectedClusterVersions: string[]
  onClusterVersionsChange: (versions: string[]) => void
  excludeSnapshots: boolean
  onExcludeSnapshotsChange: (checked: boolean) => void
}

export function FiltersSection({
  selectedClusterVersions,
  onClusterVersionsChange,
  excludeSnapshots,
  onExcludeSnapshotsChange
}: FiltersSectionProps) {
  return (
    <div className="grid grid-cols-1 gap-4 mb-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Cluster Versions</CardTitle>
          <CardDescription>Select cluster versions to compare</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3">
            <VersionSelector
              title="Cluster Versions"
              selectedVersions={selectedClusterVersions}
              onChange={onClusterVersionsChange}
              maxSelections={3}
              fetchVersions={async () => {
                const versions = await getAvailableClusterVersions()
                return versions.map((version: any) => ({
                  id: version.id,
                  name: version.name,
                  color: version.color
                }))
              }}
              placeholder="Select Cluster Versions"
            />

            {selectedClusterVersions.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {selectedClusterVersions.map((version) => {
                  const clusterInfo = getClusterVersionById(version)
                  return (
                    <Badge
                      key={version}
                      variant="outline"
                      className="flex items-center gap-1 px-3 py-1"
                      style={{ borderColor: clusterInfo?.color }}
                    >
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: clusterInfo?.color }} />
                      <span>Cluster {clusterInfo?.name}</span>
                    </Badge>
                  )
                })}
              </div>
            )}

            <div className="flex items-center space-x-2 pt-2 border-t">
              <Checkbox
                id="exclude-snapshots"
                checked={excludeSnapshots}
                onCheckedChange={onExcludeSnapshotsChange}
              />
              <Label htmlFor="exclude-snapshots" className="text-sm">
                Exclude snapshot versions
              </Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="ml-1 w-4 h-4 rounded-full bg-muted flex items-center justify-center text-xs text-muted-foreground cursor-help">
                      ?
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Snapshot versions contain "-" in the name (e.g., 3.0.7-20230518.191528-26)</p>
                    <p>Regular versions are stable releases (e.g., 3.0.7)</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
