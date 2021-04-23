package main.fit.stages

import groovy.transform.CompileStatic
import main.context.StageContext
import main.stages.Stage

@CompileStatic
class StartDockerImagePerformer extends Stage {

    private String imageName
    private int port

    StartDockerImagePerformer(String imageName, int port) {
        this.imageName = imageName
    }

    @Override
    String name() {
        return "Start docker image $imageName on $port"
    }

    @Override
    void executeImpl(StageContext ctx) {
        ctx.env.execute("docker run -rm -d -p $port:8060 $imageName")
    }

    @Override
    void finishImpl(StageContext ctx) {
        ctx.env.execute("docker kill $imageName")
    }
}