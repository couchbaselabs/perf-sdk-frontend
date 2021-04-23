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
    protected void executeImpl(StageContext ctx) {
        parent.execute(ctx)
        children.forEach(child -> {
            child.execute(ctx)
            child.finish(ctx)
        })
        // The runner will finish this stage
    }
}