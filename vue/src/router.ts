import { createRouter, createWebHistory } from 'vue-router'

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
import Rust from './components/Rust.vue'
import SituationalRun from './components/SituationalRun.vue'
import SituationalRuns from './components/SituationalRuns.vue'
import SituationalSingle from './components/SituationalSingle.vue'
import Runs from "./components/Runs.vue";

const routes = [
    {
        path: "/",
        redirect: "/scala",
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
        name: 'Versus',
        component: Versus,
    },
    {
        path: "/cpp",
        component: CPP,
    },
    {
        path: "/rust",
        component: Rust,
    },
    {
        // path: "/single/:runId/:display",
        path: "/single",
        name: "Single",
        component: Single,
        props: true
    },
    {
        path: "/situationalRuns",
        name: 'SituationalRuns',
        component: SituationalRuns,
        alias: ["/situational"],
    },
    {
        path: "/situationalRun",
        name: 'SituationalRun',
        component: SituationalRun,
        alias: ["/situational/run"],
    },
    // Pretty param-based routes (backward compatible with query-based)
    {
        path: "/situational/:situationalRunId",
        name: 'SituationalRunParam',
        component: SituationalRun,
        props: true,
    },
    {
        path: "/situationalSingle",
        name: 'SituationalSingle',
        component: SituationalSingle,
        props: true,
        alias: ["/situational/run/single"],
    },
    {
        path: "/situational/:situationalRunId/run/:runId",
        name: 'SituationalSingleParam',
        component: SituationalSingle,
        props: true,
    },
    {
        path: "/runs",
        component: Runs,
        props: true
    },
]

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL || '/results/'),
    routes, // short for `routes: routes`
    scrollBehavior() {
        return { top: 0 }
    }
})

// Normalize/guard situational routes for better UX
router.beforeEach((to, _from, next) => {
    const q = to.query as Record<string, any>

    // If situationalRun route missing required query, go to list
    if (to.path === '/situationalRun' && !q?.situationalRunId) {
        return next({ path: '/situationalRuns' })
    }

    // If single view missing data, send to best-known parent
    if (to.path === '/situationalSingle' && (!q?.situationalRunId || !q?.runId)) {
        if (q?.situationalRunId) {
            return next({ path: '/situationalRun', query: { situationalRunId: q.situationalRunId } })
        }
        return next({ path: '/situationalRuns' })
    }

    // Normalize pretty param routes to query-based that components currently use
    const p = to.params as Record<string, any>
    if (to.name === 'SituationalRunParam' && p?.situationalRunId && !q?.situationalRunId) {
        return next({ path: '/situationalRun', query: { situationalRunId: p.situationalRunId } })
    }

    if (to.name === 'SituationalSingleParam' && (p?.situationalRunId || p?.runId) && (!q?.situationalRunId || !q?.runId)) {
        return next({ path: '/situationalSingle', query: { situationalRunId: p.situationalRunId, runId: p.runId } })
    }

    return next()
})

export default router
