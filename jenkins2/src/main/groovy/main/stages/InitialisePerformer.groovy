package main.stages

import groovy.transform.CompileStatic
import main.context.StageContext
import main.fit.perf.config.PerfConfig
import main.fit.stages.BuildDockerJavaFITPerformer
import main.fit.stages.StartDockerImagePerformer

/**
 * Builds, copies (if needed), and runs a performer
 */
@CompileStatic
class InitialisePerformer extends Stage {
    private PerfConfig.Implementation impl

    InitialisePerformer(PerfConfig.Implementation impl) {
        this.impl = impl
    }

    @Override
    String name() {
        return "Init performer $impl"
    }

    @Override
    List<Stage> stagesPre(StageContext ctx) {
        if (impl.language == "java") {
            def stage1 = new BuildDockerJavaFITPerformer(impl.version)
            List<Stage> stages = []
            stages.add(stage1)

            if (ctx.performerServer == "localhost") {
                stages.add(new StartDockerImagePerformer(stage1.imageName, 8060))
            } else {
                throw new IllegalArgumentException("Cannot handle running on performer remote server")
            }

            return stages
        }

        throw new IllegalArgumentException("Unknown performer ${impl.language}")
    }

    @Override
    void executeImpl(StageContext ctx) {}
}