import { NavigationLayout } from '@/components/navigation-layout'

export default function DealsLayout({
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