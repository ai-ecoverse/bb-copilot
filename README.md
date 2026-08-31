# bb-gh-copilot

Adds GitHub Copilot CLI to [bb](https://getbb.app) as an ACP coding-agent provider.

After installation, **GitHub Copilot** appears in bb as provider **`acp-gh-copilot`**.

The npm package is `bb-plugin-gh-copilot` and the plugin id is `gh-copilot`,
not `copilot`: an unrelated community plugin
([balazstasi/bb-plugin-copilot](https://github.com/balazstasi/bb-plugin-copilot))
already claims that id and the `acp-copilot` provider, and two plugins cannot
share either. Installing this one migrates the entry this plugin wrote under the
old `copilot` id — recognised by its `GitHub Copilot` display name, so the other
plugin's entry is left alone. Threads created against `acp-copilot` by an earlier
version of this plugin have to be re-pointed at `acp-gh-copilot`.

## Prerequisites

- bb 0.40 or newer with its built-in ACP providers plugin enabled.
- Install with `brew install --cask copilot-cli`, then authenticate with `copilot login`.

## Install

Until the marketplace entry is merged, install directly from GitHub:

```bash
bb plugin install https://github.com/ai-ecoverse/bb-gh-copilot
```

For local development:

```bash
npm install
npm run typecheck
npm test
npm run build
bb plugin install .
```

The plugin locates the CLI and writes or repairs its managed entry in the ACP
providers plugin's `customAgents` setting without disturbing other agents. It
uses `copilot --acp` over stdio. Model ids come from Copilot's ACP session catalog.

## Skills

The managed entry declares the skill directories the Copilot CLI reads, so bb
lists them in the composer next to its own:

- project: `.github/skills/`, `.agents/skills/`, `.claude/skills/`
- user: `~/.copilot/skills/`, `~/.agents/skills/`

## Permission modes

bb's thread permission mode becomes a Copilot launch flag:

| bb mode      | Copilot flag         |
| ------------ | -------------------- |
| Auto         | none — every tool call comes through ACP for approval |
| Accept edits | `--allow-tool=write` — file writes run unattended, shell and URLs still ask |
| Full access  | `--allow-all` |

## Check or repair

```bash
bb gh-copilot status
bb gh-copilot repair
bb provider models acp-gh-copilot
```

If the CLI moves after an upgrade, `bb gh-copilot repair` records its new
absolute path and reloads bb.

## Uninstall

Remove the managed provider entry before removing the plugin:

```bash
bb gh-copilot unregister
bb plugin remove gh-copilot
```

The legacy `scripts/install.sh` and `scripts/uninstall.sh` remain available for
installations made before this repository became a bb plugin. Do not use them
for new installs: they write the `customAcpAgents` array that bb removes in
0.41. Installing the plugin migrates such an entry to the setting and deletes
the legacy one.

## How it works

bb's built-in ACP provider supplies the ACP-to-bb runtime. This plugin manages
the provider-specific launch profile in that plugin's `customAgents` setting
(the old `customAcpAgents` array in `config.json` is deprecated in bb 0.40 and
removed in 0.41). Authentication and model availability remain owned by the
vendor CLI and the user's account.

The package ID is `gh-copilot`; the provider ID is `acp-gh-copilot`. The compact
icon is a `currentColor` mask so it follows the bb theme.

## Development

```bash
npm run typecheck
npm test
npm run build
```

`src/agent-entry.ts` holds the pure entry-building logic — what the managed
entry looks like, how it is merged into an existing `customAgents` array, and
what is safe to remove. `npm test` (vitest) covers it. `server.ts` keeps the
side effects: locating the CLI, reading and writing the setting, the CLI
commands.

The plugin requires bb 0.40+ and plugin SDK 0.4.8+.

## License

MIT, matching [bb itself](https://github.com/get-bb/bb). See [LICENSE](LICENSE).
