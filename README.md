# bb-copilot

Adds GitHub Copilot CLI to [bb](https://getbb.app) as an ACP coding-agent provider.

After installation, **GitHub Copilot** appears in bb as provider **`acp-copilot`**.

## Prerequisites

- bb 0.40 or newer with its built-in ACP providers plugin enabled.
- Install with `brew install --cask copilot-cli`, then authenticate with `copilot login`.

## Install

Until the marketplace entry is merged, install directly from GitHub:

```bash
bb plugin install https://github.com/ai-ecoverse/bb-copilot
```

For local development:

```bash
npm install
npm run typecheck
npm run build
bb plugin install .
```

The plugin locates the CLI and writes or repairs its managed entry in the ACP
providers plugin's `customAgents` setting without disturbing other agents. It
uses `copilot --acp` over stdio. Model ids come from Copilot's ACP session catalog.

## Check or repair

```bash
bb copilot status
bb copilot repair
bb provider models acp-copilot
```

If the CLI moves after an upgrade, `bb copilot repair` records its new
absolute path and reloads bb.

## Uninstall

Remove the managed provider entry before removing the plugin:

```bash
bb copilot unregister
bb plugin remove copilot
```

The legacy `scripts/install.sh` and `scripts/uninstall.sh` remain available
for installations made before this repository became a bb plugin.

## How it works

bb's built-in ACP provider supplies the ACP-to-bb runtime. This plugin manages
the provider-specific launch profile in that plugin's `customAgents` setting
(the old `customAcpAgents` array in `config.json` is deprecated in bb 0.40 and
removed in 0.41). Authentication and model availability remain owned by the
vendor CLI and the user's account.

The package ID is `copilot`; the provider ID is `acp-copilot`. The compact icon
is a `currentColor` mask so it follows the bb theme.

## Development

```bash
npm run typecheck
npm run build
```

The plugin requires bb 0.40+ and plugin SDK 0.4.8+.
