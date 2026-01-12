"use client"

import { useState, useEffect } from "react"
import { Checkbox } from "@/src/components/ui/checkbox"
import { Label } from "@/src/components/ui/label"
import { Badge } from "@/src/components/ui/badge"
import { Button } from "@/src/components/ui/button"
import { ChevronDown, Info } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/src/components/ui/popover"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/src/components/ui/tooltip"
import { Skeleton } from "@/src/components/ui/skeleton"

interface Version {
  id: string
  name: string
  color?: string
}

interface VersionSelectorProps {
  title: string
  selectedVersions: string[]
  onChange: (selectedVersions: string[]) => void
  maxSelections?: number
  fetchVersions: () => Promise<Version[]>
  placeholder?: string
}

export default function VersionSelector({
  title,
  selectedVersions,
  onChange,
  maxSelections = 5,
  fetchVersions,
  placeholder
}: VersionSelectorProps) {
  const [open, setOpen] = useState(false)
  const [availableVersions, setAvailableVersions] = useState<Version[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch available versions on component mount
  useEffect(() => {
    const loadVersions = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const versions = await fetchVersions()
        setAvailableVersions(versions)
      } catch (err) {
        console.error(`Error fetching ${title.toLowerCase()}:`, err)
        setError(`Failed to load ${title.toLowerCase()}`)
      } finally {
        setIsLoading(false)
      }
    }

    loadVersions()
  }, [fetchVersions, title])

  const handleVersionChange = (versionId: string, checked: boolean) => {
    if (checked) {
      if (selectedVersions.length >= maxSelections) {
        return
      }
      onChange([...selectedVersions, versionId])
    } else {
      onChange(selectedVersions.filter(id => id !== versionId))
    }
  }

  const getSelectedVersionsDisplay = () => {
    if (selectedVersions.length === 0) {
      return placeholder || `Select ${title}`
    }
    
    if (selectedVersions.length === 1) {
      const version = availableVersions.find(v => v.id === selectedVersions[0])
      return version?.name || selectedVersions[0]
    }
    
    return `${selectedVersions.length} ${title} selected`
  }

  const clearAll = () => {
    onChange([])
  }

  const selectAll = () => {
    const allIds = availableVersions.slice(0, maxSelections).map(v => v.id)
    onChange(allIds)
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Label className="text-sm font-medium">{title}</Label>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Select up to {maxSelections} {title.toLowerCase()} to compare</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        
        {selectedVersions.length > 0 && (
          <Badge variant="secondary" className="text-xs">
            {selectedVersions.length}/{maxSelections}
          </Badge>
        )}
      </div>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button 
            variant="outline" 
            className="w-full justify-between text-left"
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 bg-gray-300 rounded-full animate-pulse" />
                <span>Loading...</span>
              </div>
            ) : (
              <span className="truncate">{getSelectedVersionsDisplay()}</span>
            )}
            <ChevronDown className="h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        
        <PopoverContent className="w-80 p-0" align="start">
          <div className="p-4 border-b">
            <h4 className="font-semibold text-sm">{title}</h4>
            <p className="text-xs text-muted-foreground">
              Select up to {maxSelections} {title.toLowerCase()} to compare
            </p>
          </div>
          
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center space-x-3">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-4 w-24" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="p-4 text-sm text-red-600">
              {error}
            </div>
          ) : (
            <>
              <div className="p-2 border-b flex justify-between">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={selectAll}
                  disabled={availableVersions.length === 0}
                >
                  Select All
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={clearAll}
                  disabled={selectedVersions.length === 0}
                >
                  Clear All
                </Button>
              </div>
              
              <div className="max-h-60 overflow-y-auto">
                {availableVersions.map((version) => {
                  const isSelected = selectedVersions.includes(version.id)
                  const canSelect = isSelected || selectedVersions.length < maxSelections
                  
                  return (
                    <div 
                      key={version.id} 
                      className={`flex items-center space-x-3 p-3 hover:bg-gray-50 ${!canSelect ? 'opacity-50' : ''}`}
                    >
                      <Checkbox
                        id={version.id}
                        checked={isSelected}
                        onCheckedChange={(checked) => handleVersionChange(version.id, !!checked)}
                        disabled={!canSelect}
                      />
                      <Label
                        htmlFor={version.id}
                        className={`flex-1 text-sm cursor-pointer ${!canSelect ? 'cursor-not-allowed' : ''}`}
                      >
                        <div className="flex items-center gap-2">
                          {version.color && (
                            <div 
                              className="w-3 h-3 rounded-full border"
                              style={{ backgroundColor: version.color }}
                            />
                          )}
                          <span>{version.name}</span>
                        </div>
                      </Label>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </PopoverContent>
      </Popover>
      

    </div>
  )
}
