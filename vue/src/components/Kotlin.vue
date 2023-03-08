<template>
  <div>
    <Shared :language="'Kotlin'"></Shared>
    <Metrics :language="'Kotlin'"></Metrics>
  </div>
</template>

<script>
import Shared from "@/components/Shared";
import Metrics from "./Metrics";

export default {
  components: {Shared,Metrics}
}
</script>

