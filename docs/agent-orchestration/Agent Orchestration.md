---
parent: "[[Index]]"
tags:
related:
---

# Agent Orchestration

The agent orchestration system lets Geoff assign tasks to an autonomous AI agent by setting a single Notion property. The agent runs inside OpenCode, receives the task as its first message, works autonomously, and signals completion back to Notion — no manual session management required.

## How to Use

1. Open any task in the Notion Tasks database.
2. Set the **Agent** property to **Queued**.
3. Within ~30 seconds, the **Agent Session** URL is populated and the agent starts working.
4. When the agent finishes, **Agent** transitions to **Review** — open the session URL to inspect the output and follow up if needed.

## System Components

| Component | Role |
|-----------|------|
| Notion Tasks database | Source of truth for task state; user sets `Agent → Queued` to trigger |
| `tasks_webhook_router` | Windmill HTTP trigger; receives Notion webhooks, routes `IMWB` changes to dispatch |
| `dispatch_agent_task` | Windmill script; creates OpenCode session, sends intake prompt, writes session URL |
| `poll_agent_sessions` | Windmill scheduled script; detects idle sessions, sets `Agent → Review` or `Failed` |
| OpenCode | AI agent runtime on Railway; runs the task autonomously using the cloud worker config from `my-harness/cloud/opencode` |

## Agent Property States

```
Queued → Running → Review
                 → Failed
```

See [[Agent State Machine]] for full transition rules.

## Documentation Map

- [[Agent Orchestration Architecture]] — End-to-end data flow and sequence diagrams
- [[Agent State Machine]] — All states, who sets them, and error paths
- [[Dispatch Agent Task]] — Session creation, locking, prompt delivery
- [[Poll Agent Sessions]] — Polling logic and completion detection
- [[Agent Webhook Integration]] — HMAC verification and preprocessor routing
- [[OpenCode Integration]] — API surface, cloud worker config, skills, MCPs, session URL format, known limitations
- [[Agent Orchestration Operations]] — Setup, resources, deployment, and troubleshooting
