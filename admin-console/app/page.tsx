import { unstable_noStore as noStore } from 'next/cache'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default function Home() {
  noStore()

  redirect('/admin/login')
}
