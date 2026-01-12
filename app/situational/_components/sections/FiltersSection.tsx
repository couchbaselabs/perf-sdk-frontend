import { Button } from "@/src/components/ui/button"
import { Input } from "@/src/components/ui/input"
import { RefreshCw, Search, X } from "lucide-react"

interface FiltersSectionProps {
  searchQuery: string
  setSearchQuery: (query: string) => void
  activeFilterCount: number
  clearAllFilters: () => void
  handleRefresh: () => void
  isLoading: boolean
  loading: boolean
}

export function FiltersSection({
  searchQuery,
  setSearchQuery,
  activeFilterCount,
  clearAllFilters,
  handleRefresh,
  isLoading,
  loading
}: FiltersSectionProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-center gap-4 mb-6">
      <div className="relative flex-1">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search by ID..."
          className="pl-8"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSearchQuery("")}
            className="absolute right-1 top-1 h-6 w-6 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2">
        {activeFilterCount > 0 && (
          <Button variant="outline" size="sm" onClick={clearAllFilters} className="gap-1 border-orange-200 text-orange-700 hover:bg-orange-50">
            <X className="h-3.5 w-3.5" />
            Clear filters ({activeFilterCount})
          </Button>
        )}
        <Button variant="outline" size="sm" className="gap-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50" onClick={handleRefresh} disabled={isLoading || loading}>
          <RefreshCw className={`h-4 w-4 ${isLoading || loading ? "animate-spin" : ""}`} />
          {isLoading || loading ? "Loading..." : "Refresh"}
        </Button>
      </div>
    </div>
  )
}
