interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon?: string
  accentColor?: 'blue' | 'emerald' | 'violet' | 'amber' | 'sky' | 'green' | 'rose' | 'indigo'
}

const ACCENT_MAP: Record<string, { iconBg: string; iconRing: string; topBorder: string }> = {
  blue:    { iconBg: 'bg-blue-100',    iconRing: 'ring-blue-200',    topBorder: 'border-t-blue-500' },
  emerald: { iconBg: 'bg-emerald-100', iconRing: 'ring-emerald-200', topBorder: 'border-t-emerald-500' },
  violet:  { iconBg: 'bg-violet-100',  iconRing: 'ring-violet-200',  topBorder: 'border-t-violet-500' },
  amber:   { iconBg: 'bg-amber-100',   iconRing: 'ring-amber-200',   topBorder: 'border-t-amber-500' },
  sky:     { iconBg: 'bg-sky-100',     iconRing: 'ring-sky-200',     topBorder: 'border-t-sky-500' },
  green:   { iconBg: 'bg-green-100',   iconRing: 'ring-green-200',   topBorder: 'border-t-green-500' },
  rose:    { iconBg: 'bg-rose-100',    iconRing: 'ring-rose-200',    topBorder: 'border-t-rose-500' },
  indigo:  { iconBg: 'bg-indigo-100',  iconRing: 'ring-indigo-200',  topBorder: 'border-t-indigo-500' },
}

export default function StatCard({ title, value, subtitle, icon, accentColor }: StatCardProps) {
  const accent = accentColor ? ACCENT_MAP[accentColor] : null

  return (
    <div className={`bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow ${accent ? `border-t-4 ${accent.topBorder}` : ''}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
          {subtitle && (
            <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
          )}
        </div>
        {icon && (
          <div className={`flex h-12 w-12 items-center justify-center rounded-xl text-2xl ${accent ? `${accent.iconBg} ring-1 ${accent.iconRing}` : 'bg-gray-100 ring-1 ring-gray-200'}`}>
            {icon}
          </div>
        )}
      </div>
    </div>
  )
}
