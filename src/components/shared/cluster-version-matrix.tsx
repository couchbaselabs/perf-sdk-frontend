"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/src/components/ui/table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/components/ui/card"
import { Badge } from "@/src/components/ui/badge"

interface ClusterVersionMatrixProps {
  data: {
    sdkVersions: string[]
    clusterVersions: string[]
    metrics: {
      [sdkVersion: string]: {
        [clusterVersion: string]: {
          value: number
          unit: string
          improvement?: boolean
        }
      }
    }
  }
  title: string
  description?: string
}

export default function ClusterVersionMatrix({ data, title, description }: ClusterVersionMatrixProps) {
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[150px]">SDK Version</TableHead>
                {data.clusterVersions.map((version) => (
                  <TableHead key={version} className="text-center">
                    Cluster {version.split("-")[0]}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.sdkVersions.map((sdkVersion) => (
                <TableRow key={sdkVersion}>
                  <TableCell className="font-medium">{sdkVersion}</TableCell>
                  {data.clusterVersions.map((clusterVersion) => {
                    const metricData = data.metrics[sdkVersion]?.[clusterVersion]

                    if (!metricData) {
                      return (
                        <TableCell key={clusterVersion} className="text-center">
                          -
                        </TableCell>
                      )
                    }

                    return (
                      <TableCell key={clusterVersion} className="text-center">
                        <div className="flex flex-col items-center">
                          <span className={metricData.improvement ? "text-green-600" : ""}>
                            {metricData.value} {metricData.unit}
                          </span>
                          {metricData.improvement && (
                            <Badge variant="outline" className="mt-1 bg-green-50 text-green-700 border-green-200">
                              Improved
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                    )
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
