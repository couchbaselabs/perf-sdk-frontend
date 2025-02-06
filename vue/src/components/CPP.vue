<template>
  <div>
    <Shared :language="'C++'"></Shared>
    <Metrics :language="'C++'"></Metrics>
    <TransactionsShared :language="'C++'"></TransactionsShared>
  </div>
</template>

<script>
import Shared from "@/components/Shared.vue";
import TransactionsShared from "@/components/TransactionsShared.vue";
import Metrics from "@/components/Metrics.vue";

export default {
  components: {Metrics, Shared, TransactionsShared}
}
</script>

