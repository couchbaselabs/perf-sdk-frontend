import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card"
import { Globe } from "lucide-react"

export function HeaderSection() {
  return (
    <Card className="mb-6 border-slate-200 shadow-sm bg-gradient-to-r from-slate-50 to-indigo-50/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
          <Globe className="h-5 w-5 text-indigo-600" />
          Situational Runs
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-slate-600">
          View and analyze situational test runs. Click on any run to access detailed observability data and metrics.
        </p>
      </CardContent>
    </Card>
  )
}
