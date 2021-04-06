import {Get} from "@nestjs/common";
import {Injectable} from "@nestjs/common";
import {DatabaseService} from "./database.service";
import {Filtered} from "./app.controller";

export class Panel {
    // cluster
    viewing: string
    // [{"env":"AWS","disk":"ssd","nodes":3,"node_size":"m4"},{"env":"GCP","disk":"ssd","nodes":4,"node_size":"x2"}]
    params: Array<Object>
}

export class Input {

    inputs: Array<Panel>

    group_by: string // "cluster.version"
    display: string // latency_average_us

    cluster?: Object
    impl?: Object
    workload?: Object
    vars?: Object

    // constructor(inputs: Array<string>, group_by: string = DashboardService.default_group_by, display: string = DashboardService.default_display) {
    //     this.inputs = inputs;
    //     this.group_by = group_by;
    //     this.display = display;
    // }

    group_by_1(): string {
        return `params->'${this.group_by.replace(".", "'->>'")}'`
    }

    group_by_2(): string {
        const split = this.group_by.split(".")
        return `{${split.join(",")}}`
    }
}

export class Params {
    impl: any
    cluster: any
    workload: any
    vars: any
    other: any

    constructor(impl: any, cluster: any, workload: any, vars: any, other: any) {
        this.impl = impl;
        this.cluster = cluster;
        this.workload = workload;
        this.vars = vars;
        this.other = other;
    }
}

@Injectable()
export class DashboardService {
    public static LANG_LATEST = "impl.language (latest)"

    default_impl = {"version": "1.1.5-SNAPSHOT", "language": "java"}
    default_cluster = {"env": "AWS", "disk": "ssd", "nodes": 3, "node_size": "m4", "version": "6.6.1-stable"}
    default_workload = {"description": "$number_of_inserts inserts, one replace with chance of contention"}
    default_other = {"runtime": 10}
    default_vars = {"durability": "MAJORITY", "doc_pool_size": 10, "number_of_inserts": 3, "horizontal_scaling": 1}
    public static default_display = 'latency_average_us'
    public static default_group_by = 'cluster.version'

    constructor(private readonly database: DatabaseService) {
    }


    // private async add_graph(input: Input, params: Params): Promise<any> {
    //     let labels = []
    //     let values = []
    //     const runs = await this.database.get_runs(params.cluster, params.impl.json, params.vars, params.other, input.group_by_2())
    //     const run_ids = runs.map(v => v.id)
    //
    //     if (run_ids.length != 0) {
    //         const buckets = await this.database.get_groupings(input.group_by_1(), run_ids, input.display)
    //         buckets.sort((a, b) => a.grouping.localeCompare(b.grouping))
    //         buckets.forEach(b => {
    //             labels.push(b.grouping)
    //             values.push(b.value)
    //         })
    //     }
    //
    //     return {
    //         "type": "bar",
    //         "runs": runs,
    //         "chosen": {
    //             "cluster": params.cluster,
    //             "workload": params.workload,
    //             "other": params.other,
    //             "vars": params.vars,
    //             "impl": params.impl.json
    //         },
    //         "data": {
    //             "labels": labels,
    //             "datasets": [
    //                 {"values": values}
    //             ]
    //         }
    //     }
    // }

    private async add_graph(compared_json: Object, input: Input): Promise<any> {
        let labels = []
        let values = []
        const runs = await this.database.get_runs(compared_json, input.group_by_2())
        const run_ids = runs.map(v => v.id)

        if (run_ids.length != 0) {
            const buckets = await this.database.get_groupings(input.group_by_1(), run_ids, input.display)
            buckets.sort((a, b) => a.grouping.localeCompare(b.grouping))
            buckets.forEach(b => {
                labels.push(b.grouping)
                values.push(b.value)
            })
        }

        return {
            "type": "bar",
            "runs": runs,
            "chosen": compared_json,
            // "chosen": {
            //     "cluster": params.cluster,
            //     "workload": params.workload,
            //     "other": params.other,
            //     "vars": params.vars,
            //     "impl": params.impl.json
            // },
            "data": {
                "labels": labels,
                "datasets": [
                    // {"values": values}
                    {
                        // "color": "red",
                        "backgroundColor": "#D7ECD9",
                        "data": values
                    }
                ]
            }
        }
    }

    default_params(): Params {
        return new Params(this.default_impl, this.default_cluster, this.default_workload, this.default_vars, this.default_other)
    }

    async gen_dashboard_wrapper(inputs: Input): Promise<any> {
        return {
            "panels": await this.gen_panels(inputs, inputs.inputs[0], inputs.inputs.splice(1))
        }
    }

    public async get_filtered(group_by: string): Promise<Filtered> {
        const runs = await this.database.get_runs_raw()

        const clusters = new Set<string>();
        const impls = new Set<string>();
        const workloads = new Set<string>();
        const vars_all = new Set<string>();
        const vars_by_workload = new Map<string, Set<string>>()

        const group_by_split = group_by.split(".")

        runs.forEach(run_raw => {
            const run = run_raw['params']

            DashboardService.remove_display_by_if_needed(run, group_by_split)

            const cluster = JSON.stringify(run['cluster'])
            clusters.add(cluster)

            const impl = JSON.stringify(run['impl'])
            impls.add(impl)

            const workload = JSON.stringify(run['workload'])
            workloads.add(workload)

            const vars = JSON.stringify(run['vars'])
            vars_all.add(vars)
            if (!vars_by_workload.has(workload)) {
                vars_by_workload[workload] = new Set(vars)
            }
            else {
                vars_by_workload[workload].add(vars)
            }
        })

        return new Filtered([...clusters.values()],
            [...workloads.values()],
            [...impls.values()],
            [...vars_all.values()],
            vars_by_workload)

    }

    static remove_display_by_if_needed(input: Object, display: Array<string>): void {
        const to_remove = display[0]
        const keys = Object.keys(input)

        if (keys.includes(to_remove)) {
            if (display.length == 1) {
                delete input[to_remove]
            }
            else {
                const next = input[to_remove]
                this.remove_display_by_if_needed(next, display.splice(1))
            }
        }
    }

    async get_group_by(): Promise<Array<string>> {
        const runs = await this.database.get_runs_raw()
        let keys = new Set<string>();
        runs.forEach(run => {
            const props = DashboardService.gen_strings("", run['params'])
            props.forEach((p) => keys.add(p))
        })
        return [...keys.values()]
    }

    static gen_strings(input_key: string, input: Object): Array<string> {
        let out = []
        const keys = Object.keys(input);
        const next_key = input_key.length == 0 ? "" : input_key + ".";

        keys.forEach((key) => {
            const v = input[key]
            if (typeof v === 'object') {
                const next = this.gen_strings(next_key + key, v)
                out = out.concat(next)
            }
            else {
                out.push(next_key + key)
            }
        })

        return out
    }

    private async gen_panels(input: Input, panel: Panel, remaining: Array<Panel>): Promise<Array<Object>> {
        let panels = []

        for (let key in panel.params) {
            const param = panel.params[key];
            let graphs = []
            let sub_panels = []

            if (input.inputs.length == 1) {

                const compared_json = {
                    "cluster": input.cluster,
                    "impl": input.impl,
                    "workload": input.workload,
                    "vars": input.vars
                }

                switch (panel.viewing) {
                    case 'cluster':
                        compared_json.cluster = param;
                        break;
                    case 'impl':
                        compared_json.cluster = param;
                        break;
                    case 'workload':
                        compared_json.workload = param;
                        break;
                    case 'vars':
                        compared_json.vars = param;
                        break;
                }

                const graph = await this.add_graph(compared_json, input)
                graphs.push(graph)
            } else {
                sub_panels = await this.gen_panels(input, remaining[0], remaining.splice(1))
            }

            panels.push({
                "title": `${panel.viewing} ${JSON.stringify(param)}`,
                "graphs": graphs,
                "panels": sub_panels
            })
        }

        return panels
    }

    // private async gen_dashboard(input: Input): Promise<Array<any>> {
    //     let panels = []
    //     const next = input.inputs[0]
    //
    //     for (let key in next.params) {
    //         const param = next.params[key];
    //         let graphs = []
    //         let sub_panels = []
    //
    //         if (input.inputs.length == 1) {
    //             const graph = await this.add_graph(input, params)
    //             graphs.push(graph)
    //         } else {
    //             const new_inputs = input.inputs.slice(1)
    //             const new_input = new Input(new_inputs, input.group_by, input.display)
    //             sub_panels = await this.gen_dashboard(new_input, params)
    //         }
    //
    //         panels.push({
    //             "title": `${next.viewing} ${param}`,
    //             "graphs": graphs,
    //             "panels": sub_panels
    //         })
    //     }
    //
    //     return panels
    // }
    // private async gen_dashboard(input: Input, params: Params = this.default_params()): Promise<Array<any>> {
    //     let panels = []
    //     const next = input.inputs[0]
    //
    //     if (next == DashboardService.LANG_LATEST || next == "impl.language") {
    //         const impls = await this.database.get_latest_implementations()
    //
    //         for (let implsKey in impls) {
    //             const impl = impls[implsKey];
    //             params.impl = impl
    //             let graphs = []
    //             let sub_panels = []
    //
    //             if (input.inputs.length == 1) {
    //                 const graph = await this.add_graph(input, params)
    //                 graphs.push(graph)
    //             } else {
    //                 const new_inputs = input.inputs.slice(1)
    //                 const new_input = new Input(new_inputs, input.group_by, input.display)
    //                 sub_panels = await this.gen_dashboard(new_input, params)
    //             }
    //
    //             panels.push({
    //                 "title": `${implsKey}`,
    //                 "graphs": graphs,
    //                 "panels": sub_panels
    //             })
    //         }
    //     } else if (next == "cluster.version") {
    //         const clusters = await this.database.get_cluster_versions()
    //
    //         for (const cluster_vers of clusters) {
    //             params.cluster.version = cluster_vers
    //             let graphs = []
    //             let sub_panels = []
    //
    //             if (input.inputs.length == 1) {
    //                 const graph = await this.add_graph(input, params)
    //                 graphs.push(graph)
    //             } else {
    //                 const new_inputs = input.inputs.slice(1)
    //                 const new_input = new Input(new_inputs, input.group_by, input.display)
    //                 sub_panels = await this.gen_dashboard(new_input, params)
    //             }
    //
    //             panels.push({
    //                 "title": `${cluster_vers}`,
    //                 "graphs": graphs,
    //                 "panels": sub_panels
    //             })
    //         }
    //     }
    //
    //     return panels
    // }
}