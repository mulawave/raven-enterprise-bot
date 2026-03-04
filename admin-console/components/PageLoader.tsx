'use client'

interface PageLoaderProps {
  isLoading: boolean
  children: React.ReactNode
  error?: string | null
}

export default function PageLoader({ isLoading, children, error }: PageLoaderProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-slate-200 rounded-full"></div>
            <div className="w-20 h-20 border-4 border-blue-600 rounded-full animate-spin border-t-transparent absolute top-0 left-0"></div>
          </div>
          <div className="space-y-2">
            <p className="text-lg font-semibold text-slate-900">Loading...</p>
            <div className="flex items-center justify-center gap-1">
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="max-w-md w-full">
          <div className="bg-red-50 border-2 border-red-200 rounded-xl p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-red-900 mb-2">Error Loading Data</h3>
            <p className="text-red-800">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-6 px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
