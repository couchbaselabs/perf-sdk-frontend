<template>
  <div>
    <Shared :language="'C++'"></Shared>
    <TransactionsShared :language="'C++'"></TransactionsShared>
  </div>
</template>

<script>
import Shared from "@/components/Shared.vue";
import TransactionsShared from "@/components/TransactionsShared.vue";

export default {
  components: {Shared, TransactionsShared}
}
</script>

