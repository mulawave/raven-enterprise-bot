interface StatusBadgeProps {
  status: 'active' | 'suspended' | 'trial' | 'cancelled' | 'pending' | 'past_due' | (string & {})
  size?: 'sm' | 'md'
}

export default function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const config = {
    active: { bg: 'bg-green-100', text: 'text-green-800', label: 'Active' },
    suspended: { bg: 'bg-red-100', text: 'text-red-800', label: 'Suspended' },
    trial: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Trial' },
    cancelled: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Cancelled' },
    pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pending' },
    past_due: { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Past Due' },
  }

  const style = (config as any)[status] || { bg: 'bg-slate-100', text: 'text-slate-800', label: String(status) }
  const sizeClass = size === 'sm' ? 'text-xs px-2 py-1' : 'text-sm px-3 py-1'

  return (
    <span className={`inline-flex items-center rounded-full font-medium ${style.bg} ${style.text} ${sizeClass}`}>
      {style.label}
    </span>
  )
}
