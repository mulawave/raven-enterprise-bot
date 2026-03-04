export default function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-8 bg-gradient-to-r from-slate-200 via-slate-300 to-slate-200 rounded-lg w-64 animate-shimmer"></div>
          <div className="h-4 bg-gradient-to-r from-slate-200 via-slate-300 to-slate-200 rounded w-32 animate-shimmer"></div>
        </div>
        <div className="h-10 bg-gradient-to-r from-slate-200 via-slate-300 to-slate-200 rounded-lg w-32 animate-shimmer"></div>
      </div>

      {/* Stats cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
            <div className="flex items-start justify-between">
              <div className="space-y-3 flex-1">
                <div className="h-4 bg-gradient-to-r from-slate-200 via-slate-300 to-slate-200 rounded w-2/3 animate-shimmer"></div>
                <div className="h-8 bg-gradient-to-r from-slate-200 via-slate-300 to-slate-200 rounded-lg w-1/2 animate-shimmer"></div>
              </div>
              <div className="w-12 h-12 bg-gradient-to-r from-slate-200 via-slate-300 to-slate-200 rounded-xl animate-shimmer"></div>
            </div>
          </div>
        ))}
      </div>

      {/* Table skeleton */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200">
          <div className="h-6 bg-gradient-to-r from-slate-200 via-slate-300 to-slate-200 rounded w-48 animate-shimmer"></div>
        </div>
        <div className="divide-y divide-slate-200">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="p-6 flex items-center gap-4">
              <div className="w-10 h-10 bg-gradient-to-r from-slate-200 via-slate-300 to-slate-200 rounded-full animate-shimmer"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gradient-to-r from-slate-200 via-slate-300 to-slate-200 rounded w-1/3 animate-shimmer"></div>
                <div className="h-3 bg-gradient-to-r from-slate-200 via-slate-300 to-slate-200 rounded w-1/4 animate-shimmer"></div>
              </div>
              <div className="h-8 bg-gradient-to-r from-slate-200 via-slate-300 to-slate-200 rounded-full w-20 animate-shimmer"></div>
            </div>
          ))}
        </div>
      </div>

      {/* Pulsing loader indicator */}
      <div className="flex items-center justify-center py-8">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
          <span className="text-sm font-medium text-slate-600">Loading dashboard...</span>
        </div>
      </div>
    </div>
  )
}
