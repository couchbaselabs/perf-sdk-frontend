package main.stages

import groovy.transform.CompileStatic
import main.context.StageContext
import main.fit.perf.config.PerfConfig
import main.fit.perf.config.Run

/**
 * Outputs the runner config
 */
@CompileStatic
class RunRunner extends Stage {
    private final String configFilename

    RunRunner(String configFilename) {
        this.configFilename = configFilename
    }

    @Override
    String name() {
        return "Run for $configFilename"
    }

    @Override
    void executeImpl(StageContext ctx) {
        // TODO
    }
}