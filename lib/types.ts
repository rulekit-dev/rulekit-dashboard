export interface Workspace {
  name: string;
  description: string;
  created_at: string;
}

export interface Ruleset {
  workspace: string;
  key: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface Draft {
  workspace: string;
  ruleset_key: string;
  dsl: DSL;
  updated_at: string;
}

export interface Version {
  workspace: string;
  ruleset_key: string;
  version: number;
  checksum: string;
  dsl: DSL;
  created_at: string;
}

export interface SchemaField {
  type: "string" | "number" | "boolean" | "enum";
  options?: string[];
}

export interface VersionManifest {
  workspace: string;
  ruleset_key: string;
  version: number;
  checksum: string;
  created_at: string;
}

export type Strategy = "first_match" | "all_matches";

export interface RuleNode {
  id: string;
  name: string;
  strategy: Strategy;
  schema: Record<string, SchemaField>;
  inputColumns: string[];
  outputColumns: string[];
  rows: DecisionRow[];
}

export interface DSLEdge {
  from: string;
  to: string;
  map?: Record<string, string>;
}

export interface DSL {
  dsl_version: "v1";
  entry: string;
  nodes: RuleNode[];
  edges: DSLEdge[];
}

export interface DecisionRow {
  id: string;
  conditions: Record<string, Condition>;
  outputs: Record<string, unknown>;
}


// API-facing formats (what the backend expects)
export interface ApiRule {
  id: string;
  name: string;
  when: Condition[];
  then: Record<string, unknown>;
}

export interface ApiNode {
  id: string;
  strategy: Strategy;
  schema: Record<string, SchemaField>;
  rules: ApiRule[];
}

export interface ApiDSL {
  dsl_version: "v1";
  entry: string;
  nodes: ApiNode[];
  edges: DSLEdge[];
}

// Convert a single RuleNode's rows → ApiRules
function nodeRowsToApiRules(node: RuleNode): ApiRule[] {
  const apiRules: ApiRule[] = [];
  if (node.rows.length === 0) {
    return apiRules;
  }
  for (let i = 0; i < node.rows.length; i++) {
    const row = node.rows[i];
    const when: Condition[] = [];
    for (const field of node.inputColumns) {
      const cond = row.conditions[field];
      if (cond) when.push({ field, op: cond.op, value: cond.value });
    }
    const then: Record<string, unknown> = {};
    for (const key of node.outputColumns) {
      if (row.outputs[key] !== undefined) then[key] = row.outputs[key];
    }
    apiRules.push({
      id: node.rows.length === 1 ? `${node.id}_r0` : `${node.id}_r${i}`,
      name: node.rows.length === 1 ? node.name : `${node.name || "Untitled"} #${i + 1}`,
      when,
      then,
    });
  }
  return apiRules;
}

// Convert API rules back to UI rows for a single node
function apiRulesToNodeRows(apiRules: ApiRule[]): { inputColumns: string[]; outputColumns: string[]; rows: DecisionRow[] } {
  const inputFieldsSet = new Set<string>();
  const outputKeysSet = new Set<string>();
  const rows: DecisionRow[] = [];

  for (const apiRule of apiRules) {
    for (const cond of apiRule.when) inputFieldsSet.add(cond.field);
    for (const key of Object.keys(apiRule.then)) outputKeysSet.add(key);

    const conditions: Record<string, Condition> = {};
    for (const cond of apiRule.when) {
      conditions[cond.field] = cond;
    }
    rows.push({
      id: crypto.randomUUID(),
      conditions,
      outputs: { ...apiRule.then },
    });
  }

  return {
    inputColumns: Array.from(inputFieldsSet),
    outputColumns: Array.from(outputKeysSet),
    rows,
  };
}

// Convert UI DSL → API DSL (for saving)
export function dslToApi(dsl: DSL): ApiDSL {
  return {
    dsl_version: dsl.dsl_version,
    entry: dsl.entry,
    nodes: dsl.nodes.map((node) => ({
      id: node.id,
      strategy: node.strategy,
      schema: node.schema,
      rules: nodeRowsToApiRules(node),
    })),
    edges: dsl.edges,
  };
}

// Convert API DSL → UI DSL (for loading)
export function apiToDsl(apiDsl: ApiDSL): DSL {
  return {
    dsl_version: apiDsl.dsl_version,
    entry: apiDsl.entry,
    nodes: apiDsl.nodes.map((apiNode) => {
      const { inputColumns, outputColumns, rows } = apiRulesToNodeRows(apiNode.rules);
      return {
        id: apiNode.id,
        name: apiNode.id,
        strategy: apiNode.strategy,
        schema: apiNode.schema,
        inputColumns,
        outputColumns,
        rows,
      };
    }),
    edges: apiDsl.edges || [],
  };
}

export interface Condition {
  field: string;
  op: "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "contains" | "not_contains";
  value: string | number | boolean;
}

export interface User {
  id: string;
  email: string;
  created_at: string;
  last_login_at: string;
}

export interface UserRole {
  user_id: string;
  workspace: string;
  role_mask: number;
}

export interface APIKey {
  id: string;
  name: string;
  workspace: string;
  role: number;
  created_at: string;
  expires_at?: string;
  revoked_at?: string;
}

export interface ApiError {
  code: string;
  message: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}

export const ROLE_VIEWER = 1;
export const ROLE_EDITOR = 3;
export const ROLE_ADMIN = 7;

export function roleName(mask: number): string {
  if (mask >= ROLE_ADMIN) return "Admin";
  if (mask >= ROLE_EDITOR) return "Editor";
  return "Viewer";
}

export function hasRole(userRole: number, required: number): boolean {
  return (userRole & required) !== 0;
}
