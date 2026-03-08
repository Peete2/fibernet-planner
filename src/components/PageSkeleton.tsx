import { Skeleton } from "@/components/ui/skeleton";

interface PageSkeletonProps {
  variant?: "dashboard" | "admin" | "profile" | "tech";
}

function StatCardSkeleton() {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <Skeleton className="h-4 w-24 mb-3" />
      <Skeleton className="h-8 w-16 mb-2" />
      <Skeleton className="h-3 w-32" />
    </div>
  );
}

function TableRowSkeleton() {
  return (
    <div className="flex items-center gap-4 py-3 px-4">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-4 w-20" />
      <Skeleton className="h-4 w-16" />
      <Skeleton className="h-6 w-20 rounded-full" />
      <Skeleton className="h-4 w-24 ml-auto" />
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-3 w-24" />
    </div>
  );
}

export default function PageSkeleton({ variant = "dashboard" }: PageSkeletonProps) {
  return (
    <div className="pt-20 min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Skeleton className="h-9 w-64 mb-2" />
          <Skeleton className="h-4 w-48" />
        </div>

        {/* Stat cards */}
        {variant !== "profile" && (
          <div className={`grid gap-4 mb-8 ${variant === "admin" ? "grid-cols-2 md:grid-cols-4" : "grid-cols-1 sm:grid-cols-3"}`}>
            {Array.from({ length: variant === "admin" ? 4 : 3 }).map((_, i) => (
              <StatCardSkeleton key={i} />
            ))}
          </div>
        )}

        {/* Profile form skeleton */}
        {variant === "profile" && (
          <div className="max-w-lg mx-auto space-y-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-10 w-full rounded-md" />
              </div>
            ))}
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
        )}

        {/* Content area */}
        {(variant === "dashboard" || variant === "tech") && (
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        )}

        {/* Admin table skeleton */}
        {variant === "admin" && (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="flex items-center gap-3 p-4 border-b border-border">
              <Skeleton className="h-9 w-48" />
              <Skeleton className="h-9 w-32" />
            </div>
            {Array.from({ length: 6 }).map((_, i) => (
              <TableRowSkeleton key={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
