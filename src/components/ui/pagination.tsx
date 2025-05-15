import * as React from "react"
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react"

import { cn } from "@/lib/utils"
import { ButtonProps, Button } from "@/components/ui/button"

const Pagination = ({ className, ...props }: React.ComponentProps<"nav">) => (
  <nav
    role="navigation"
    aria-label="pagination"
    className={cn("mx-auto flex w-full justify-center mt-6", className)}
    {...props}
  />
)
Pagination.displayName = "Pagination"

const PaginationContent = React.forwardRef<
  HTMLUListElement,
  React.ComponentProps<"ul">
>(({ className, ...props }, ref) => (
  <ul
    ref={ref}
    className={cn("flex flex-row items-center gap-2", className)}
    {...props}
  />
))
PaginationContent.displayName = "PaginationContent"

const PaginationItem = React.forwardRef<
  HTMLLIElement,
  React.ComponentProps<"li">
>(({ className, ...props }, ref) => (
  <li ref={ref} className={cn("", className)} {...props} />
))
PaginationItem.displayName = "PaginationItem"

// 自定义PaginationLink类型，避免a标签与Button的冲突
type PaginationLinkProps = {
  isActive?: boolean;
  size?: "default" | "sm" | "lg";
  className?: string;
  onClick?: () => void;
  children?: React.ReactNode;
};

const PaginationLink = ({
  className,
  isActive,
  size = "default",
  onClick,
  children
}: PaginationLinkProps) => (
  <Button
    aria-current={isActive ? "page" : undefined}
    variant={isActive ? "default" : "outline"}
    size={size}
    className={cn(
      "min-w-9 h-9 rounded-md transition-all duration-200 hover:scale-105",
      {
        "pointer-events-none bg-blue-600 text-white font-medium shadow-md": isActive,
        "hover:bg-gray-100 hover:border-gray-300": !isActive,
      },
      className
    )}
    onClick={onClick}
    type="button"
  >
    {children}
  </Button>
)
PaginationLink.displayName = "PaginationLink"

const PaginationPrevious = ({
  className,
  onClick
}: {
  className?: string;
  onClick?: () => void;
}) => (
  <PaginationLink
    className={cn("gap-1 px-3 rounded-md font-medium hover:bg-blue-50", className)}
    onClick={onClick}
  >
    <ChevronLeft className="h-4 w-4" />
    <span>上一页</span>
  </PaginationLink>
)
PaginationPrevious.displayName = "PaginationPrevious"

const PaginationNext = ({
  className,
  onClick
}: {
  className?: string;
  onClick?: () => void;
}) => (
  <PaginationLink
    className={cn("gap-1 px-3 rounded-md font-medium hover:bg-blue-50", className)}
    onClick={onClick}
  >
    <span>下一页</span>
    <ChevronRight className="h-4 w-4" />
  </PaginationLink>
)
PaginationNext.displayName = "PaginationNext"

const PaginationEllipsis = ({
  className,
  ...props
}: React.ComponentProps<"span">) => (
  <span
    aria-hidden
    className={cn("flex h-9 w-9 items-center justify-center text-gray-400", className)}
    {...props}
  >
    <MoreHorizontal className="h-4 w-4" />
    <span className="sr-only">更多页</span>
  </span>
)
PaginationEllipsis.displayName = "PaginationEllipsis"

export {
  Pagination,
  PaginationContent,
  PaginationLink,
  PaginationItem,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
} 