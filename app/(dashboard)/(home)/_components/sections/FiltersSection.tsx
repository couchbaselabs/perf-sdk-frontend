"use client"

import { useState, useEffect } from "react"
import { Checkbox } from "@/src/components/ui/checkbox"
import { Label } from "@/src/components/ui/label"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/src/components/ui/tooltip"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/src/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/components/ui/card"
import { getClusterVersionById, getAvailableClusterVersions } from "@/src/lib/cluster-version-service"
import type { ClusterVersion } from "@/src/lib/cluster-version-service"

interface FiltersSectionProps {
  selectedClusterVersion: string
  onClusterVersionChange: (version: string) => void
  excludeSnapshots: boolean
  onExcludeSnapshotsChange: (checked: boolean) => void
}

export function FiltersSection({
  selectedClusterVersion,
  onClusterVersionChange,
  excludeSnapshots,
  onExcludeSnapshotsChange
}: FiltersSectionProps) {
  const [availableVersions, setAvailableVersions] = useState<ClusterVersion[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadVersions = async () => {
      try {
        setIsLoading(true)
        const versions = await getAvailableClusterVersions()
        setAvailableVersions(versions)
      } catch (err) {
        console.error('Error fetching cluster versions:', err)
      } finally {
        setIsLoading(false)
      }
    }
    loadVersions()
  }, [])

  const selectedInfo = getClusterVersionById(selectedClusterVersion)

  return (
    <div className="grid grid-cols-1 gap-4 mb-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Cluster Version</CardTitle>
          <CardDescription>Select the cluster version to view results for</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <Select
                value={selectedClusterVersion}
                onValueChange={onClusterVersionChange}
                disabled={isLoading}
              >
                <SelectTrigger className="w-[280px]">
                  <SelectValue placeholder={isLoading ? "Loading..." : "Select Cluster Version"} />
                </SelectTrigger>
                <SelectContent>
                  {availableVersions.map((version) => (
                    <SelectItem key={version.id} value={version.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full border"
                          style={{ backgroundColor: version.color }}
                        />
                        <span>Cluster {version.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedInfo && (
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: selectedInfo.color }}
                  />
                  <span>{selectedInfo.id}</span>
                </div>
              )}
            </div>

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
