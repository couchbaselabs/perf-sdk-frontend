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
    private List<Stage> stages = []

    InitialiseCluster(PerfConfig.Cluster cluster) {
        this.cluster = cluster
        if (cluster.type == "unmanaged") {
            // no-op
        }
        else if (cluster.type == "cbdyncluster") {
            Stage stage = new StartCbdyncluster(cluster.nodes, cluster.version, cluster.replicas)
            stages.add(stage)
        }
        else {
            throw new IllegalArgumentException("Unknown cluster type ${cluster.type}")
        }
    }

    @Override
    String name() {
        return "Start cluster $cluster"
    }

    @Override
    List<Stage> stagesPre(StageContext ctx) {
        return stages
    }

    @Override
    void executeImpl(StageContext ctx) {}

    String hostname() {
        if (cluster.type == "unmanaged") {
            return cluster.hostname
        }

        return ((StartCbdyncluster) stages[0]).clusterIp()
    }
}
