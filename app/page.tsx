import { Suspense } from "react"
import AppLayout from "@/src/components/layout/app-layout"
import HomeContent from "./(home)/_components/home-content"
import { getInitialDashboardData } from "./(home)/_lib/server-actions"
import { LoadingSpinner } from "@/src/components/shared/LoadingStates"

export default async function Home() {
  // Fetch initial data on the server
  const initialData = await getInitialDashboardData()

  return (
    <Suspense fallback={
      <AppLayout>
        <LoadingSpinner message="Loading performance dashboard..." />
      </AppLayout>
    }>
      <HomeContent initialData={{
        ...initialData,
        availableVersions: initialData.availableVersions.map(v => typeof v === 'string' ? v : v.name || v.id),
        defaultClusters: [...initialData.defaultClusters]
      }} />
    </Suspense>
  )
}
