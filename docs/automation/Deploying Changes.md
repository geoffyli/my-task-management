---
parent: "[[Automation]]"
tags:
related:
  - "[[CLI Reference]]"
  - "[[Windmill Overview]]"
---

# Deploying Changes

Standard workflow for pushing local changes to Windmill and versioning them in Git. The working directory for all Windmill operations is `automation/` within this monorepo.

## The Standard Workflow

1. **Make changes** to scripts or trigger files in `automation/f/notion_tasks/`.

2. **Generate or update metadata** if you changed a function signature or imports:

   ```bash
   cd automation
   wmill script generate-metadata f/notion_tasks/my_script.ts --yes
   ```

   Or let the CLI handle it automatically:

   ```bash
   wmill sync push --auto-metadata
   ```

3. **Preview changes** (nothing is modified remotely):

   ```bash
   cd automation
   wmill sync push --dry-run
   ```

4. **Deploy** to Windmill:

   ```bash
   cd automation
   wmill sync push --yes
   ```

5. **Commit to Git**:

   ```bash
   git add automation/ && git commit -m "description of changes"
   git push
   ```

## Important: Scoped Sync

This repo's `wmill.yaml` is scoped to `f/notion_tasks/**` and `f/notion/**` only. A `wmill sync push` from this directory will never affect scripts outside these folders on the Windmill instance.

## Deploying a Single Script

For quick iterations on a single script:

```bash
cd automation
wmill script push f/notion_tasks/create_repetitive_tasks.ts
```

This pushes only the specified script and its associated metadata/lockfile.

## Pulling Remote Changes

If changes were made in the Windmill UI:

1. **Preview** what will change locally:

   ```bash
   cd automation
   wmill sync pull --dry-run
   ```

2. **Pull** the remote state:

   ```bash
   cd automation
   wmill sync pull --yes
   ```

3. **Commit** the pulled changes:

   ```bash
   git add automation/ && git commit -m "pull remote changes"
   git push
   ```

## Handling Conflicts

Conflicts arise when changes were made both locally and in the Windmill UI. Always pull first:

```bash
cd automation
wmill sync pull --yes    # Pull remote state
git diff                 # Review differences
wmill sync push --yes    # Push resolved state
```

## What Gets Synced

| Content | Synced? | Notes |
|---------|---------|-------|
| Scripts | Yes | Source, metadata, lockfiles |
| Schedules | Yes | `.schedule.yaml` files |
| Triggers | Yes | `.http_trigger.yaml` and others |
| Variables | Yes | Non-secret only |
| Resources | No | Manage via Windmill UI |
| Secrets | No | Manage via Windmill UI |
