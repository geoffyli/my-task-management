---
parent: "[[Automation]]"
tags:
related:
  - "[[CLI Reference]]"
  - "[[Windmill Overview]]"
---

# Deploying Changes

Standard workflow for deploying this repo's Windmill-owned content and versioning it in Git. The working directory for Windmill sync operations is `automation/` within this monorepo.

## The Standard Workflow

1. **Make changes** to scripts or trigger files in `automation/f/notion_tasks/`.

2. **Generate or update metadata** if you changed a function signature or imports:

   ```bash
   cd automation
   wmill script generate-metadata f/notion_tasks/my_script.ts --yes
   ```

3. **Preview changes through the harness wrapper** (nothing is modified remotely):

   ```bash
   cd automation
   node /Users/geoffyli/Projects/my-harness/shared/skills/windmill/scripts/windmill-preflight.mjs push
   ```

4. **Deploy** only if the wrapper allows execution:

   ```bash
   cd automation
   node /Users/geoffyli/Projects/my-harness/shared/skills/windmill/scripts/windmill-preflight.mjs push --execute
   ```

   If the wrapper reports approval-required changes, get explicit approval first and include a specific `--approval` reason. Deletes also require `--allow-delete`.

5. **Commit to Git**:

   ```bash
   git add automation/ && git commit -m "description of changes"
   git push
   ```

## Important: Scoped Sync

This repo owns only `f/notion_tasks/**`. It does not own `f/inbox/**`, `f/demo/**`, or `f/notion/**`.

`f/notion/**` is retired. The Notion API resource for this repo is `f/notion_tasks/notion_api`.

## Deploying a Single Script

For quick iterations on a single script, prefer local preview or a wrapper-checked full sync. Avoid direct single-script production pushes unless the harness Windmill skill explicitly allows that path for the change.

```bash
cd automation
wmill script push f/notion_tasks/create_repetitive_tasks.ts
```

Direct script pushes bypass the ownership preflight, so they are not the default production deployment path.

## Pulling Remote Changes

If changes were made in the Windmill UI:

1. **Preview** what will change locally:

   ```bash
   cd automation
   node /Users/geoffyli/Projects/my-harness/shared/skills/windmill/scripts/windmill-preflight.mjs pull
   ```

2. **Pull** the remote state:

   ```bash
   cd automation
   node /Users/geoffyli/Projects/my-harness/shared/skills/windmill/scripts/windmill-preflight.mjs pull --execute
   ```

3. **Commit** the pulled changes:

   ```bash
   git add automation/ && git commit -m "pull remote changes"
   git push
   ```

## Handling Conflicts

Conflicts arise when changes were made both locally and in the Windmill UI. Preview through the wrapper first:

```bash
cd automation
node /Users/geoffyli/Projects/my-harness/shared/skills/windmill/scripts/windmill-preflight.mjs pull
git diff
node /Users/geoffyli/Projects/my-harness/shared/skills/windmill/scripts/windmill-preflight.mjs push
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
