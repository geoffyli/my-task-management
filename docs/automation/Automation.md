---
parent: "[[Index]]"
tags:
related:
---

# Automation

Windmill automation scripts for Notion task management. All scripts live in the `automation/f/notion_tasks/` directory within this monorepo and are deployed to a self-hosted Windmill CE instance on Railway.

## Platform

- [[Windmill Overview]] — architecture, sync model, and workspace setup
- [[Deploying Changes]] — how to push changes to the Windmill instance
- [[Creating a Script]] — end-to-end workflow for adding a new script
- [[Setting Up Triggers]] — schedules, HTTP triggers, and other event-driven execution
- [[CLI Reference]] — quick lookup for daily `wmill` commands
- [[File Structure]] — file types, naming conventions, and generated vs hand-written

## Scripts

- [[Create Repetitive Tasks]] — creates tasks from a config database based on cron/interval patterns (daily)
- [[Create Weekly Note]] — creates a weekly planning note with 7-day date breakdown (Mondays)
- [[Tasks Webhook Router]] — routes webhook events to lifecycle date handlers and agent dispatch (real-time)
- [[Dispatch Agent Task]] — creates an OpenCode session for a Queued task and sends the intake prompt (async, triggered by webhook)
- [[Poll Agent Sessions]] — detects idle OpenCode sessions and transitions tasks to Review or Failed (every 2 minutes)
- [[Update Legacy Tasks]] — rolls overdue task dates forward to today (disabled — replaced by view-based filtering)

## Agent Orchestration

The agent dispatch and polling scripts are part of a larger autonomous agent system. See [[Agent Orchestration]] for the end-to-end design.
