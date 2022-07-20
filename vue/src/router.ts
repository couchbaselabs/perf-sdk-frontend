import Vue from 'vue';
import VueRouter from 'vue-router';
import Explorer from './components/Explorer.vue'
import Java from './components/Java.vue'
import Python from './components/Python.vue'
import Scala from './components/Scala.vue'
import Kotlin from './components/Kotlin.vue'
import Single from './components/Single.vue'
import Versus from './components/Versus.vue'
import Dotnet from './components/Dotnet.vue'

Vue.use(VueRouter)

const routes = [
    {
        path: "/",
        component: Java,
    },
    {
        path: "/explorer",
        name: 'Explorer',
        component: Explorer,
        props: true
    },
    {
        path: "/java",
        component: Java,
    },
    {
        path: "/python",
        component: Python,
    },
    {
        path: "/kotlin",
        component: Kotlin,
    },
    {
        path: "/scala",
        component: Scala,
    },
    {
        path: "/dotnet",
        component: Dotnet,
    },
    {
        path: "/versus",
        component: Versus,
    },
    {
        // path: "/single/:runId/:display",
        path: "/single",
        name: "Single",
        component: Single,
        props: true
    },
]

const router = new VueRouter({
    mode: 'history',
    routes // short for `routes: routes`
})

export default router
