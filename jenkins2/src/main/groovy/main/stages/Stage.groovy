package main.stages

import groovy.transform.CompileStatic
import main.context.StageContext


// Abstracts a particular task/stage - spinning up a cluster, starting a process.  It will map to a Jenkins stage
// in that environment.
@CompileStatic
abstract class Stage {
    abstract String name()

    default void execute(StageContext ctx) {
//        if (imp.supportsCbdeps()) {
//            def cbdeps = cbdepDependencies()
//            cbdeps.each {cbdep -> {
//                def split = cbdep.split("-")
//                def name = split[0]
//                def version = split[1]
//                StageUtil.installCbdepIfNeeded(imp, name, version)
//            }}
//        }
//        else {
//            imp.log("Skipping cbdeps as not supported by this env")
//        }

        executeImpl(ctx)
    }

    /**
     * A stage is free to return a list of other Stages to execute before itself.
     * These will not be mapped to individual Jenkins stages.
     */
    protected List<Stage> stagesPre(StageContext ctx) {
        return []
    }

    protected abstract void executeImpl(StageContext ctx)

    // Declare what cbdep dependencies this stage has.  They will be installed if possible.
//    protected List<String> cbdepDependencies() { return [] }

    protected void finishImpl(StageContext ctx) {}

    void finish(StageContext ctx) {
        def stages = stagesPre(ctx)
        stages.forEach(stage -> stage.finish(ctx))
        finishImpl(ctx)
    }
}

@CompileStatic
class StageUtil {
//    static def killAnyProcessOnPort(Environment imp, int port){
//            try{
//                imp.execute("ps -ef | grep $port")
//                imp.execute("fuser -k -TERM -n tcp ${port}")
//                imp.execute("ps -ef | grep $port")
//            } catch (Exception ex) {
//                imp.log("Exception while killing process on this port. Probably no process existed to kill : ${ex}")
//            }
//    }

//    static void installCbdepIfNeeded(Environment imp, String packageName, String packageVersion) {
//        def install = false
//
//        imp.log("checking install of $packageName-$packageVersion")
//        if (!(new File("deps").exists())) {
//            imp.log("file deps does not exist")
//            install = true
//        } else {
//            imp.log("file deps does exist")
//                install = !new File("deps/$packageName-${packageVersion}").exists()
//                if (install) {
//                    imp.log("deps/$packageName-${packageVersion} exists")
//                } else {
//                    imp.log("deps/$packageName-${packageVersion} does not exist")
//                }
//        }
//
//        if (install) {
//            imp.execute("mkdir -p deps && mkdir -p deps/$packageName-${packageVersion}")
//            imp.execute("cbdep install -d deps $packageName ${packageVersion}")
//        }
//    }
}