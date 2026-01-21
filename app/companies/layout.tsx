import { NavigationLayout } from '@/components/navigation-layout'

export default function CompaniesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <NavigationLayout>
      {children}
    </NavigationLayout>
  )
}