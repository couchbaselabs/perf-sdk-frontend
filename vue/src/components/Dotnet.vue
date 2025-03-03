<template>
  <b-container>
    <Shared :language="'.NET'"></Shared>
    <Metrics :language="'.NET'"></Metrics>
  </b-container>
</template>

<script>
import Shared from "@/components/Shared.vue";
import Metrics from "@/components/Metrics.vue";

export default {
  components: {Shared,Metrics}
}
</script>

