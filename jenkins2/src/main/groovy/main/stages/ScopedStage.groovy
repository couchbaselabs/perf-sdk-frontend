package main.stages

import groovy.transform.CompileStatic
import main.context.StageContext

/**
 * Executes the parent stage, executes the children stages, then finishes the parent stage
 */
@CompileStatic
class ScopedStage extends Stage {

    private final Stage parent
    private final List<Stage> children

    ScopedStage(Stage parent, List<Stage> children) {
        this.parent = parent
        this.children = children
    }

    @Override
    String name() {
        return parent.name()
    }

    @Override
    void execute(StageContext ctx) {
        ctx.env.startStage(parent)
        parent.stagesPre(ctx).forEach(stage -> stage.execute(ctx))
        if (!ctx.dryRun) {
            parent.executeImpl(ctx)
        }
        children.forEach(child -> {
            child.execute(ctx)
            child.finish(ctx)
        })
    }

    @Override
    void finish(StageContext ctx) {
        parent.finish(ctx)
//        parent.stagesPre(ctx).forEach(stage -> stage.finish(ctx))
        ctx.env.stopStage(parent)
//        def stages = stagesPre(ctx)
//        if (!ctx.dryRun) {
//            finishImpl(ctx)
//        }
//        stages.forEach(stage -> stage.finish(ctx))
//        ctx.env.stopStage(this)
    }


    @Override
    protected void executeImpl(StageContext ctx) {}
}