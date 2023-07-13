<template>
  <b-container>

    <Shared :language="'Java'"></Shared>
    <Metrics :language="'Java'"></Metrics>

    <h1>KV Gets (OpenShift + Protostellar + CNG)</h1>
    Going from an AWS node in us-west-1 to the test OpenShift cluster, also in us-west-1. Protostellar is used, talking
    to a CNG ingress node.

    With 20 threads:
    <Results :input="kvGetsOpenShift20Threads"></Results>
    With 1 thread:
    <Results :input="kvGetsOpenShift1Thread"></Results>

    <h1>Horizontal Scaling (Reactive)</h1>
    Tests how the SDK scales with parallelism, using KV gets and the reactive API.
    <Results :input="kvGetsHorizontalScalingAsync"></Results>

    <h1>Transactions</h1>
    <Results :input="transactions"></Results>

    <h1>KV Gets (Blocking API)</h1>
    <Results :input="kvGetsBlocking"></Results>

    <h1>KV Gets (Reactive API)</h1>
    <Results :input="kvGetsReactive"></Results>

    <h1>Experiment: Stellar Nebula com.couchbase.protostellar.numEndpoints</h1>
    <p>Testing different numbers of connections to STG. Simple round-robining over them. Testing KV gets.</p>
    <Results :input="numEndpoints"></Results>

    <p>Same test but against OpenShift, using 1 thread:</p>
    <Results :input="numEndpointsOpenshift1Thread"></Results>

    <p>Same test but using 20 threads:</p>
    <Results :input="numEndpointsOpenshift20Threads"></Results>

    <h1>Experiment: Stellar Nebula ForkJoinPool com.couchbase.protostellar.executorMaxThreadCount</h1>
    <p>Testing various sizes of thread pool for the executor used for GRPC operations. Testing KV gets.</p>
    <p>With ThreadPool</p>
    <Results :input="threadPoolExecutorMaxThreadCount"></Results>

    <p>With ForkJoinPool</p>
    <Results :input="forkJoinPoolExecutorMaxThreadCount"></Results>

    <h1>Experiment: Stellar Nebula com.couchbase.protostellar.reuseStubs</h1>
    <p>Seeing if creating a new GRPC stub for each operation has a cost. Testing KV gets.</p>
    <Results :input="reuseStubs"></Results>

    <h1>Experiment: Stellar Nebula protostellarLoadBalancing</h1>
    <p>GRPC's generated code includes options to load balance. Trying this out, setting
      com.couchbase.protostellar.numEndpoints=1 to disable our own pooling, and trying to get GRPC to create N
      connections to the same STG instance.</p>
    <p>com.couchbase.protostellar.loadBalancingSingle=true</p>
    <Results :input="protostellarLoadBalancingSingle"></Results>
    <p>com.couchbase.protostellar.loadBalancingSingle=false</p>
    <Results :input="protostellarLoadBalancingNotSingle"></Results>

    <h1>Experiment: CoreKvOps</h1>
    <p>Testing experimental approach under <a href="https://review.couchbase.org/c/couchbase-jvm-clients/+/184307">https://review.couchbase.org/c/couchbase-jvm-clients/+/184307</a>
      of CoreKvOps, checking if this abstraction (and the extra allocations) impacts perf.
      Testing KV gets.</p>
    <Results :input="coreKvOps"></Results>

    <h1>Experiment: setting TCP_NODELAY</h1>
    <p>Using KV gets and Gerrit review <a
        href="https://review.couchbase.org/c/couchbase-jvm-clients/+/192387">192387</a>.</p>
    <p>With 1 thread:</p>
    <Results :input="tcpNoDelay1Thread"></Results>
    <p>With 20 threads:</p>
    <Results :input="tcpNoDelay20Threads"></Results>
  </b-container>
</template>

<script>
import Shared, {
  defaultCluster,
  defaultQuery,
  defaultVars,
  defaultVarsWithoutHorizontalScaling,
  protostellarCluster,
  defaultWorkloadGets,
  withoutKey,
  hAxisSdkLanguage
} from "@/components/Shared.vue";
import Results from "@/components/Results.vue";
import Metrics from "@/components/Metrics.vue";
import {openShiftCluster} from "@/components/Shared.vue";

export default {
  components: {Metrics, Shared, Results},
  data() {
    return {

      kvGetsHorizontalScalingAsync: {
        ...defaultQuery,
        "hAxis": {
          "type": "dynamic",
          "databaseField": "vars.horizontalScaling",
          resultType: "Integer"
        },
        "databaseCompare": {
          "cluster": defaultCluster,
          "impl": {"language": "Java"},
          "workload": defaultWorkloadGets,
          "vars": {
            "poolSize": 10000, ...defaultVarsWithoutHorizontalScaling,
            "experimentName": "horizontalScaling",
            "api": "ASYNC"
          }
        },
        "excludeSnapshots": this.excludeSnapshots || false
      },

      kvGetsBlocking: {
        ...defaultQuery,
        "databaseCompare": {
          "cluster": defaultCluster,
          "impl": {"language": "Java"},
          "workload": defaultWorkloadGets,
          "vars": {"poolSize": 10000, ...defaultVars, api: "DEFAULT"}
        },
        "excludeSnapshots": this.excludeSnapshots || false,
      },
      kvGetsReactive: {
        ...defaultQuery,
        "databaseCompare": {
          "cluster": defaultCluster,
          "impl": {"language": "Java"},
          "workload": defaultWorkloadGets,
          "vars": {"poolSize": 10000, ...defaultVars, api: "ASYNC"}
        },
        "excludeSnapshots": this.excludeSnapshots || false,
      },
      kvGetsOpenShift20Threads: {
        ...defaultQuery,
        "databaseCompare": {
          "cluster": openShiftCluster,
          "impl": {"language": "Java"},
          "workload": defaultWorkloadGets,
          "vars": {"poolSize": 10000, ...defaultVarsWithoutHorizontalScaling, "horizontalScaling": 20}
        },
        "excludeSnapshots": false,
      },
      kvGetsOpenShift1Thread: {
        ...defaultQuery,
        "databaseCompare": {
          "cluster": openShiftCluster,
          "impl": {"language": "Java"},
          "workload": defaultWorkloadGets,
          "vars": {"poolSize": 10000, ...defaultVarsWithoutHorizontalScaling, "horizontalScaling": 1}
        },
        "excludeSnapshots": false,
        "multipleResultsHandling": "Side-by-Side"
      },
      transactions: {
        ...defaultQuery,
        "databaseCompare": {
          "cluster": defaultCluster,
          "impl": {"language": "Java"},
          "workload": {
            "operations": [{
              "transaction": {
                "ops": [{
                  "op": "replace",
                  "docLocation": {"method": "pool", "poolSize": "$poolSize", "poolSelectionStrategy": "randomUniform"}
                }, {"op": "insert", "docLocation": {"method": "uuid"}}], "bounds": {"forSeconds": "$forSeconds"}
              }
            }]
          },
          "vars": {...defaultVars}
        },
        "excludeSnapshots": this.excludeSnapshots || false
      },
      stellarNebulaGets: {
        ...defaultQuery,
        "hAxis": {
          "type": "dynamic",
          "databaseField": "vars.com.couchbase.protostellar.executorMaxThreadCount",
          "resultType": "Integer"
        },
        "databaseCompare": {
          "cluster": protostellarCluster,
          "impl": {"language": "Java", "version": "refs/changes/35/184435/1"},
          "workload": defaultWorkloadGets,
          "vars": {
            "poolSize": 10000,
            ...defaultVars,
            "com.couchbase.protostellar.executorType": "ForkJoinPool",
          }
        },
        "excludeGerrit": false,
      },
      forkJoinPoolExecutorMaxThreadCount: {
        ...defaultQuery,
        "hAxis": {
          "type": "dynamic",
          "databaseField": "vars.com.couchbase.protostellar.executorMaxThreadCount",
          "resultType": "Integer"
        },
        "databaseCompare": {
          "cluster": protostellarCluster,
          "impl": {"language": "Java"},
          "vars": {
            "poolSize": 10000,
            "experimentName": "ThreadPool",
            "com.couchbase.protostellar.executorType": "ForkJoinPool",
            ...withoutKey("api", defaultVars)
          },
        },
        "excludeGerrit": false,
      },
      threadPoolExecutorMaxThreadCount: {
        ...defaultQuery,
        "hAxis": {
          "type": "dynamic",
          "databaseField": "vars.com.couchbase.protostellar.executorMaxThreadCount",
          "resultType": "Integer"
        },
        "databaseCompare": {
          "cluster": protostellarCluster,
          "impl": {"language": "Java"},
          "vars": {
            "poolSize": 10000,
            "experimentName": "ThreadPool",
            "com.couchbase.protostellar.executorType": "ThreadPool",
            ...withoutKey("api", defaultVars)
          },
        },

        "excludeGerrit": false,
      },
      coreKvOps: {
        ...defaultQuery,
        "hAxis": hAxisSdkLanguage(),
        "databaseCompare": {
          "cluster": defaultCluster,
          "impl": {"language": "Java", "version": "refs/changes/07/184307/8"},
          "workload": defaultWorkloadGets,
          "vars": {...defaultVars},
        },
        "excludeGerrit": false,
        "excludeSnapshots": this.excludeSnapshots || false,
      },
      reuseStubs: {
        ...defaultQuery,
        "hAxis": {
          "type": "dynamic",
          "databaseField": "vars.com.couchbase.protostellar.reuseStubs",
          "resultType": "Integer"
        },
        "databaseCompare": {
          "cluster": protostellarCluster,
          "impl": {"language": "Java"},
          "vars": {experimentName: "reuseStubs"}
        },
        "excludeGerrit": false,
      },
      numEndpoints: {
        ...defaultQuery,
        "hAxis": {
          "type": "dynamic",
          "databaseField": "vars.com.couchbase.protostellar.numEndpoints",
          "resultType": "Integer"
        },
        "databaseCompare": {
          "cluster": protostellarCluster,
          "impl": {"language": "Java"},
          "vars": {experimentName: "numEndpoints"}
        },
        "excludeGerrit": false,
      },
      numEndpointsOpenshift1Thread: {
        ...defaultQuery,
        "hAxis": {
          "type": "dynamic",
          "databaseField": "vars.com.couchbase.protostellar.numEndpoints",
          "resultType": "Integer"
        },
        "databaseCompare": {
          "cluster": openShiftCluster,
          "impl": {"language": "Java"},
          "vars": {experimentName: "openShiftNumEndpoints", "horizontalScaling": 1, "api": "DEFAULT"}
        },
        "excludeGerrit": false,
        "filterRuns": "Latest"
      },
      numEndpointsOpenshift20Threads: {
        ...defaultQuery,
        "hAxis": {
          "type": "dynamic",
          "databaseField": "vars.com.couchbase.protostellar.numEndpoints",
          "resultType": "Integer"
        },
        "databaseCompare": {
          "cluster": openShiftCluster,
          "impl": {"language": "Java"},
          "vars": {experimentName: "openShiftNumEndpoints", "horizontalScaling": 20, "api": "DEFAULT"}
        },
        "excludeGerrit": false,
        "filterRuns": "Latest"
      },
      protostellarLoadBalancingSingle: {
        ...defaultQuery,
        "hAxis": {
          "type": "dynamic",
          "databaseField": "vars.com.couchbase.protostellar.loadBalancing",
          "resultType": "Integer"
        },
        "databaseCompare": {
          "cluster": protostellarCluster,
          "impl": {"language": "Java"},
          "vars": {
            experimentName: "protostellarLoadBalancing",
            "com.couchbase.protostellar.loadBalancingSingle": "true"
          }
        },
        "excludeGerrit": false,
      },
      protostellarLoadBalancingNotSingle: {
        ...defaultQuery,
        "hAxis": {
          "type": "dynamic",
          "databaseField": "vars.com.couchbase.protostellar.loadBalancing",
          "resultType": "Integer"
        },
        "databaseCompare": {
          "cluster": protostellarCluster,
          "impl": {"language": "Java"},
          "vars": {
            experimentName: "protostellarLoadBalancing",
            "com.couchbase.protostellar.loadBalancingSingle": "false"
          }
        },
        "excludeGerrit": false,
      },
      tcpNoDelay1Thread: {
        ...defaultQuery,
        "hAxis": {
          "type": "dynamic",
          "databaseField": "vars.com.couchbase.tcpNoDelay",
          "resultType": "Integer"
        },
        "databaseCompare": {
          "impl": {"language": "Java", "version": "refs/changes/87/192387/2"},
          "vars": {
            "poolSize": 10000,
            "experimentName": "tcpNoDelay",
            "horizontalScaling": 1,
            "api": "DEFAULT"
          },
        },
        "excludeGerrit": false,
      },
      tcpNoDelay20Threads: {
        ...defaultQuery,
        "hAxis": {
          "type": "dynamic",
          "databaseField": "vars.com.couchbase.tcpNoDelay",
          "resultType": "Integer"
        },
        "databaseCompare": {
          "impl": {"language": "Java", "version": "refs/changes/87/192387/2"},
          "vars": {
            "poolSize": 10000,
            "experimentName": "tcpNoDelay",
            "horizontalScaling": 20,
            "api": "DEFAULT"
          },
        },
        "excludeGerrit": false,
      },
    }
  }
}
</script>

