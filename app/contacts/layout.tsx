import { NavigationLayout } from '@/components/navigation-layout'

export default function ContactsLayout({
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