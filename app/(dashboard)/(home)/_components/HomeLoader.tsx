import HomeContent from "./home-content"
import { getInitialDashboardData } from "../_lib/server-actions"

/**
 * Async RSC that awaits the initial dashboard data inside the page's Suspense
 * boundary, so the route shell + skeleton stream immediately. Normalizes
 * `availableVersions` to plain strings and clones the readonly defaults — the
 * same transform the page previously did inline.
 */
export default async function HomeLoader() {
  const initialData = await getInitialDashboardData()

  return (
    <HomeContent
      initialData={{
        ...initialData,
        availableVersions: initialData.availableVersions.map((v: any) =>
          typeof v === "string" ? v : v.name || v.id
        ),
        defaultClusters: [...initialData.defaultClusters],
      }}
    />
  )
}
