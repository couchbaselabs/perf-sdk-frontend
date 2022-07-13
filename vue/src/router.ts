import Vue from 'vue';
import VueRouter from 'vue-router';
import Explorer from './components/Explorer.vue'
import Java from './components/Java.vue'
import Python from './components/Python.vue'
import Kotlin from './components/Kotlin.vue'
import Single from './components/Single.vue'

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
        path: "/single/:runId/:display",
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
