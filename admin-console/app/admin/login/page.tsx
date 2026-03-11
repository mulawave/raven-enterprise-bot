import { unstable_noStore as noStore } from 'next/cache'
import AdminLoginForm from '@/components/AdminLoginForm'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default function LoginPage() {
  noStore()

  return <AdminLoginForm />
}
