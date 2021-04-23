package main.stages

import groovy.transform.CompileStatic
import main.context.StageContext
import main.fit.perf.config.PerfConfig
import main.fit.perf.config.Run
import main.fit.stages.BuildDockerJavaFITPerformer
import main.fit.stages.StartDockerImagePerformer

/**
 * Outputs the runner config
 */
@CompileStatic
class OutputPerformerConfig extends Stage {
    private final List<Run> runs
    private final String outputFilename
    private final PerfConfig.Cluster cluster
    private final PerfConfig.Implementation impl

    OutputPerformerConfig(PerfConfig.Cluster cluster, PerfConfig.Implementation impl, List < Run > runs, String outputFilename) {
        this.impl = impl
        this.cluster = cluster
        this.runs = runs
        this.outputFilename = outputFilename
    }

    @Override
    String name() {
        return "Output performer config for ${cluster} ${impl} & ${runs.size()} runs to $outputFilename"
    }

    @Override
    void executeImpl(StageContext ctx) {
        // TODO
    }
}