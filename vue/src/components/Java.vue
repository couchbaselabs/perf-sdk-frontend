<template>
  <b-container>
    <Shared :language="'Java'"></Shared>

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
  </b-container>
</template>

<script>
import Shared, {defaultCluster, protostellarCluster} from "@/components/Shared";
import Results from "@/components/Results";

export default {
  components: {Shared, Results},
  data() {
    return {
      kvGetsHorizontalScalingAsync: {
        "groupBy": "variables.horizontalScaling",
        "display": "duration_average_us",
        "impl": {"language": "Java"},
        "cluster": defaultCluster,
        "workload": {
          "operations": [{
            "op": "get",
            "bounds": {"forSeconds": "$forSeconds"},
            "docLocation": {"method": "pool", "poolSize": "$poolSize", "poolSelectionStrategy": "randomUniform"}
          }]
        },
        "vars": {
          "poolSize": 10000,
          "driverVer": 6,
          "forSeconds": 300,
          "performerVer": 1,
          "experimentName": "horizontalScaling",
          "api": "ASYNC",
        },
        "graphType": "Simplified",
        "groupingType": "Average",
        "mergingType": "Average",
        "trimmingSeconds": 20,
        "bucketiseSeconds": 0,
        "includeMetrics": false,
        "excludeGerrit": true,
        "excludeSnapshots": this.exclude_snapshots || false
      },

      kvGetsBlocking: {
        "groupBy": "impl.version",
        "display": "duration_average_us",
        "impl": {"language": "Java"},
        "cluster": defaultCluster,
        "workload": {
          "operations": [{
            "op": "get",
            "bounds": {"forSeconds": "$forSeconds"},
            "docLocation": {"method": "pool", "poolSize": "$poolSize", "poolSelectionStrategy": "randomUniform"}
          }]
        },
        "vars": {
          "poolSize": 10000,
          "driverVer": 6,
          "forSeconds": 300,
          "performerVer": 1,
          "horizontalScaling": 20,
          api: "DEFAULT"
        },
        "graphType": "Simplified",
        "groupingType": "Average",
        "mergingType": "Average",
        "trimmingSeconds": 20,
        "bucketiseSeconds": 0,
        "includeMetrics": false,
        "excludeGerrit": true,
        "excludeSnapshots": this.exclude_snapshots || false,
      },
      kvGetsReactive: {
        "groupBy": "impl.version",
        "display": "duration_average_us",
        "impl": {"language": "Java"},
        "cluster": defaultCluster,
        "workload": {
          "operations": [{
            "op": "get",
            "bounds": {"forSeconds": "$forSeconds"},
            "docLocation": {"method": "pool", "poolSize": "$poolSize", "poolSelectionStrategy": "randomUniform"}
          }]
        },
        "vars": {
          "poolSize": 10000,
          "driverVer": 6,
          "forSeconds": 300,
          "performerVer": 1,
          "horizontalScaling": 20,
          api: "ASYNC"
        },
        "graphType": "Simplified",
        "groupingType": "Average",
        "mergingType": "Average",
        "trimmingSeconds": 20,
        "bucketiseSeconds": 0,
        "includeMetrics": false,
        "excludeGerrit": true
      },
      transactions: {
        "groupBy": "impl.version",
        "display": "duration_average_us",
        "impl": {"language": "Java"},
        "cluster": defaultCluster,
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
        "vars": {"poolSize": 10000, "driverVer": 6, "forSeconds": 300, "performerVer": 1, "horizontalScaling": 20},
        "graphType": "Simplified",
        "groupingType": "Average",
        "mergingType": "Average",
        "trimmingSeconds": 20,
        "bucketiseSeconds": 0,
        "includeMetrics": false,
        "excludeGerrit": true,
        "excludeSnapshots": this.exclude_snapshots || false
      },
      stellarNebulaGets: {
        "groupBy": "variables.com.couchbase.protostellar.executorMaxThreadCount",
        "display": "duration_average_us",
        "cluster": protostellarCluster,
        "impl": {"language": "Java", "version": "refs/changes/35/184435/1"},
        "workload": {
          "settings": {
            "grpc": {"batch": 1000, "compression": true, "flowControl": true},
            "variables": [{
              "name": "com.couchbase.protostellar.executorType",
              "type": "tunable",
              "value": "ForkJoinPool"
            }, {
              "name": "com.couchbase.protostellar.overrideHostname",
              "type": "tunable",
              "value": "172.17.0.1"
            }, {"name": "poolSize", "value": 10000}, {
              "name": "horizontalScaling",
              "value": 20
            }, {"name": "forSeconds", "value": 300}]
          },
          "operations": [{
            "op": "get",
            "bounds": {"forSeconds": "$forSeconds"},
            "docLocation": {"method": "pool", "poolSize": "$poolSize", "poolSelectionStrategy": "randomUniform"}
          }]
        },
        "vars": {
          "poolSize": 10000,
          "driverVer": 6,
          "forSeconds": 300,
          "performerVer": 1,
          "horizontalScaling": 20,
          "com.couchbase.protostellar.executorType": "ForkJoinPool",
          "com.couchbase.protostellar.overrideHostname": "172.17.0.1",
        },
        "graphType": "Simplified",
        "groupingType": "Average",
        "mergingType": "Average",
        "trimmingSeconds": 20,
        "bucketiseSeconds": 0,
        "includeMetrics": false,
        "excludeGerrit": false,
        "excludeSnapshots": false
      },
      forkJoinPoolExecutorMaxThreadCount: {
        "display": "duration_average_us",
        "groupBy": "variables.com.couchbase.protostellar.executorMaxThreadCount",
        "cluster": protostellarCluster,
        "workload": {
          "settings": {
            "variables": [{"name": "experimentName", "value": "ThreadPool"},
              {"name": "com.couchbase.protostellar.executorType", "value": "ForkJoinPool"}]
          },
        },
        "vars": {
          "poolSize": 10000,
          "driverVer": 6,
          "forSeconds": 300,
          "performerVer": 1,
          "horizontalScaling": 20
        },
        "graphType": "Simplified",
        "groupingType": "Average",
        "mergingType": "Average",
        "trimmingSeconds": 20,
        "bucketiseSeconds": 0,
        "includeMetrics": false,
        "excludeGerrit": false,
        "excludeSnapshots": false
      },
      threadPoolExecutorMaxThreadCount: {
        "display": "duration_average_us",
        "groupBy": "variables.com.couchbase.protostellar.executorMaxThreadCount",
        "cluster": protostellarCluster,
        "workload": {
          "settings": {
            "variables": [{"name": "experimentName", "value": "ThreadPool"},
              {"name": "com.couchbase.protostellar.executorType", "value": "ThreadPool"}]
          },
        },
        "vars": {
          "poolSize": 10000,
          "driverVer": 6,
          "forSeconds": 300,
          "performerVer": 1,
          "horizontalScaling": 20
        },
        "graphType": "Simplified",
        "groupingType": "Average",
        "mergingType": "Average",
        "trimmingSeconds": 20,
        "bucketiseSeconds": 0,
        "includeMetrics": false,
        "excludeGerrit": false,
        "excludeSnapshots": false
      },
      coreKvOps: {
        "groupBy": "impl.language",
        "display": "duration_average_us",
        "impl": {"language": "Java", "version": "refs/changes/07/184307/8"},
        "cluster": protostellarCluster,
        "workload": {
          "operations": [{
            "op": "get",
            "bounds": {"forSeconds": "$forSeconds"},
            "docLocation": {"method": "pool", "poolSize": "$poolSize", "poolSelectionStrategy": "randomUniform"}
          }]
        },
        "vars": {"poolSize": 10000, "driverVer": 6, "forSeconds": 300, "performerVer": 1, "horizontalScaling": 20},
        "graphType": "Simplified",
        "groupingType": "Average",
        "mergingType": "Average",
        "trimmingSeconds": 20,
        "bucketiseSeconds": 0,
        "includeMetrics": false,
        "excludeGerrit": this.excludeGerrit || false,
        "excludeSnapshots": this.excludeSnapshots || false,
      },
      reuseStubs: {
        "display": "duration_average_us",
        "groupBy": "variables.com.couchbase.protostellar.reuseStubs",
        "cluster": protostellarCluster,
        "workload": {
          "settings": {
            "variables": [{"name": "experimentName", "value": "reuseStubs"}]
          },
        },
        "graphType": "Simplified",
        "groupingType": "Average",
        "mergingType": "Average",
        "trimmingSeconds": 20,
        "bucketiseSeconds": 0,
        "includeMetrics": false,
        "excludeGerrit": false,
        "excludeSnapshots": false
      },
      numEndpoints: {
        "display": "duration_average_us",
        "groupBy": "variables.com.couchbase.protostellar.numEndpoints",
        "cluster": protostellarCluster,
        "workload": {
          "settings": {
            "variables": [{"name": "experimentName", "value": "numEndpoints"}]
          },
        },
        "graphType": "Simplified",
        "groupingType": "Average",
        "mergingType": "Average",
        "trimmingSeconds": 20,
        "bucketiseSeconds": 0,
        "includeMetrics": false,
        "excludeGerrit": false,
        "excludeSnapshots": false
      },
      protostellarLoadBalancingSingle: {
        "display": "duration_average_us",
        "groupBy": "variables.com.couchbase.protostellar.loadBalancing",
        "cluster": protostellarCluster,
        "workload": {
          "settings": {
            "variables": [{"name": "experimentName", "value": "protostellarLoadBalancing"},
              {"name": "com.couchbase.protostellar.loadBalancingSingle", "value": "true"}]
          },
        },
        "graphType": "Simplified",
        "groupingType": "Average",
        "mergingType": "Average",
        "trimmingSeconds": 20,
        "bucketiseSeconds": 0,
        "includeMetrics": false,
        "excludeGerrit": false,
        "excludeSnapshots": false
      },
      protostellarLoadBalancingNotSingle: {
        "display": "duration_average_us",
        "groupBy": "variables.com.couchbase.protostellar.loadBalancing",
        "cluster": protostellarCluster,
        "workload": {
          "settings": {
            "variables": [{"name": "experimentName", "value": "protostellarLoadBalancing"},
              {"name": "com.couchbase.protostellar.loadBalancingSingle", "value": "false"}]
          },
        },
        "graphType": "Simplified",
        "groupingType": "Average",
        "mergingType": "Average",
        "trimmingSeconds": 20,
        "bucketiseSeconds": 0,
        "includeMetrics": false,
        "excludeGerrit": false,
        "excludeSnapshots": false
      },
    }
  }
}
</script>

