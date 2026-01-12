// Component-specific types
export interface SidebarProps {
  activeSdk?: string;
  onSdkChange?: (sdk: string) => void;
  mode?: "performance" | "situational";
  selectedSituationalSdk?: string;
  onSituationalSdkChange?: (sdk: string) => void;
  onModeChange?: (mode: "performance" | "situational") => void;
}

export interface MetricsOverviewProps {
  runId: string;
  initialData?: any;
}

export interface PerformanceDashboardProps {
  initialFilters?: any;
}

export interface DashboardResultsProps {
  dashboardInput: any;
  isLoading: boolean;
  errorMessage?: string;
  onRefresh?: () => void;
  onExport?: () => void;
}

export interface FilterState {
  [key: string]: any;
}

export interface ColumnFilterConfig {
  type: 'text' | 'select' | 'date' | 'number';
  options?: string[];
  range?: [number, number];
}

export interface TableColumn {
  key: string;
  title: string;
  sortable?: boolean;
  filterable?: boolean;
  filterConfig?: ColumnFilterConfig;
}

export interface PaginationState {
  page: number;
  limit: number;
  total: number;
}
