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

export interface DSL {
  dsl_version: "v1";
  strategy: "first_match" | "all_matches";
  schema: Record<string, SchemaField>;
  rules: Rule[];
  default?: Record<string, unknown>;
}

export interface DecisionRow {
  id: string;
  conditions: Record<string, Condition>;
  outputs: Record<string, unknown>;
}

export interface Rule {
  id: string;
  name: string;
  inputColumns: string[];
  outputColumns: string[];
  rows: DecisionRow[];
}

// API-facing rule format (what the backend expects)
export interface ApiRule {
  id: string;
  name: string;
  when: Condition[];
  then: Record<string, unknown>;
}

export interface ApiDSL {
  dsl_version: "v1";
  strategy: "first_match" | "all_matches";
  schema: Record<string, SchemaField>;
  rules: ApiRule[];
  default?: Record<string, unknown>;
}

// Convert UI DSL → API DSL (for saving)
// Each DecisionRow becomes a separate API rule
export function dslToApi(dsl: DSL): ApiDSL {
  const apiRules: ApiRule[] = [];
  for (const rule of dsl.rules) {
    if (rule.rows.length === 0) {
      apiRules.push({ id: rule.id, name: rule.name, when: [], then: {} });
      continue;
    }
    for (let i = 0; i < rule.rows.length; i++) {
      const row = rule.rows[i];
      const when: Condition[] = [];
      for (const field of rule.inputColumns) {
        const cond = row.conditions[field];
        if (cond) when.push({ field, op: cond.op, value: cond.value });
      }
      const then: Record<string, unknown> = {};
      for (const key of rule.outputColumns) {
        if (row.outputs[key] !== undefined) then[key] = row.outputs[key];
      }
      apiRules.push({
        id: rule.rows.length === 1 ? rule.id : `${rule.id}__row_${i}`,
        name: rule.rows.length === 1 ? rule.name : `${rule.name || "Untitled"} #${i + 1}`,
        when,
        then,
      });
    }
  }
  return {
    dsl_version: dsl.dsl_version,
    strategy: dsl.strategy,
    schema: dsl.schema,
    rules: apiRules,
    default: dsl.default,
  };
}

// Convert API DSL → UI DSL (for loading)
// Groups API rules back into decision tables by detecting __row_ suffix
export function apiToDsl(apiDsl: ApiDSL): DSL {
  const ruleGroups = new Map<string, { name: string; apiRules: ApiRule[] }>();
  const order: string[] = [];

  for (const apiRule of apiDsl.rules) {
    const rowMatch = apiRule.id.match(/^(.+)__row_\d+$/);
    const baseId = rowMatch ? rowMatch[1] : apiRule.id;
    const baseName = rowMatch
      ? apiRule.name.replace(/ #\d+$/, "")
      : apiRule.name;

    if (!ruleGroups.has(baseId)) {
      ruleGroups.set(baseId, { name: baseName, apiRules: [] });
      order.push(baseId);
    }
    ruleGroups.get(baseId)!.apiRules.push(apiRule);
  }

  const rules: Rule[] = order.map((baseId) => {
    const group = ruleGroups.get(baseId)!;
    const inputFieldsSet = new Set<string>();
    const outputKeysSet = new Set<string>();
    const rows: DecisionRow[] = [];

    for (const apiRule of group.apiRules) {
      for (const cond of apiRule.when) inputFieldsSet.add(cond.field);
      for (const key of Object.keys(apiRule.then)) outputKeysSet.add(key);

      const conditions: Record<string, Condition> = {};
      for (const cond of apiRule.when) {
        conditions[cond.field] = cond;
      }
      rows.push({
        id: apiRule.id.includes("__row_") ? apiRule.id : crypto.randomUUID(),
        conditions,
        outputs: { ...apiRule.then },
      });
    }

    return {
      id: baseId,
      name: group.name,
      inputColumns: Array.from(inputFieldsSet),
      outputColumns: Array.from(outputKeysSet),
      rows,
    };
  });

  return {
    dsl_version: apiDsl.dsl_version,
    strategy: apiDsl.strategy,
    schema: apiDsl.schema,
    rules,
    default: apiDsl.default,
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
