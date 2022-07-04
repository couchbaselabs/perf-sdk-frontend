// TODO refactor this between frontend and backend
export interface Panel {
    // cluster
    viewing: string;
    // [{"env":"AWS","disk":"ssd","nodes":3,"node_size":"m4"},{"env":"GCP","disk":"ssd","nodes":4,"node_size":"x2"}]
    params: Array<Object>;
}

export interface Input {
    inputs: Array<Panel>;

    group_by: string; // "cluster.version"
    display: string; // duration_average_us

    cluster?: Object;
    impl?: Object;
    workload?: Object;
    vars?: Object;

    // Simplified (aggregated bar) or Full (line)
    graph_type: string;

    // If we have reruns, how to display them - e.g. side-by-side, or averaging the results
    grouping_type: string;
}
