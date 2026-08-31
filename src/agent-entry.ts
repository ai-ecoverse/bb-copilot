export type JsonObject = Record<string, unknown>;
export type CustomAgent = JsonObject & { id?: unknown; command?: unknown; env?: unknown };

export const ACP_PLUGIN_ID = "provider-acp";

export const PROFILE = {
  id: "gh-copilot",
  providerId: "acp-gh-copilot",
  displayName: "GitHub Copilot",
  binary: "copilot",
  args: ["--acp"],
  // The skill directories the Copilot CLI reads (`copilot skill --help`), so bb
  // lists them in the composer beside its own. Project roots resolve from the
  // workspace, user roots from the home directory.
  nativeSkillRoots: {
    user: [".copilot/skills", ".agents/skills"],
    project: [".github/skills", ".agents/skills", ".claude/skills"],
  },
  // bb's permission modes as Copilot launch flags. "full" is Copilot's own
  // all-permissions switch; "accept-edits" allows the file-writing tools while
  // shell commands and URLs still ask. bb's default "auto" mode adds nothing,
  // so every request comes through ACP as before.
  permissionCli: {
    full: ["--allow-all"],
    workspaceWrite: ["--allow-tool=write"],
  },
  installHint: "Install GitHub Copilot CLI with `brew install --cask copilot-cli`, authenticate it, then run `bb plugin reload gh-copilot`.",
} as const;

/**
 * The id this plugin used before it was renamed, which collides with the
 * unrelated community `copilot` plugin. An entry is only treated as our own
 * leftover when its displayName still matches, so the other plugin's entry
 * (displayName "Copilot") is never touched.
 */
export const RENAMED_FROM = "copilot";

export function isObject(value: unknown): value is JsonObject {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function isOwnAgent(agent: CustomAgent | undefined): boolean {
  return agent?.id === PROFILE.id;
}

export function isRenamedAgent(agent: CustomAgent | undefined): boolean {
  return agent?.id === RENAMED_FROM && agent?.displayName === PROFILE.displayName;
}

/** Our entry under either id, so a rename carries the user's own keys over. */
export function findOwnAgent(agents: CustomAgent[]): CustomAgent | undefined {
  return agents.find(isOwnAgent) ?? agents.find(isRenamedAgent);
}

export function parseCustomAgents(value: unknown): CustomAgent[] {
  if (value === undefined || value === null || value === "") return [];
  if (typeof value !== "string") {
    throw new Error(`${ACP_PLUGIN_ID} customAgents must be a string`);
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) return [];
  const parsed: unknown = JSON.parse(trimmed);
  if (!Array.isArray(parsed)) {
    throw new Error(`${ACP_PLUGIN_ID} customAgents must be a JSON array; refusing to overwrite it`);
  }
  return parsed as CustomAgent[];
}

export function stringifyCustomAgents(agents: CustomAgent[]): string {
  return `${JSON.stringify(agents, null, 2)}\n`;
}

export function managedAgent(binary: string, existing?: CustomAgent): CustomAgent {
  const existingEnv = isObject(existing?.env) ? existing.env : {};
  return {
    // Keys the user added themselves (cwd, dialect, modelCli, ...) survive a
    // reload; the fields below are ours and are rewritten every time.
    ...(existing ?? {}),
    id: PROFILE.id,
    displayName: PROFILE.displayName,
    command: binary,
    args: [...PROFILE.args],
    env: existingEnv,
    nativeSkillRoots: {
      user: [...PROFILE.nativeSkillRoots.user],
      project: [...PROFILE.nativeSkillRoots.project],
    },
    permissionCli: {
      full: [...PROFILE.permissionCli.full],
      workspaceWrite: [...PROFILE.permissionCli.workspaceWrite],
    },
  };
}

/**
 * Writes our entry and drops the pre-rename one. Reported as changed only when
 * the resulting array differs, so a settled configuration is never rewritten.
 */
export function upsertAgent(agents: CustomAgent[], next: CustomAgent): { agents: CustomAgent[]; changed: boolean } {
  const index = agents.findIndex(isOwnAgent);
  const copy = [...agents];
  if (index >= 0) copy[index] = next;
  else copy.push(next);
  const pruned = copy.filter((agent) => !isRenamedAgent(agent));
  return { agents: pruned, changed: JSON.stringify(pruned) !== JSON.stringify(agents) };
}

export function removeAgent(agents: CustomAgent[]): { agents: CustomAgent[]; changed: boolean } {
  const next = agents.filter((agent) => !isOwnAgent(agent) && !isRenamedAgent(agent));
  return { agents: next, changed: next.length !== agents.length };
}
