# bb-copilot

Register [GitHub Copilot CLI](https://docs.github.com/en/copilot/how-tos/copilot-cli) as a **bb custom ACP provider**.

bb already speaks [Agent Client Protocol](https://agentclientprotocol.com) through its built-in ACP provider. Copilot is not currently auto-detected, so this repository installs a `customAcpAgents` entry in `~/.bb/config.json`.

After installation, GitHub Copilot appears in bb as provider **`acp-copilot`**.

## Prerequisites

1. **bb** desktop app running with the built-in `provider-acp` plugin enabled.
2. **GitHub Copilot CLI** on PATH.
3. **Authenticated** with GitHub Copilot via `copilot login`.

Install or upgrade the CLI with Homebrew:

```bash
brew install --cask copilot-cli
# or
brew upgrade --cask --greedy copilot-cli
```

Verify ACP support:

```bash
copilot --version
copilot --help | grep -- --acp
```

## Install into bb

```bash
./scripts/install.sh
```

The installer:

1. Resolves `copilot` to an absolute path so bb's host daemon can launch it reliably.
2. Merges `config/custom-acp-agent.json` into `~/.bb/config.json` by id `copilot` without disturbing other agents.
3. Copies the provider logo into the bb data directory.
4. Refreshes bb's managed config when possible.

Verify:

```bash
bb provider list
bb provider models acp-copilot
```

Spawn a thread:

```bash
bb thread spawn --project <project-id> \
  --provider acp-copilot \
  --permission-mode full \
  --prompt "Inspect this repository and summarize it"
```

## Launch profile

| Field | Value |
|---|---|
| Provider id | `acp-copilot` |
| Display name | GitHub Copilot |
| Command | Absolute path to `copilot`, resolved during install |
| Arguments | `["--acp"]` |
| Transport | ACP over stdio |
| Model selection | `--model` |

GitHub documents `copilot --acp` as its ACP server mode. With no transport option it defaults to stdio, which is the transport bb expects.

The `primaryModels` list is UI preference ordering, not an allowlist. Model availability still depends on the Copilot account, organization policy, and installed CLI version.

## Capabilities

Copilot CLI 1.0.80 advertises ACP protocol version 1 with session load/list/close, image prompts, embedded context, and HTTP/SSE MCP support. bb's generic custom-ACP provider currently exposes its standard provider capability set, including `accept-edits` and `full` permission modes.

## Uninstall

```bash
./scripts/uninstall.sh
```

This removes only the `copilot` entry and copied logo.

## Manual configuration

Add the following object to `customAcpAgents` in `~/.bb/config.json`:

```json
{
  "id": "copilot",
  "displayName": "GitHub Copilot",
  "command": "/opt/homebrew/bin/copilot",
  "args": ["--acp"],
  "env": {},
  "modelCli": {
    "selectFlag": "--model",
    "primaryModels": ["gpt-5.6-terra", "gpt-5.6-luna", "gpt-5.4", "gpt-5.3-codex", "claude-sonnet-5"]
  }
}
```

Then run `bb-app config refresh` or restart bb.

## Troubleshooting

| Symptom | Check |
|---|---|
| `acp-copilot` is missing | Confirm `provider-acp` is enabled, inspect `~/.bb/config.json`, then refresh or restart bb |
| Provider is unavailable | Run `copilot --version`; rerun the installer to refresh the absolute binary path |
| Authentication fails | Run `copilot login` on the machine hosting the bb environment |
| A model is rejected | Let Copilot choose its default or select a model available to your account |
| Remote machine | Install and authenticate Copilot CLI on that host; custom ACP commands execute host-locally |

## Related

- [GitHub Copilot CLI ACP server reference](https://docs.github.com/en/copilot/reference/copilot-cli-reference/acp-server)
- [`bb-auggie`](../bb-auggie)
- [`bb-droid`](../bb-droid)
- `bb guide providers`
