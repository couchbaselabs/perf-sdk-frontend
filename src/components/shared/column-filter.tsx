"use client"

import { useState, useEffect } from "react"
import { Button } from "@/src/components/ui/button"
import { Input } from "@/src/components/ui/input"
import { Badge } from "@/src/components/ui/badge"
import { Calendar, Filter, X } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/src/components/ui/popover"
import { Checkbox } from "@/src/components/ui/checkbox"
import { Label } from "@/src/components/ui/label"
import { Slider } from "@/src/components/ui/slider"
import { Calendar as CalendarComponent } from "@/src/components/ui/calendar"

interface ColumnFilterProps {
  type?: 'date' | 'number' | 'enum' | 'string' | 'boolean'
  column?: string
  options?: Array<string> | Array<{ label: string; value: string }>
  range?: { min: number; max: number }
  onFilterChange?: (column: string, value: any) => void
  activeFilters?: Record<string, any>
  // List mode (alternative API used by situational page)
  title?: string
  selectedValues?: string[]
  onSelectionChange?: (values: string[]) => void
}

// Extracted ColumnFilter component
export const ColumnFilter = ({ type, column, options, range, onFilterChange, activeFilters = {}, title, selectedValues, onSelectionChange }: ColumnFilterProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({})
  const [numberRange, setNumberRange] = useState<[number, number]>([
    range?.min ?? 0, 
    range?.max ?? 100
  ])
  const [searchTerm, setSearchTerm] = useState("")
  const [showAll, setShowAll] = useState(false)

  const columnLabel = title ?? column ?? 'Value'
  const isListMode = Array.isArray(selectedValues) && typeof onSelectionChange === 'function'

  // Update number range when range prop changes
  useEffect(() => {
    if (range && range.min !== undefined && range.max !== undefined) {
      setNumberRange([range.min, range.max])
    }
  }, [range?.min, range?.max])

    if (type === "date") {
    return (
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
            <Calendar className="h-3.5 w-3.5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Filter by Date Range</h4>
              {activeFilters?.[column as string] && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    onFilterChange && column && onFilterChange(column, null)
                    setDateRange({})
                    setIsOpen(false)
                  }}
                >
                  Clear
                </Button>
              )}
            </div>
            
            <p className="text-xs text-muted-foreground">
              Select a date range to filter runs by when they were started
            </p>
            
            <div className="space-y-2">
              <Label className="text-xs">From Date</Label>
              <Input
                type="date"
                value={dateRange.from ? dateRange.from.toISOString().split('T')[0] : ''}
                onChange={(e) => {
                  const date = e.target.value ? new Date(e.target.value) : undefined
                  setDateRange(prev => ({ ...prev, from: date }))
                }}
                className="text-xs"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-xs">To Date</Label>
              <Input
                type="date"
                value={dateRange.to ? dateRange.to.toISOString().split('T')[0] : ''}
                onChange={(e) => {
                  const date = e.target.value ? new Date(e.target.value) : undefined
                  setDateRange(prev => ({ ...prev, to: date }))
                }}
                className="text-xs"
              />
            </div>

            <Button
              onClick={() => {
                if (dateRange.from || dateRange.to) {
                  onFilterChange && column && onFilterChange(column as string, dateRange)
                }
                setIsOpen(false)
              }}
              className="w-full"
              size="sm"
            >
              Apply Filter
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    )
  }

  if (type === "number") {
    return (
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
            <Filter className="h-3.5 w-3.5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-0" align="end">
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Filter by {columnLabel}</h4>
              {activeFilters?.[column as string] && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    onFilterChange && column && onFilterChange(column, null)
                    if (range) {
                      setNumberRange([range.min, range.max])
                    }
                    setIsOpen(false)
                  }}
                >
                  Clear
                </Button>
              )}
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{numberRange[0]}</span>
                <span>{numberRange[1]}</span>
              </div>
              <Slider
                min={range?.min ?? 0}
                max={range?.max ?? 100}
                step={1}
                value={numberRange}
                onValueChange={(value) => setNumberRange(value as [number, number])}
                className="w-full"
              />
            </div>

            <Button
              onClick={() => {
                onFilterChange && column && onFilterChange(column as string, { min: numberRange[0], max: numberRange[1] })
                setIsOpen(false)
              }}
              className="w-full"
              size="sm"
            >
              Apply Filter
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    )
  }

  if (type === "boolean") {
    const current = (column && activeFilters?.[column as string]) as boolean | undefined
    return (
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
            <Filter className="h-3.5 w-3.5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-0" align="end">
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Filter by {columnLabel}</h4>
              {current !== undefined && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { onFilterChange && column && onFilterChange(column, null); setIsOpen(false) }}
                >
                  Clear
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant={current === true ? "default" : "outline"}
                size="sm"
                onClick={() => { onFilterChange && column && onFilterChange(column, true); setIsOpen(false) }}
              >
                Yes
              </Button>
              <Button
                variant={current === false ? "default" : "outline"}
                size="sm"
                onClick={() => { onFilterChange && column && onFilterChange(column, false); setIsOpen(false) }}
              >
                No
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    )
  }

  // Handle enum/string types
  const normalizedOptions = (options ?? []).map((opt: any) => {
    if (typeof opt === 'string') return { label: opt, value: opt }
    return opt
  })
  const filteredOptions = normalizedOptions.filter((option: any) => 
    String(option.label).toLowerCase().includes(searchTerm.toLowerCase())
  )

  const displayOptions = showAll ? filteredOptions : filteredOptions.slice(0, 10)

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
          <Filter className="h-3.5 w-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="end">
        <div className="p-4 space-y-4 max-h-80 overflow-y-auto">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Filter by {columnLabel}</h4>
            {isListMode ? (
              (selectedValues && selectedValues.length > 0) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    onSelectionChange && onSelectionChange([])
                    setIsOpen(false)
                  }}
                >
                  Clear
                </Button>
              )
            ) : (
              activeFilters?.[column as string] && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    onFilterChange && column && onFilterChange(column, null)
                    setIsOpen(false)
                  }}
                >
                  Clear
                </Button>
              )
            )}
          </div>

                <Input
                  placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="text-xs"
          />
          
          <div className="space-y-2">
            {displayOptions.map((option: any) => {
              const optionKey = String(option.value)
              const optionDisplay = String(option.label)
              const isSelected = isListMode
                ? (selectedValues as string[]).includes(option.value)
                : (Array.isArray(activeFilters?.[column as string]) 
                    ? (activeFilters?.[column as string] as any[]).includes(option.value)
                    : activeFilters?.[column as string] === option.value)
              
              return (
                <div key={optionKey} className="flex items-center space-x-2">
                      <Checkbox
                    id={`${column}-${optionKey}`}
                    checked={isSelected}
                    onCheckedChange={(checked) => {
                      if (isListMode) {
                        const curr = selectedValues as string[]
                        const newVals = checked ? [...curr, option.value] : curr.filter((v) => v !== option.value)
                        onSelectionChange && onSelectionChange(newVals)
                      } else {
                        let newValue
                        const curr = activeFilters?.[column as string]
                        if (checked) {
                          newValue = Array.isArray(curr)
                            ? [...curr, option.value]
                            : [option.value]
                        } else {
                          newValue = Array.isArray(curr)
                            ? curr.filter((v: any) => v !== option.value)
                            : null
                        }
                        onFilterChange && column && onFilterChange(column, newValue && newValue.length > 0 ? newValue : null)
                      }
                    }}
                  />
                  <Label 
                    htmlFor={`${column}-${optionKey}`}
                    className="text-xs font-normal cursor-pointer flex-1"
                  >
                    {optionDisplay}
                  </Label>
                </div>
              )
            })}
            
            {filteredOptions.length > 10 && !showAll && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAll(true)}
                className="w-full text-xs"
              >
                Show all ({filteredOptions.length})
              </Button>
            )}
            
            {showAll && (
                      <Button
                        variant="ghost"
                        size="sm"
                onClick={() => setShowAll(false)}
                className="w-full text-xs"
                      >
                Show less
                      </Button>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
