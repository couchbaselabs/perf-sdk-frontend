import Vue from 'vue';
import VueRouter from 'vue-router';
import Explorer from './components/Explorer.vue'
import Java from './components/Java.vue'
import Python from './components/Python.vue'
import Node from './components/Node.vue'
import Scala from './components/Scala.vue'
import Kotlin from './components/Kotlin.vue'
import CPP from './components/CPP.vue'
import Ruby from './components/Ruby.vue'
import Single from './components/Single.vue'
import Versus from './components/Versus.vue'
import Dotnet from './components/Dotnet.vue'
import Go from './components/Go.vue'
import SituationalRun from './components/SituationalRun.vue'
import SituationalRuns from './components/SituationalRuns.vue'

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
        path: "/node",
        component: Node,
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
        path: "/go",
        component: Go,
    },
    {
        path: "/ruby",
        component: Ruby,
    },
    {
        path: "/versus",
        component: Versus,
    },
    {
        path: "/cpp",
        component: CPP,
    },
    {
        path: "/situationalRun",
        component: SituationalRun,
    },
    {
        path: "/situationalRuns",
        component: SituationalRuns,
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
