---
parent: "[[Automation]]"
tags:
related:
  - "[[Deploying Changes]]"
  - "[[File Structure]]"
  - "[[Setting Up Triggers]]"
---

# Creating a Script

End-to-end workflow for writing and deploying a new Windmill automation script in this monorepo. All scripts live under `automation/f/notion_tasks/`.

## Steps

1. **Create the script file.** Place it at `automation/f/notion_tasks/<script_name>.ts`:

   ```typescript
   export async function main(notion: RT.Notion, database_id: string) {
     // Your automation logic here
     return { success: true };
   }
   ```

   The `main` function is the entry point. Its parameters become the script's input schema automatically.

2. **Generate metadata:**

   ```bash
   cd automation
   wmill script generate-metadata f/notion_tasks/<script_name>.ts --yes
   ```

   This creates two companion files:

   - `<script_name>.script.yaml` — metadata (summary, description, schema)
   - `<script_name>.script.lock` — pinned dependency versions

3. **(Optional) Edit the `.script.yaml`** to add a human-readable summary. This appears in the Windmill UI.

4. **Test** by running with sample inputs:

   ```bash
   cd automation
   wmill script preview f/notion_tasks/<script_name>.ts \
     -d '{"notion":"$res:f/notion/api","database_id":"abc123"}'
   ```

5. **Deploy** to Windmill:

   ```bash
   cd automation
   wmill sync push --yes
   ```

   Or push just this script:

   ```bash
   wmill script push f/notion_tasks/<script_name>.ts
   ```

6. **Verify** in the Windmill UI or run the deployed version:

   ```bash
   wmill script run f/notion_tasks/<script_name> \
     -d '{"notion":"$res:f/notion/api","database_id":"abc123"}'
   ```

7. **Commit to Git:**

   ```bash
   git add automation/f/notion_tasks/<script_name>* && git commit -m "add <script_name> script"
   git push
   ```

## Script File Structure

After generating metadata, each script consists of three files:

| File | Purpose | Edited By |
|------|---------|-----------|
| `<name>.ts` | Script source code | Developer |
| `<name>.script.yaml` | Metadata (summary, schema, lock ref) | CLI + developer (summary/description) |
| `<name>.script.lock` | Dependency lockfile | CLI only |

All three files should be committed together.

## Using Resources

Scripts that connect to Notion type the parameter with the `RT` namespace:

```typescript
export async function main(notion: RT.Notion, database_id: string) {
  const client = new Client({ auth: notion.token });
  // ...
}
```

The `notion` parameter maps to the Windmill resource `f/notion/api`, which stores the Notion integration token. It is configured in the schedule/trigger YAML as `$res:f/notion/api`.

## Next Steps

- **Script needs a schedule** — see [[Setting Up Triggers]]
- **Script needs an HTTP endpoint** — see [[Setting Up Triggers]]
- **Ready to deploy** — see [[Deploying Changes]]
