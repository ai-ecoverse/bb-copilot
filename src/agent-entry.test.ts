import { describe, expect, it } from "vitest";
import {
  PROFILE,
  RENAMED_FROM,
  findOwnAgent,
  managedAgent,
  parseCustomAgents,
  removeAgent,
  stringifyCustomAgents,
  upsertAgent,
  type CustomAgent,
} from "./agent-entry.js";

const BINARY = "/opt/homebrew/bin/copilot";

function otherAgent(id: string): CustomAgent {
  return { id, displayName: id, command: id, args: ["--acp"], env: {} };
}

describe("managedAgent", () => {
  it("declares the fields the plugin owns", () => {
    const agent = managedAgent(BINARY);
    expect(agent).toMatchObject({
      id: PROFILE.id,
      displayName: PROFILE.displayName,
      command: BINARY,
      args: ["--acp"],
      env: {},
      nativeSkillRoots: {
        user: [".copilot/skills", ".agents/skills"],
        project: [".github/skills", ".agents/skills", ".claude/skills"],
      },
      permissionCli: { full: ["--allow-all"], workspaceWrite: ["--allow-tool=write"] },
    });
  });

  it("keeps keys the user added and env they set", () => {
    const existing: CustomAgent = {
      id: PROFILE.id,
      command: "copilot",
      args: ["--acp", "--banner"],
      env: { COPILOT_ALLOW_ALL: "1" },
      cwd: "/tmp/workspace",
      dialect: "cursor",
    };
    const agent = managedAgent(BINARY, existing);
    expect(agent.cwd).toBe("/tmp/workspace");
    expect(agent.dialect).toBe("cursor");
    expect(agent.env).toEqual({ COPILOT_ALLOW_ALL: "1" });
    // Fields we manage are rewritten even when the user edited them.
    expect(agent.args).toEqual(["--acp"]);
    expect(agent.command).toBe(BINARY);
  });

  it("ignores a non-object env rather than passing it through", () => {
    expect(managedAgent(BINARY, { id: PROFILE.id, env: "nope" }).env).toEqual({});
  });

  it("adopts the entry written under the pre-rename id", () => {
    const legacy: CustomAgent = {
      id: RENAMED_FROM,
      displayName: PROFILE.displayName,
      command: "copilot",
      env: { GH_TOKEN: "x" },
      cwd: "/repo",
    };
    const agent = managedAgent(BINARY, legacy);
    expect(agent.id).toBe(PROFILE.id);
    expect(agent.env).toEqual({ GH_TOKEN: "x" });
    expect(agent.cwd).toBe("/repo");
  });
});

describe("findOwnAgent", () => {
  it("prefers the current id over the pre-rename one", () => {
    const current = { ...managedAgent(BINARY), cwd: "/current" };
    const stale = { id: RENAMED_FROM, displayName: PROFILE.displayName, cwd: "/stale" };
    expect(findOwnAgent([stale, current])?.cwd).toBe("/current");
  });

  it("does not claim another plugin's copilot entry", () => {
    const theirs: CustomAgent = {
      id: RENAMED_FROM,
      displayName: "Copilot",
      command: "copilot",
      args: ["--acp", "--stdio"],
    };
    expect(findOwnAgent([theirs])).toBeUndefined();
  });
});

describe("upsertAgent", () => {
  it("appends the entry and leaves other agents in place", () => {
    const agents = [otherAgent("auggie"), otherAgent("droid")];
    const result = upsertAgent(agents, managedAgent(BINARY));
    expect(result.changed).toBe(true);
    expect(result.agents.map((agent) => agent.id)).toEqual(["auggie", "droid", PROFILE.id]);
  });

  it("is idempotent once provisioned", () => {
    const first = upsertAgent([otherAgent("auggie")], managedAgent(BINARY));
    const second = upsertAgent(first.agents, managedAgent(BINARY));
    expect(second.changed).toBe(false);
    expect(second.agents).toEqual(first.agents);
  });

  it("reports a change when the resolved binary moved", () => {
    const provisioned = upsertAgent([], managedAgent("/usr/local/bin/copilot")).agents;
    const result = upsertAgent(provisioned, managedAgent(BINARY));
    expect(result.changed).toBe(true);
    expect(result.agents).toHaveLength(1);
    expect(result.agents[0]?.command).toBe(BINARY);
  });

  it("drops our pre-rename entry without touching the other plugin's", () => {
    const ours: CustomAgent = { id: RENAMED_FROM, displayName: PROFILE.displayName, command: "copilot" };
    const result = upsertAgent([ours, otherAgent("auggie")], managedAgent(BINARY));
    expect(result.changed).toBe(true);
    expect(result.agents.map((agent) => agent.id)).toEqual(["auggie", PROFILE.id]);

    const theirs: CustomAgent = { id: RENAMED_FROM, displayName: "Copilot", command: "copilot" };
    const kept = upsertAgent([theirs], managedAgent(BINARY));
    expect(kept.agents).toContainEqual(theirs);
  });
});

describe("removeAgent", () => {
  it("removes both of our ids and nothing else", () => {
    const theirs: CustomAgent = { id: RENAMED_FROM, displayName: "Copilot" };
    const agents = [
      otherAgent("auggie"),
      managedAgent(BINARY),
      { id: RENAMED_FROM, displayName: PROFILE.displayName },
      theirs,
    ];
    const result = removeAgent(agents);
    expect(result.changed).toBe(true);
    expect(result.agents).toEqual([otherAgent("auggie"), theirs]);
  });

  it("reports no change when nothing is registered", () => {
    expect(removeAgent([otherAgent("auggie")]).changed).toBe(false);
  });
});

describe("parseCustomAgents", () => {
  it("treats an unset or blank setting as no agents", () => {
    expect(parseCustomAgents(undefined)).toEqual([]);
    expect(parseCustomAgents(null)).toEqual([]);
    expect(parseCustomAgents("")).toEqual([]);
    expect(parseCustomAgents("   \n")).toEqual([]);
  });

  it("round-trips what stringifyCustomAgents writes", () => {
    const agents = [otherAgent("auggie"), managedAgent(BINARY)];
    expect(parseCustomAgents(stringifyCustomAgents(agents))).toEqual(agents);
  });

  it("refuses a setting it would otherwise clobber", () => {
    expect(() => parseCustomAgents('{"id":"copilot"}')).toThrow(/JSON array/);
    expect(() => parseCustomAgents(["already parsed"])).toThrow(/must be a string/);
    expect(() => parseCustomAgents("[not json")).toThrow();
  });
});
