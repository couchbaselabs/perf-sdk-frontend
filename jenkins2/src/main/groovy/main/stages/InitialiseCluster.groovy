package main.stages

import groovy.transform.CompileStatic
import main.context.StageContext
import main.fit.perf.config.PerfConfig

/**
 * Initialises a cluster based on config settings
 */
@CompileStatic
class InitialiseCluster extends Stage {
    private PerfConfig.Cluster cluster

    InitialiseCluster(PerfConfig.Cluster cluster) {
        this.cluster = cluster
    }

    @Override
    String name() {
        return "Start cluster $cluster"
    }

    @Override
    List<Stage> stagesPre(StageContext ctx) {
        if (cluster.type == "localhost") {
            // no-op
            return []
        }
        else if (cluster.type == "cbdyncluster") {
            Stage stage = new StartCbdyncluster(cluster.nodes, cluster.version, cluster.replicas)
            def stages = []
            stages.add(stage)
            return stages
        }

        throw new IllegalArgumentException("Unknown cluster type ${cluster.type}")
    }

    @Override
    void executeImpl(StageContext ctx) {}
}
