package main

import groovy.transform.CompileStatic
import groovy.transform.Field
import groovy.yaml.YamlSlurper
import main.context.StageContext
import main.context.environments.EnvironmentLocal
import main.fit.perf.config.ConfigParser
import main.fit.perf.config.PerfConfig
import main.fit.perf.config.Run
import main.fit.perf.database.PerfDatabase
import main.fit.perf.database.RunFromDb
import main.fit.stages.BuildDockerJavaFITPerformer
import main.fit.stages.StartDockerImagePerformer
import main.stages.InitialiseCluster
import main.stages.InitialisePerformer
import main.stages.OutputPerformerConfig
import main.stages.RunRunner
import main.stages.ScopedStage
import main.stages.Stage
import main.stages.StartCbdyncluster

import java.util.stream.Collectors

import static java.util.stream.Collectors.groupingBy

@Field def ys = new YamlSlurper()
@Field def jc = ys.parse(new File("job-config.yaml"))
@Field def env = new EnvironmentLocal(jc.environment)

//PerfDatabase.getRuns()
//void cbdyncluster() {
//    def cluster = jc.matrix.cluster
//    def imp = new EnvironmentLocal(config.executables)
//    def stage = new StartCbdyncluster(cluster.nodes, cluster.version, cluster.replicas)
//    stage.executeImpl(imp)
//}
//
//void buildJavaPerformer() {
//    def stage = new BuildDockerJavaFITPerformer("1.1.4")
//    stage.execute(imp)
//}
//
//void startDockerImage() {
//    def imp = new EnvironmentLocal(config.executables)
//    def stage = new StartDockerImagePerformer("transactions-fit-performer-java-1.1.7-snapshot", 8060)
//    stage.execute(imp)
//}


//List<Stage> parseConfig() {
//    /**
//     * Config file declaratively says what runs should exist.  Our job is to comapre to runs that do exist, and run any required.
//     *
//     * Read all permutations
//     * See what runs already exist
//     * Group these by cluster, then by performer. Each cluster-performer pair is going to run '2nd chunk'
//     * For each cluster, bring it up
//     * For each cluster-performer in that cluster
//     * - Build and bring up the performer
//     * - Run it with required runs. Ah hmm will need to fully unroll the variables here.
//     * - Bring down performer
//     * Bring down cluster
//     */
//
//    List<Stage> stages = new ArrayList<>()
//    def env = new EnvironmentLocal()
//
//    for (cluster in jc.matrix.clusters) {
//        String clusterType = cluster.type
//
//        if (clusterType == "cbdyncluster") {
//            assert (cluster.version)
//            assert (cluster.replicas)
//            assert (cluster.nodes)
//
//            stages.add(new StartCbdyncluster(cluster.nodes, cluster.version, cluster.replicas))
//        } else if (clusterType == "localhost") {
//            // No-op
//        } else {
//            throw new IllegalArgumentException("Unknown cluster type $clusterType")
//        }
//    }
//
//    return stages
//}



@CompileStatic
static List<Run> parseConfig(StageContext ctx) {
    def config = ConfigParser.readPerfConfig("job-config.yaml")
    def allPerms = ConfigParser.allPerms(config)
    return allPerms
}


//@CompileStatic
static Map<PerfConfig.Cluster, List<Run>> parseConfig2(StageContext ctx, List<RunFromDb> fromDb) {
    /**
     * Config file declaratively says what runs should exist.  Our job is to comapre to runs that do exist, and run any required.
     *
     * Read all permutations
     * See what runs already exist
     * Group these by cluster, then by performer. Each cluster-performer pair is going to run '2nd chunk'
     * For each cluster, bring it up
     * For each cluster-performer in that cluster
     * - Build and bring up the performer
     * - Run it with required runs. Ah hmm will need to fully unroll the variables here.
     * - Bring down performer
     * Bring down cluster
     */

//    def allPerms = parseConfig(ctx)

    def toRun = fromDb.stream()
            .filter(run -> run.dbRunIds.isEmpty() || ctx.force)
            .map(run -> run.run)
            .collect(Collectors.toList())

    def groupedByCluster = toRun.stream()
            .collect(groupingBy((Run run) -> run.cluster))

    ctx.env.log("Have ${toRun.size()} runs not in database, requiring ${groupedByCluster.size()} clusters")

    return groupedByCluster
}

List<Stage> plan(StageContext ctx, Map<PerfConfig.Cluster, List<Run>> input) {
    def stages = new ArrayList<Stage>()

    input.forEach((cluster, runsForCluster) -> {
        def clusterStage = new InitialiseCluster(cluster)
        def clusterChildren = new ArrayList<Stage>()

        def groupedByPerformer = runsForCluster.stream()
                .collect(groupingBy((Run run) -> run.impl))

        ctx.env.log("Cluster ${cluster} requires ${groupedByPerformer.size()} performers")

        groupedByPerformer.forEach((performer, runsForClusterAndPerformer) -> {
            def performerStage = new InitialisePerformer(performer)
            def runId = UUID.randomUUID().toString()
            def configFilename = runId + ".yaml"
            def performerRuns = []

            def output = new OutputPerformerConfig(
                                clusterStage,
                                performerStage,
                                jc,
                                cluster,
                                performer,
                                runsForClusterAndPerformer,
                                configFilename)
            performerRuns.add(output)
            performerRuns.add(new RunRunner(clusterStage, performerStage, output))

            clusterChildren.add(new ScopedStage(performerStage, performerRuns))
        })

        stages.add(new ScopedStage(clusterStage, clusterChildren))
    })

    return stages
}

//@CompileStatic
//void run(StageContext ctx, List<Stage> stages) {
//    stages.forEach(stage -> {
//        ctx.env.log("> ${stage.name()}")
//        stage.execute(ctx)
//        stage.finish(ctx)
//    })
//}

def ctx = new StageContext()
ctx.jc = jc
ctx.env = env
ctx.performerServer = jc.servers.performer
ctx.dryRun = jc.settings.dryRun
ctx.force = jc.settings.force
def allPerms = parseConfig(ctx)
def db = PerfDatabase.compareRunsAgainstDb(ctx, allPerms)
def parsed2 = parseConfig2(ctx, db)
def planned = plan(ctx, parsed2)
def root = new Stage() {
    @Override
    String name() {
        return "Root"
    }

    protected List<Stage> stagesPre(StageContext _) {
        return planned
    }

    @Override
    protected void executeImpl(StageContext _) {}
}
root.execute(ctx)
root.finish(ctx)
//run(ctx, planned)
//print(planned)
