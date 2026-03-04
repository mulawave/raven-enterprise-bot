interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon?: string
  trend?: {
    value: number
    isPositive: boolean
  }
}

export default function StatCard({ title, value, subtitle, icon, trend }: StatCardProps) {
  return (
    <div className="group bg-white rounded-xl shadow-sm hover:shadow-xl border border-slate-200 p-6 transition-all duration-300 hover:-translate-y-1 relative overflow-hidden">
      {/* Gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/0 to-purple-50/0 group-hover:from-blue-50 group-hover:to-purple-50 transition-all duration-300"></div>
      
      <div className="relative z-10 flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-semibold text-slate-600 mb-2">{title}</p>
          <p className="text-3xl font-bold text-slate-900 mb-1">{value}</p>
          {subtitle && (
            <p className="text-sm text-slate-500 mt-1">{subtitle}</p>
          )}
          {trend && (
            <div className="mt-2 flex items-center gap-1">
              <div className={`flex items-center gap-1 text-sm font-semibold ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                <svg className={`w-4 h-4 ${trend.isPositive ? '' : 'rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                <span>{Math.abs(trend.value)}%</span>
              </div>
              <span className="text-xs text-slate-500">vs last month</span>
            </div>
          )}
        </div>
        {icon && (
          <div className="text-4xl opacity-80 group-hover:scale-110 transition-transform duration-300">
            {icon}
          </div>
        )}
      </div>
      
      {/* Bottom accent line */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 to-purple-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
    </div>
  )
}
