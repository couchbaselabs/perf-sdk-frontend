<template>
  <b-container>
    <Shared :language="'Node'"></Shared>
    <Metrics :language="'Node'"></Metrics>
  </b-container>
</template>

<script>
import Shared from "@/components/Shared.vue";
import Metrics from "@/components/Metrics.vue";

export default {
  components: {Metrics, Shared},
  data() {
    return {
    }
  }
}
</script>

