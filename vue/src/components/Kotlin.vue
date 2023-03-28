<template>
  <div>
    <Shared :language="'Kotlin'"></Shared>
    <Metrics :language="'Kotlin'"></Metrics>
  </div>
</template>

<script>
import Shared from "@/components/Shared.vue";
import Metrics from "./Metrics.vue";

export default {
  components: {Shared,Metrics}
}
</script>

