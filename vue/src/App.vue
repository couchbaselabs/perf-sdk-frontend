<template>
  <div id="app">
    <b-navbar toggleable="lg" variant="info" class="primary">
      <b-navbar-brand href="#">SDK Performance</b-navbar-brand>

      <b-navbar-toggle target="nav-collapse"></b-navbar-toggle>

      <b-collapse id="nav-collapse" is-nav>
        <b-navbar-nav>
          <li class="nav-item"><router-link to="/explorer" class="nav-link">Explorer</router-link></li>
          <li class="nav-item"><router-link to="/java" class="nav-link">Java</router-link></li>
          <li class="nav-item"><router-link to="/kotlin" class="nav-link">Kotlin</router-link></li>
          <li class="nav-item"><router-link to="/scala" class="nav-link">Scala</router-link></li>
          <li class="nav-item"><router-link to="/dotnet" class="nav-link">.NET</router-link></li>
          <li class="nav-item"><router-link to="/go" class="nav-link">Go</router-link></li>
          <li class="nav-item"><router-link to="/python" class="nav-link">Python</router-link></li>
          <li class="nav-item"><router-link to="/node" class="nav-link">Node</router-link></li>
          <li class="nav-item"><router-link to="/cpp" class="nav-link">C++</router-link></li>
          <li class="nav-item"><router-link to="/ruby" class="nav-link">Ruby</router-link></li>
          <li class="nav-item"><router-link to="/versus" class="nav-link">Versus</router-link></li>
        </b-navbar-nav>
        <b-navbar-nav class="ml-auto">
          <li class="nav-item" right><router-link to="/situationalRuns" class="nav-link">Situational</router-link></li>
        </b-navbar-nav>
      </b-collapse>
    </b-navbar>

    <b-container fluid class="main">
      <!-- route outlet -->
      <!-- component matched by the route will render here -->
      <router-view class="view"></router-view>
    </b-container>
  </div>
</template>

<script>

export default {
  name: 'App',
  components: {
  }
}
</script>

<style>
@import url('https://fonts.googleapis.com/css2?family=Lato&display=swap');

#app {
  font-family: "Lato", Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  font-smoothing: antialiased;
  color: #2c3e50;
}

.main {
  padding: 1rem
}

.nav-item {
  color: white !important;
}
</style>
