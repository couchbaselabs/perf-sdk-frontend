<template>
  <b-container>
    <Shared :language="'Python'"></Shared>
    <Metrics :language="'Python'"></Metrics>
  </b-container>
</template>

<script>
import Shared from "@/components/Shared.vue";
import Metrics from "@/components/Metrics.vue";

export default {
  components: {Metrics, Shared},
}
</script>

