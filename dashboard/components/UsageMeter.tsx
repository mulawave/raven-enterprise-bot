interface UsageMeterProps {
  label: string
  used: number
  limit: number
  unit?: string
}

export default function UsageMeter({ label, used, limit, unit = '' }: UsageMeterProps) {
  const percentage = Math.min((used / limit) * 100, 100)
  
  // Color thresholds
  const getColor = () => {
    if (percentage >= 90) return 'bg-red-500'
    if (percentage >= 70) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  return (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className="text-sm text-gray-600">
          {used.toLocaleString()} / {limit.toLocaleString()} {unit}
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
        <div
          className={`h-full ${getColor()} transition-all duration-300`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="mt-1 text-xs text-gray-500">
        {percentage.toFixed(1)}% used
      </div>
    </div>
  )
}
