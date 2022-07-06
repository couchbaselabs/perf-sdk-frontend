import Vue from 'vue';
import VueRouter from 'vue-router';
import Explorer from './components/Explorer.vue'
import Java from './components/Java.vue'
import Python from './components/Python.vue'
import Single from './components/Single.vue'

Vue.use(VueRouter)

const routes = [
    {
        path: "/",
        name: "Java",
        component: Java,
    },
    {
        path: "/explorer",
        name: "Explorer",
        component: Explorer,
        props: true
    },
    {
        path: "/java",
        name: "Java",
        component: Java,
    },
    {
        path: "/python",
        name: "Python",
        component: Python,
    },
    {
        path: "/single",
        name: "Single",
        component: Single,
        props: true
    },
]

const router = new VueRouter({
    routes // short for `routes: routes`
})

export default router
