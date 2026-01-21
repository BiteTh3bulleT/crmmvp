import { NavigationLayout } from '@/components/navigation-layout'

export default function TasksLayout({
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