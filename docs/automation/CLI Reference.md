---
parent: "[[Automation]]"
tags:
related:
  - "[[Deploying Changes]]"
  - "[[File Structure]]"
---

# CLI Reference

Quick lookup for daily `wmill` commands. All commands should be run from the `automation/` directory.

## Sync

| Command | Description |
|---|---|
| `wmill sync pull` | Pull remote changes to local. |
| `wmill sync pull --yes` | Pull without confirmation. |
| `wmill sync pull --dry-run` | Preview what would be pulled. |
| `wmill sync push` | Push local changes to remote. |
| `wmill sync push --yes` | Push without confirmation. |
| `wmill sync push --dry-run` | Preview what would be pushed. |
| `wmill sync push --auto-metadata` | Regenerate stale metadata before pushing. |

## Scripts

| Command | Description |
|---|---|
| `wmill script new <path> <lang>` | Create a new script. Languages: `bun`, `python3`, `bash`, `go`, `deno`, etc. |
| `wmill script push <file>` | Deploy a single script to the remote workspace. |
| `wmill script run <path> -d '{"key":"val"}'` | Run a deployed script with the given arguments. |
| `wmill script preview <file> -d '{"key":"val"}'` | Test a script locally without deploying. |
| `wmill script generate-metadata` | Update lockfile and schema for all scripts. |
| `wmill script generate-metadata <file>` | Update lockfile and schema for a specific script. |
| `wmill script history <path>` | Show version history of a script. |

## Jobs

| Command | Description |
|---|---|
| `wmill job list` | List recent jobs. |
| `wmill job get <id>` | Get job details. |
| `wmill job logs <id>` | Get job logs. |
| `wmill job result <id>` | Get job result as JSON. |
| `wmill job cancel <id>` | Cancel a running job. |

## Resources and Variables

| Command | Description |
|---|---|
| `wmill resource list` | List all resources. |
| `wmill resource get <path>` | Get resource details. |
| `wmill variable list` | List all variables. |
| `wmill variable get <path>` | Get variable details. |

## Schedules and Triggers

| Command | Description |
|---|---|
| `wmill schedule list` | List all schedules. |
| `wmill schedule enable <path>` | Enable a schedule. |
| `wmill schedule disable <path>` | Disable a schedule. |
| `wmill trigger list` | List all triggers. |

## Metadata and Validation

| Command | Description |
|---|---|
| `wmill generate-metadata` | Update locks and schemas for all scripts, flows, and apps. |
| `wmill generate-metadata --yes` | Skip confirmation prompt. |
| `wmill lint` | Validate YAML files for correctness. |
| `wmill resource-type generate-namespace` | Regenerate `rt.d.ts` from current resource types. |

## Workspace

| Command | Description |
|---|---|
| `wmill workspace whoami` | Show current user and workspace. |
| `wmill workspace list` | List local workspace profiles. |
| `wmill workspace switch <name>` | Switch the active workspace. |

## Global Options

These flags can be appended to most `wmill` commands.

| Flag | Description |
|---|---|
| `--workspace <name>` | Target a specific workspace profile. |
| `--token <token>` | Override the stored API token. |
| `--base-url <url>` | Override the instance URL. |
| `--debug` | Enable debug logging. |
| `--json` | Output results as JSON. |
