import { NavigationLayout } from '@/components/navigation-layout'

export default function SettingsLayout({
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