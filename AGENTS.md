# Agent Instructions

## Windmill Ownership

- This repo owns live Windmill objects under `f/notion_tasks/**`.
- This repo does not own `f/inbox/**`, `f/demo/**`, or `f/notion/**`.
- `f/notion/**` is retired. Do not create new objects there or add it to `automation/wmill.yaml`.
- The Notion API resource for this repo is `f/notion_tasks/notion_api`.

## Windmill Deployment Safety

All Windmill sync work must use the harness Windmill skill and wrapper:

```bash
node /Users/geoffyli/Projects/my-harness/shared/skills/windmill/scripts/windmill-preflight.mjs push
node /Users/geoffyli/Projects/my-harness/shared/skills/windmill/scripts/windmill-preflight.mjs pull
```

Do not run raw `wmill sync push --yes` or `wmill sync pull --yes` for this repo. The central ownership registry lives at:

```text
/Users/geoffyli/Projects/my-harness/shared/skills/windmill/references/ownership.yaml
```
