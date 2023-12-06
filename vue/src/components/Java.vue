<template>
  <b-container>

    <b-tabs content-class="mt-3" lazy>
      <b-tab title="Classic" active>
        <JavaClassic/>
      </b-tab>
      <b-tab title="couchbase2://">
        <JavaCouchbase2/>
      </b-tab>
      <b-tab title="Experiments">
        <JavaExperiments/>
      </b-tab>
    </b-tabs>
  </b-container>
</template>

<script>
export default {
}
</script>

