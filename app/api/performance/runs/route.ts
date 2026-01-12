import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseService } from '@/src/lib/database-connection-pool';
import { logger } from '@/src/lib/utils/logger';

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const sdk = searchParams.get('sdk');
    const limit = searchParams.get('limit');
    const excludeSnapshots = searchParams.get('excludeSnapshots') === 'true';
    const excludeGerrit = searchParams.get('excludeGerrit') === 'true';
    const includeSnapshots = searchParams.get('includeSnapshots') === 'true';

    // Handle different actions
    if (action === 'clusters') {
      // Get available cluster versions using optimized database query
      const database = await getDatabaseService();
      const clusters = await database.getDistinctClusterVersions();
      return NextResponse.json(clusters);
    }

    if (action === 'versions') {
      // Get available SDK versions using optimized database query
      const database = await getDatabaseService();
      const versions = await database.getDistinctSdkVersions(excludeSnapshots, excludeGerrit);
      return NextResponse.json(versions);
    }

    // Handle regular run queries (with SDK and other filters)
    if (sdk) {
      const database = await getDatabaseService();

      // Optimized filtered query handled at the DB layer
      const filteredRuns = await database.getRunsFiltered({
        sdk,
        excludeSnapshots,
        excludeGerrit,
        limit: limit ? parseInt(limit, 10) : undefined
      });

      // Transform to the format expected by frontend
      const runs = filteredRuns.map((runRaw: any) => ({
        id: runRaw.id,
        datetime: runRaw.datetime,
        status: 'completed', // Default status
        impl: runRaw.params.impl,
        cluster: runRaw.params.cluster,
        workload: runRaw.params.workload,
        vars: runRaw.params.vars,
        params: runRaw.params
      }));
      
      return NextResponse.json(runs);
    }

    // If no specific action or SDK, return error
    return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });

  } catch (error) {
    logger.error('Error in /api/performance/runs', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
