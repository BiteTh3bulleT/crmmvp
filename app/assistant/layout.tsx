import { NavigationLayout } from '@/components/navigation-layout'

export default function AssistantLayout({
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