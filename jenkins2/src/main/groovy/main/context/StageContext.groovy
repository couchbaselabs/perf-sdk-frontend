package main.context

import groovy.transform.CompileStatic
import main.context.environments.Environment
import main.fit.perf.config.PerfConfig

@CompileStatic
class StageContext {
    Environment env
    // Where the performer is running, a hostname or IP
    String performerServer
}