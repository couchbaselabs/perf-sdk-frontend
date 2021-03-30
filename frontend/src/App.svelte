<script lang="ts">
    import Chart from 'svelte-frappe-charts';

    let display = [
        {id: 6, text: `latency_average_us`},
        {id: 4, text: `latency_min_us`},
        {id: 5, text: `latency_max_us`},
        {id: 7, text: `latency_p50_us`},
        {id: 8, text: `latency_p95_us`},
        {id: 9, text: `latency_p99_us`},
        {id: 0, text: `transactions_total`},
        {id: 1, text: `transactions_success`},
        {id: 2, text: `transactions_failed`},
        {id: 3, text: `transactions_unstaging_incomplete`}
    ];
    const initial = ['Loading...']
    let group_by = initial
    let clusters = initial
    let workloads = initial
    let impls = initial
    let vars = initial
    let results

    let selected_workload, selected_impl, selected_cluster, selected_group_by, selected_vars,
            selected_display = display[0];
    // let selected2, selected3, selected_display = display[0], selected_group_by;

    let fetching;
    let query_params;

    function handleSubmit() {
        fetching = fetchQuery()
    }

    async function handleGroupByChanged() {
        const url = new URL(`http://localhost:3002/dashboard/filtered`);
        url.searchParams.append("group_by", selected_group_by);
        const res = await fetch(url);
        const json = await res.json();
        clusters = json.clusters;
        workloads = json.workloads;
        impls = json.impls;
        vars = json.vars;
        selected_cluster = clusters[0]
        selected_workload = workloads[0]
        selected_impl = impls[0]
        selected_vars = vars[0]
        handleSubmit()
    }

    async function fetch_group_by_options() {
        const url = new URL(`http://localhost:3002/dashboard/group_by_options`);
        const res = await fetch(url);
        group_by = await res.json();
    }

    async function fetchQuery() {
        console.info(selected_cluster)
        console.info(selected_workload)
        console.info(selected_impl)
        console.info(selected_vars)
        console.info(JSON.parse(selected_cluster))
        console.info(JSON.parse(selected_workload))
        console.info(JSON.parse(selected_impl))
        console.info(JSON.parse(selected_vars))

        const input = {
            inputs: [{
                viewing: 'cluster',
                params: [JSON.parse(selected_cluster)]
            }],
            group_by: selected_group_by,
            display: selected_display.text,
            impl: JSON.parse(selected_impl),
            workload: JSON.parse(selected_workload),
            vars: JSON.parse(selected_vars)
        }

        query_params = JSON.stringify(input)

        // const url = new URL(`http://localhost:3002/dashboard/query`);
        const res = await fetch(`http://localhost:3002/dashboard/query`,
                {
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    },
                    method: "POST",
                    body: JSON.stringify(input)
                })

        // url.searchParams.append("query", input);
        // url.searchParams.append("group_by", group_by);
        // url.searchParams.append("display", display);
        // const res = await fetch(url);
        // const text: Array<Out> = await res.json();
        results = await res.json();
    }

    fetch_group_by_options()
    // handleSubmit()
</script>

<main>
    <form on:submit|preventDefault={handleSubmit} on:change={() => handleSubmit()}>

        <fieldset>
          <legend>Display</legend>

        <select bind:value={selected_group_by} on:change={() => handleGroupByChanged()}>
            {#each group_by as v}
                <option value={v}>{v}</option>
            {/each}
        </select>

        <select bind:value={selected_display} on:change={() => handleSubmit()}>
            {#each display as v}
                <option value={v}>
                    {v.text}
                </option>
            {/each}
        </select>
        </fieldset>

        <fieldset>
          <legend>Filter</legend>

        <select bind:value={selected_cluster}>
            {#each clusters as v}
                <option value={v}>{v}</option>
            {/each}
        </select>

        <select bind:value={selected_impl}>
            {#each impls as v}
                <option value={v}>{v}</option>
            {/each}
        </select>

        <select bind:value={selected_workload}>
            {#each workloads as v}
                <option value={v}>{v}</option>
            {/each}
        </select>

        <select bind:value={selected_vars}>
            {#each vars as v}
                <option value={v}>{v}</option>
            {/each}
        </select>
        </fieldset>


        <!--        <button type=submit>-->
        <!--            Submit-->
        <!--        </button>-->
    </form>

<!--        {query_params}-->


            <!--    {#await fetching}-->
    <!--        <p>Loading...</p>-->
    <!--    {:then results}-->
    <!--        {results}-->
    {#if results}
        {#each results.panels as panel}
            <h2>{panel.title}</h2>

            {#each panel.graphs as graph}
                <div class="graph">

<!--                    <table>-->
<!--                        <tr>-->
<!--                            <td><strong>Cluster:</strong></td>-->
<!--                            <td>{JSON.stringify(graph.chosen.cluster)}</td>-->
<!--                        </tr>-->
<!--                        <tr>-->
<!--                            <td><strong>Workload:</strong></td>-->
<!--                            <td>{JSON.stringify(graph.chosen.workload)}</td>-->
<!--                        </tr>-->
<!--                        <tr>-->
<!--                            <td><strong>Vars:</strong></td>-->
<!--                            <td>{JSON.stringify(graph.chosen.vars)}</td>-->
<!--                        </tr>-->
<!--                        <tr>-->
<!--                            <td><strong>Impl:</strong></td>-->
<!--                            <td>{JSON.stringify(graph.chosen.impl)}</td>-->
<!--                        </tr>-->
<!--                    </table>-->

                    <Chart data={graph.data} type={graph.type}/>

                    <table>
                        {#each graph.runs as r}
                            <tr>
                                <td>{r.id}</td>
<!--                                <td>{r.grouping}</td>-->
                                <td>{JSON.stringify(r.impl)}</td>
                                <td>{JSON.stringify(r.cluster)}</td>
                                <td>{JSON.stringify(r.workload)}</td>
                                <td>{JSON.stringify(r.vars)}</td>
                            </tr>
                            <!--            <p>{JSON.stringify(r)}</p>-->
                            <!--                <p>{r.id}</p>-->
                        {/each}
                    </table>

                </div>
            {/each}
        {/each}
    {:else}
        no results
    {/if}
        <!--    {/await}-->
</main>

<style>
    .graph {

    }
</style>