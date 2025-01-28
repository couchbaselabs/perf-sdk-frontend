<template>
  <b-container>
    <Shared :language="'Go'"></Shared>
    <Metrics :language="'Go'"></Metrics>
  </b-container>
</template>

<script>
import Shared from "@/components/Shared.vue";
import Metrics from "@/components/Metrics.vue";

export default {
  components: {Metrics, Shared}
}
</script>

