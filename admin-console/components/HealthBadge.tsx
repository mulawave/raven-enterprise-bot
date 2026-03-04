interface HealthBadgeProps {
  status: 'healthy' | 'degraded' | 'down'
  label?: string
}

export default function HealthBadge({ status, label }: HealthBadgeProps) {
  const config = {
    healthy: {
      bg: 'bg-green-100',
      text: 'text-green-800',
      dot: 'bg-green-500',
      label: label || 'Healthy',
    },
    degraded: {
      bg: 'bg-yellow-100',
      text: 'text-yellow-800',
      dot: 'bg-yellow-500',
      label: label || 'Degraded',
    },
    down: {
      bg: 'bg-red-100',
      text: 'text-red-800',
      dot: 'bg-red-500',
      label: label || 'Down',
    },
  }

  const style = config[status]

  return (
    <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full ${style.bg}`}>
      <div className={`w-2 h-2 rounded-full ${style.dot} animate-pulse`}></div>
      <span className={`text-sm font-medium ${style.text}`}>{style.label}</span>
    </div>
  )
}
