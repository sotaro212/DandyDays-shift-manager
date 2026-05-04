type Variant = 'green' | 'red' | 'yellow' | 'blue' | 'gray'

const styles: Record<Variant, string> = {
  green:  'bg-green-100 text-green-800',
  red:    'bg-red-100 text-red-800',
  yellow: 'bg-yellow-100 text-yellow-800',
  blue:   'bg-dandy-100 text-dandy-700',
  gray:   'bg-gray-100 text-gray-700',
}

export function Badge({ label, variant }: { label: string; variant: Variant }) {
  return (
    <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${styles[variant]}`}>
      {label}
    </span>
  )
}
