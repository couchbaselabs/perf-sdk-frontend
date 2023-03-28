<template>
  <b-container>
    <Shared :language="'Scala'"></Shared>
    <Metrics :language="'Scala'"></Metrics>
  </b-container>
</template>

<script>
import Metrics from "./Metrics.vue";
import Shared from "@/components/Shared.vue";

export default {
  components: {Shared, Metrics}
}
</script>

