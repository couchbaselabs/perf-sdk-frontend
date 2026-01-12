"use client"

import { useState } from "react"
import { Button } from "@/src/components/ui/button"
import { Checkbox } from "@/src/components/ui/checkbox"
import { Label } from "@/src/components/ui/label"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/src/components/ui/popover"
import { Badge } from "@/src/components/ui/badge"
import { ChevronDown, BarChart2, LineChart, RefreshCw } from "lucide-react"
import { Tabs, TabsList, TabsTrigger } from "@/src/components/ui/tabs"

interface ComparativeAnalysisControlsProps {
  onClusterVersionsChange: (versions: string[]) => void
  onSdkVersionsChange: (versions: string[]) => void
  onBaselineClusterChange: (version: string) => void
  onBaselineSdkChange: (version: string) => void
  onNormalizeDataChange: (normalize: boolean) => void
  onChartTypeChange: (type: "bar" | "grouped" | "stacked") => void
  onRefresh: () => void
  selectedClusterVersions: string[]
  selectedSdkVersions: string[]
  baselineClusterVersion: string
  baselineSdkVersion: string
  normalizeData: boolean
  chartType: "bar" | "grouped" | "stacked"
  availableClusterVersions: string[]
  availableSdkVersions: string[]
  isLoading?: boolean
}

export default function ComparativeAnalysisControls({
  onClusterVersionsChange,
  onSdkVersionsChange,
  onBaselineClusterChange,
  onBaselineSdkChange,
  onNormalizeDataChange,
  onChartTypeChange,
  onRefresh,
  selectedClusterVersions,
  selectedSdkVersions,
  baselineClusterVersion,
  baselineSdkVersion,
  normalizeData,
  chartType,
  availableClusterVersions,
  availableSdkVersions,
  isLoading = false,
}: ComparativeAnalysisControlsProps) {
  const [isClusterSelectOpen, setIsClusterSelectOpen] = useState(false)
  const [isSdkSelectOpen, setIsSdkSelectOpen] = useState(false)

  // Handle cluster version selection
  const handleClusterVersionToggle = (version: string, checked: boolean) => {
    if (checked) {
      onClusterVersionsChange([...selectedClusterVersions, version])
    } else {
      onClusterVersionsChange(selectedClusterVersions.filter((v) => v !== version))
    }
  }

  // Handle SDK version selection
  const handleSdkVersionToggle = (version: string, checked: boolean) => {
    if (checked) {
      onSdkVersionsChange([...selectedSdkVersions, version])
    } else {
      onSdkVersionsChange(selectedSdkVersions.filter((v) => v !== version))
    }
  }

  // Handle baseline cluster version change
  const handleBaselineClusterChange = (version: string) => {
    onBaselineClusterChange(version)
  }

  // Handle baseline SDK version change
  const handleBaselineSdkChange = (version: string) => {
    onBaselineSdkChange(version)
  }

  return (
    <div className="bg-white rounded-lg border shadow-sm p-4 mb-6">
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0 md:space-x-4">
        <div className="flex flex-col space-y-4 md:flex-row md:items-center md:space-y-0 md:space-x-4">
          {/* Cluster Version Selection */}
          <div>
            <Popover open={isClusterSelectOpen} onOpenChange={setIsClusterSelectOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="h-9 justify-between min-w-[200px]">
                  <span>Cluster Versions</span>
                  <div className="flex items-center">
                    {selectedClusterVersions.length > 0 && (
                      <Badge variant="secondary" className="mr-2">
                        {selectedClusterVersions.length}
                      </Badge>
                    )}
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </div>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[220px] p-0" align="start">
                <div className="p-4 border-b">
                  <div className="font-medium">Select Cluster Versions</div>
                  <div className="text-xs text-muted-foreground mt-1">Choose which cluster versions to compare</div>
                </div>
                <div className="p-4 max-h-[300px] overflow-auto">
                  {availableClusterVersions.map((version) => (
                    <div key={version} className="flex items-center space-x-2 mb-3">
                      <Checkbox
                        id={`cluster-${version}`}
                        checked={selectedClusterVersions.includes(version)}
                        onCheckedChange={(checked) => handleClusterVersionToggle(version, !!checked)}
                      />
                      <Label htmlFor={`cluster-${version}`} className="flex-1 text-sm cursor-pointer">
                        {version}
                      </Label>
                    </div>
                  ))}
                </div>
                <div className="p-4 border-t bg-muted/50">
                  <div className="font-medium text-sm mb-2">Baseline Version</div>
                  <Select value={baselineClusterVersion} onValueChange={handleBaselineClusterChange}>
                    <SelectTrigger className="h-8 w-full">
                      <SelectValue placeholder="Select baseline" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Cluster Versions</SelectLabel>
                        {selectedClusterVersions.map((version) => (
                          <SelectItem key={`baseline-${version}`} value={version}>
                            {version}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* SDK Version Selection */}
          <div>
            <Popover open={isSdkSelectOpen} onOpenChange={setIsSdkSelectOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="h-9 justify-between min-w-[200px]">
                  <span>SDK Versions</span>
                  <div className="flex items-center">
                    {selectedSdkVersions.length > 0 && (
                      <Badge variant="secondary" className="mr-2">
                        {selectedSdkVersions.length}
                      </Badge>
                    )}
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </div>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[220px] p-0" align="start">
                <div className="p-4 border-b">
                  <div className="font-medium">Select SDK Versions</div>
                  <div className="text-xs text-muted-foreground mt-1">Choose which SDK versions to compare</div>
                </div>
                <div className="p-4 max-h-[300px] overflow-auto">
                  {availableSdkVersions.map((version) => (
                    <div key={version} className="flex items-center space-x-2 mb-3">
                      <Checkbox
                        id={`sdk-${version}`}
                        checked={selectedSdkVersions.includes(version)}
                        onCheckedChange={(checked) => handleSdkVersionToggle(version, !!checked)}
                      />
                      <Label htmlFor={`sdk-${version}`} className="flex-1 text-sm cursor-pointer">
                        {version}
                      </Label>
                    </div>
                  ))}
                </div>
                <div className="p-4 border-t bg-muted/50">
                  <div className="font-medium text-sm mb-2">Baseline Version</div>
                  <Select value={baselineSdkVersion} onValueChange={handleBaselineSdkChange}>
                    <SelectTrigger className="h-8 w-full">
                      <SelectValue placeholder="Select baseline" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>SDK Versions</SelectLabel>
                        {selectedSdkVersions.map((version) => (
                          <SelectItem key={`baseline-${version}`} value={version}>
                            {version}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Normalize Data Toggle */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="normalize-data"
              checked={normalizeData}
              onCheckedChange={(checked) => onNormalizeDataChange(!!checked)}
            />
            <Label htmlFor="normalize-data" className="text-sm cursor-pointer">
              Normalize Data
            </Label>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Chart Type Selection */}
          <Tabs
            value={chartType}
            onValueChange={(value) => onChartTypeChange(value as "bar" | "grouped" | "stacked")}
            className="h-9"
          >
            <TabsList className="h-9">
              <TabsTrigger value="bar" className="h-8 px-3">
                <BarChart2 className="h-4 w-4 mr-1" />
                <span className="sr-only md:not-sr-only md:inline-block">Bar</span>
              </TabsTrigger>
              <TabsTrigger value="grouped" className="h-8 px-3">
                <BarChart2 className="h-4 w-4 mr-1" />
                <span className="sr-only md:not-sr-only md:inline-block">Grouped</span>
              </TabsTrigger>
              <TabsTrigger value="stacked" className="h-8 px-3">
                <LineChart className="h-4 w-4 mr-1" />
                <span className="sr-only md:not-sr-only md:inline-block">Stacked</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Refresh Button */}
          <Button variant="outline" size="sm" className="h-9" onClick={onRefresh} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Selected Versions Display */}
      {(selectedClusterVersions.length > 0 || selectedSdkVersions.length > 0) && (
        <div className="mt-4 flex flex-wrap gap-2">
          {selectedClusterVersions.map((version) => (
            <Badge
              key={`selected-cluster-${version}`}
              variant="outline"
              className={version === baselineClusterVersion ? "border-primary text-primary" : ""}
            >
              Cluster: {version}
              {version === baselineClusterVersion && " (Baseline)"}
            </Badge>
          ))}
          {selectedSdkVersions.map((version) => (
            <Badge
              key={`selected-sdk-${version}`}
              variant="outline"
              className={version === baselineSdkVersion ? "border-primary text-primary" : ""}
            >
              SDK: {version}
              {version === baselineSdkVersion && " (Baseline)"}
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}
