import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/src/components/ui/pagination"

interface PaginationSectionProps {
  currentPage: number
  totalPages: number
  setCurrentPage: (page: number) => void
}

export function PaginationSection({ currentPage, totalPages, setCurrentPage }: PaginationSectionProps) {
  if (totalPages <= 1) return null

  return (
    <div className="mt-4 flex justify-center">
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              onClick={() => setCurrentPage(Math.max(currentPage - 1, 1))}
              className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
            />
          </PaginationItem>

          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let pageNum = i + 1
            if (totalPages > 5) {
              if (currentPage > 3 && i === 0) {
                pageNum = 1
              } else if (currentPage > 3 && i === 1) {
                return (
                  <PaginationItem key="ellipsis-1">
                    <PaginationEllipsis />
                  </PaginationItem>
                )
              } else if (currentPage > 3 && i >= 2) {
                pageNum = currentPage + i - 2
              }

              if (pageNum > totalPages) return null
            }

            return (
              <PaginationItem key={pageNum}>
                <PaginationLink 
                  isActive={currentPage === pageNum} 
                  onClick={() => setCurrentPage(pageNum)}
                  className="cursor-pointer"
                >
                  {pageNum}
                </PaginationLink>
              </PaginationItem>
            )
          })}

          {totalPages > 5 && currentPage < totalPages - 2 && (
            <PaginationItem>
              <PaginationEllipsis />
            </PaginationItem>
          )}

          {totalPages > 5 && currentPage < totalPages - 1 && (
            <PaginationItem>
              <PaginationLink onClick={() => setCurrentPage(totalPages)} className="cursor-pointer">
                {totalPages}
              </PaginationLink>
            </PaginationItem>
          )}

          <PaginationItem>
            <PaginationNext
              onClick={() => setCurrentPage(Math.min(currentPage + 1, totalPages))}
              className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  )
}
