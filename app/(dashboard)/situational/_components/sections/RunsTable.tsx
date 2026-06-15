import { Badge } from "@/src/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/src/components/ui/table"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/src/components/ui/tooltip"
import { ColumnFilter } from "@/src/components/shared/column-filter"
import Link from "next/link"
import { formatDate } from "@/src/lib/utils/formatting"
import { getEnvironmentBadgeVariant, getScoreBadgeColor, getAggregateScoreBadgeClass } from "@/src/lib/utils/status"
import { getSdkColorByLanguage } from "@/src/lib/sdk-version-service"
import { SdkBadge, VersionBadge, EnvironmentBadge, ScoreBadge } from "@/src/components/shared/BadgeSystem"
import { getIdLinkColor, MixedProperty } from "../../ui-helpers"
import { SituationalRun } from "@/src/types/entities"

interface RunsTableProps {
  currentRuns: SituationalRun[]
  activeFilterCount: number
  sortColumn: string
  sortDirection: 'asc' | 'desc'
  columnFilters: Record<string, any>
  uniqueValues: Record<string, string[]>
  ranges: Record<string, { min: number; max: number }>
  handleSort: (column: string) => void
  handleFilterChange: (column: string, value: any) => void
}

export function RunsTable({
  currentRuns,
  activeFilterCount,
  sortColumn,
  sortDirection,
  columnFilters,
  uniqueValues,
  ranges,
  handleSort,
  handleFilterChange
}: RunsTableProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50/80 border-slate-200">
            <TableHead className="w-[300px]">
              <div className="flex items-center justify-between">
                <span 
                  className={`cursor-pointer hover:text-primary ${sortColumn === 'id' ? 'text-primary font-medium' : ''}`}
                  onClick={() => handleSort('id')}
                >
                  Situational Run {sortColumn === 'id' && (sortDirection === 'asc' ? '↑' : '↓')}
                </span>
              </div>
            </TableHead>
            <TableHead>
              <div className="flex items-center justify-between">
                <span 
                  className={`cursor-pointer hover:text-primary ${sortColumn === 'started' ? 'text-primary font-medium' : ''} ${columnFilters.started ? 'text-primary font-medium' : ''}`}
                  onClick={() => handleSort('started')}
                >
                  Started {sortColumn === 'started' && (sortDirection === 'asc' ? '↑' : '↓')}
                </span>
                <ColumnFilter
                  type="date"
                  column="started"
                  onFilterChange={handleFilterChange}
                  activeFilters={columnFilters}
                />
              </div>
            </TableHead>
            <TableHead>
              <div className="flex items-center justify-between">
                <span 
                  className={`cursor-pointer hover:text-primary ${sortColumn === 'score' ? 'text-primary font-medium' : ''} ${columnFilters.score ? 'text-primary font-medium' : ''}`}
                  onClick={() => handleSort('score')}
                >
                  Score {sortColumn === 'score' && (sortDirection === 'asc' ? '↑' : '↓')}
                </span>
                <ColumnFilter
                  type="number"
                  column="score"
                  range={ranges.score}
                  onFilterChange={handleFilterChange}
                  activeFilters={columnFilters}
                />
              </div>
            </TableHead>
            <TableHead>
              <div className="flex items-center justify-between">
                <span 
                  className={`cursor-pointer hover:text-primary ${sortColumn === 'runs' ? 'text-primary font-medium' : ''} ${columnFilters.runs ? 'text-primary font-medium' : ''}`}
                  onClick={() => handleSort('runs')}
                >
                  Runs {sortColumn === 'runs' && (sortDirection === 'asc' ? '↑' : '↓')}
                </span>
                <ColumnFilter
                  type="number"
                  column="runs"
                  range={ranges.runs}
                  onFilterChange={handleFilterChange}
                  activeFilters={columnFilters}
                />
              </div>
            </TableHead>
            <TableHead>
              <div className="flex items-center justify-between">
                <span 
                  className={`cursor-pointer hover:text-primary ${sortColumn === 'sdk' ? 'text-primary font-medium' : ''} ${columnFilters.sdk ? 'text-primary font-medium' : ''}`}
                  onClick={() => handleSort('sdk')}
                >
                  SDK {sortColumn === 'sdk' && (sortDirection === 'asc' ? '↑' : '↓')}
                </span>
                <ColumnFilter
                  type="string"
                  column="sdk"
                  options={uniqueValues.sdk}
                  onFilterChange={handleFilterChange}
                  activeFilters={columnFilters}
                />
              </div>
            </TableHead>
            <TableHead>
              <div className="flex items-center justify-between">
                <span 
                  className={`cursor-pointer hover:text-primary ${sortColumn === 'version' ? 'text-primary font-medium' : ''} ${columnFilters.version ? 'text-primary font-medium' : ''}`}
                  onClick={() => handleSort('version')}
                >
                  Version {sortColumn === 'version' && (sortDirection === 'asc' ? '↑' : '↓')}
                </span>
                <ColumnFilter
                  type="string"
                  column="version"
                  options={uniqueValues.version}
                  onFilterChange={handleFilterChange}
                  activeFilters={columnFilters}
                />
              </div>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {currentRuns.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center">
                {activeFilterCount > 0 ? (
                  <>No situational runs match the current filters.</>
                ) : (
                  <>No situational runs found.</>
                )}
              </TableCell>
            </TableRow>
          ) : (
            currentRuns.map((run) => (
              <TableRow key={run.id} className="hover:bg-gradient-to-r hover:from-slate-50 hover:to-slate-100/50 transition-all duration-200 border-slate-100">
                <TableCell className="font-medium">
                  <Link 
                    href={`/situational/${run.id}`} 
                    className={`font-mono text-xs font-medium ${getIdLinkColor()}`}
                  >
                    {run.id}
                  </Link>
                </TableCell>
                <TableCell className="text-slate-700">{formatDate(String(run.started))}</TableCell>
                <TableCell>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div 
                          className={`inline-flex items-center rounded-md font-mono font-bold text-sm px-3 py-1 transition-all duration-200 hover:scale-105 cursor-help ${getAggregateScoreBadgeClass(run.score as any, run.runs as any)}`}
                          style={{ minWidth: 56, justifyContent: 'center' }}
                        >
                          {Number(run.score)}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs">
                        <div className="text-center">
                          <p className="font-medium">
                            {Number(run.score) === Number(run.runs) * 100 ? '✅ Perfect Score' : '❌ Issues Found'}
                          </p>
                          <p className="text-xs mt-1">
                            {Number(run.score) === Number(run.runs) * 100
                              ? `All ${Number(run.runs)} individual run${Number(run.runs) > 1 ? 's' : ''} passed successfully`
                              : `${Number(run.runs)} run${Number(run.runs) > 1 ? 's' : ''} with aggregate score of ${Number(run.score)}`}
                          </p>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </TableCell>
                <TableCell className="text-slate-700 font-medium">{run.runs}</TableCell>
                <TableCell>
                  <SdkBadge value={Array.isArray(run.sdk) ? run.sdk[0] : run.sdk} />
                </TableCell>
                <TableCell className="text-slate-600"><MixedProperty value={run.version as any} /></TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
