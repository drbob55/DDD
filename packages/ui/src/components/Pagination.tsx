import React from 'react'
import { cn } from '../lib/utils'
import { Button } from './Button'

interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  className?: string
  showFirstLast?: boolean
  siblingCount?: number
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  className,
  showFirstLast = true,
  siblingCount = 1
}) => {
  const generatePages = () => {
    const pages: (number | string)[] = []
    const leftSibling = Math.max(currentPage - siblingCount, 1)
    const rightSibling = Math.min(currentPage + siblingCount, totalPages)

    const showLeftDots = leftSibling > 2
    const showRightDots = rightSibling < totalPages - 1

    if (showFirstLast || leftSibling === 1) {
      pages.push(1)
    }

    if (showLeftDots) {
      pages.push('...')
    }

    for (let i = leftSibling; i <= rightSibling; i++) {
      if (i !== 1 && i !== totalPages) {
        pages.push(i)
      }
    }

    if (showRightDots) {
      pages.push('...')
    }

    if (showFirstLast || rightSibling === totalPages) {
      if (totalPages > 1) {
        pages.push(totalPages)
      }
    }

    return pages
  }

  const pages = generatePages()

  return (
    <nav className={cn("flex items-center space-x-2", className)}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
      >
        Previous
      </Button>

      {pages.map((page, index) => {
        if (page === '...') {
          return (
            <span key={`dots-${index}`} className="px-3 py-1">
              ...
            </span>
          )
        }

        return (
          <Button
            key={page}
            variant={currentPage === page ? 'primary' : 'outline'}
            size="sm"
            onClick={() => onPageChange(page as number)}
          >
            {page}
          </Button>
        )
      })}

      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
      >
        Next
      </Button>
    </nav>
  )
}

export const SimplePagination: React.FC<Omit<PaginationProps, 'siblingCount' | 'showFirstLast'>> = (props) => (
  <Pagination {...props} showFirstLast={false} siblingCount={0} />
)
