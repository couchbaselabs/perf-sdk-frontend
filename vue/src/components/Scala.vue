<template>
  <b-container>
    <Shared :language="'Scala'"></Shared>
    <Metrics :language="'Scala'"></Metrics>
  </b-container>
</template>

<script>
import Metrics from "./Metrics";
import Shared from "@/components/Shared";

export default {
  components: {Shared, Metrics}
}
</script>

