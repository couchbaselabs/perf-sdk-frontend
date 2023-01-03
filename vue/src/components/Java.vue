<template>
  <b-container>
    <Shared :language="'Java'"></Shared>
    <h1>Transactions</h1>
    <Results :input="transactions"></Results>
    <h1>Stellar Nebula</h1>
    com.couchbase.protostellar.executorMaxThreadCount
    <Results :input="stellarNebulaGets"></Results>
  </b-container>
</template>

<script>
import Shared from "@/components/Shared";
import Results from "@/components/Results";

export default {
  components: {Shared, Results},
    data() {
      return {
        transactions:  {"inputs":[{"viewing":"cluster","params":[{"type":"unmanaged","memory":28000,"region":"us-east-2","storage":"couchstore","version":"7.1.1-3175-enterprise","cpuCount":16,"instance":"c5.4xlarge","replicas":0,"topology":"A","nodeCount":1,"compaction":"disabled"}]}],"group_by":"impl.version","display":"duration_average_us","impl":{"language":"Java"},"workload":{"operations":[{"transaction":{"ops":[{"op":"replace","docLocation":{"method":"pool","poolSize":"$poolSize","poolSelectionStrategy":"randomUniform"}},{"op":"insert","docLocation":{"method":"uuid"}}],"bounds":{"forSeconds":"$forSeconds"}}}]},"vars":{"poolSize":10000,"driverVer":6,"forSeconds":300,"performerVer":1,"horizontalScaling":20},"graph_type":"Simplified","grouping_type":"Average","merging_type":"Average","trimming_seconds":20,"bucketise_seconds":0,"include_metrics":false},
        stellarNebulaGets: {
          "inputs": [{
            "viewing": "cluster",
            "params": [{
              "type": "unmanaged",
              "memory": 28000,
              "region": "us-east-2",
              "scheme": "protostellar",
              "storage": "couchstore",
              "version": "7.1.1-3175-enterprise",
              "cpuCount": 16,
              "instance": "c5.4xlarge",
              "replicas": 0,
              "topology": "A",
              "nodeCount": 1,
              "compaction": "disabled",
              "stellarNebulaSha": "945b3d0e611ddb7549453fa30b22905cb4d33a9e"
            }]
          }],
          "group_by": "variables.com.couchbase.protostellar.executorMaxThreadCount",
          "display": "duration_average_us",
          "impl": {"language": "Java"},
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
          "graph_type": "Simplified",
          "grouping_type": "Average",
          "merging_type": "Average",
          "trimming_seconds": 20,
          "bucketise_seconds": 0,
          "include_metrics": false,
          "exclude_gerrit": false,
          "exclude_snapshots": false
        }
      }
    }
}
</script>

