# Recall X247 — Plan, Memory & Recall System

Backend design notes for the four capabilities added on 2026-04-27:

1. AI-suggested actions on detected work ("Create Plan / Add Task / Save to Memory")
2. Step-by-step task breakdown with timeline + optional deadline
3. "Save to Memory" with anti-clutter dedup
4. Workspace recall ("Show my previous work on X")

All endpoints are FastAPI, all storage is the existing Firestore-mock layer
(`workspace_projects`, `tasks`, `memories` collections).

---

## 1. Detect → Suggest → Apply (Insights)

### Flow

```
User opens a workspace project
        │
        ▼
POST /workspace/projects/{id}/extract-insights
        │  ├─ collects project items (notes, links, tasks)
        │  ├─ runs LLM with strict JSON schema
        │  └─ validates each suggestion (priority, due_in_days clamp 1-60,
        │       folder_id ∈ project.folders, action ∈ {add_task, create_plan, save_to_memory})
        ▼
{ insights: [{id, title, detail, priority, suggested_actions:[...]}] }
        │
        ▼  (user picks one suggestion)
POST /workspace/projects/{id}/insights/apply
        │  ├─ RE-validates the chosen action server-side (never trusts the client)
        │  ├─ sanitises insight envelope to {id, title, detail, priority}
        │  └─ routes to:
        │       add_task        → task_agent.create_task
        │       create_plan     → plan_agent.generate_plan + ingest_plan (sibling project)
        │       save_to_memory  → capture_agent.save_memory
        ▼
{ ok: true, action: "...", result: {...} }
```

### Why the apply path re-validates

The client could be tampered with. So even after `extract-insights` validates,
`apply` re-runs `_validate_actions([action])` and re-checks `folder_id` against
the project's current folder list. Adversarial smoke tests confirmed:

| Attack                                  | Result                |
|-----------------------------------------|-----------------------|
| Forged action type (`"delete_all"`)     | 400 invalid action    |
| Forged folder_id from another project   | Action dropped        |
| `due_in_days = 9999`                    | Clamped to 60         |
| Priority `"super_urgent"`               | Coerced to `"high"`   |

---

## 2. Task Breakdown (`POST /tasks/breakdown`)

Different from `generate_plan` (4-agent ~30s curriculum builder). This is a
**single LLM call** that turns one task into 3-7 ordered micro-steps with dates.

### Request

```json
{
  "task_title": "Prepare GenAI APAC 2026 hackathon submission video",
  "context": "Need to record 3-min demo, polish slides, upload to YouTube",
  "days": 3,
  "start_date": "",            // optional, defaults to today
  "deadline": "2026-05-10",    // optional, caps `days`
  "persist_as_subtasks": false,
  "parent_task_id": ""         // if set, breakdown uses parent's title; subtasks link back
}
```

### Validation rules (server-side, never trust LLM)

- `days` clamped to 1..14 and further capped by `(deadline - start_date)`.
- Each step's `day_offset` clamped to `0..days-1`.
- `est_minutes` clamped to 15..240.
- Title trimmed to 120 chars, notes to 200.
- Max 7 steps kept; empty-title steps dropped.
- `due_date` is computed server-side (`start + day_offset` days), not from LLM.

### Example response (real, from smoke test)

```json
{
  "ok": true,
  "task_title": "Prepare GenAI APAC 2026 hackathon submission video",
  "days": 3,
  "start_date": "2026-04-27",
  "deadline": "2026-05-10",
  "summary": "Draft, record, polish, edit, then upload the hackathon submission video.",
  "total_minutes": 420,
  "steps": [
    { "order": 1, "title": "Draft demo script and outline video content",
      "day_offset": 0, "due_date": "2026-04-27", "est_minutes": 60,
      "notes": "Create a clear script to guide the demo recording." },
    { "order": 2, "title": "Record the 3-minute demo video",
      "day_offset": 1, "due_date": "2026-04-28", "est_minutes": 120, "notes": "..." },
    { "order": 3, "title": "Polish presentation slides for submission",
      "day_offset": 1, "due_date": "2026-04-28", "est_minutes": 90, "notes": "..." },
    { "order": 4, "title": "Edit demo video for clarity and flow",
      "day_offset": 2, "due_date": "2026-04-29", "est_minutes": 120, "notes": "..." },
    { "order": 5, "title": "Upload final video to YouTube",
      "day_offset": 2, "due_date": "2026-04-29", "est_minutes": 30, "notes": "..." }
  ]
}
```

### Optional persistence

When `persist_as_subtasks=true` AND `parent_task_id` set, each step is created
as a real task (`title` prefixed with `↳ ` for visual nesting in the UI), with
`linked_memory_id = parent_task_id` so the UI can group them. Subtask IDs
returned in `persisted_subtask_ids`.

### Failure modes

| Input                                | HTTP | Body                                  |
|--------------------------------------|------|---------------------------------------|
| Empty title and no resolvable parent | 400  | `task_title or parent_task_id ...`    |
| LLM returns non-list `steps`         | 400  | `LLM returned no steps`               |
| All steps invalid after validation   | 400  | `no valid steps after validation`     |

---

## 3. Memory: Save + Anti-Clutter Dedup

### Two-tier dedup pipeline in `save_memory`

```
                    ┌────────────────────────────┐
incoming memory ─► │ has source_url?            │
                    └────────────┬───────────────┘
                       yes        │       no
                        │         │
                        ▼         ▼
        _find_duplicate_by_url   _find_duplicate_by_content_hash
        (deterministic doc-id    (sha1 of normalized title + first 400
         lookup; legacy where()  chars of summary; 90-day window;
         fallback)               returns the matching memory or None)
                        │         │
                        └────┬────┘
                             ▼
                  if hit → return existing
                          + duplicate=true
                          + duplicate_reason="content_hash" (when applicable)

                  if miss → write new doc
                          + content_hash field stamped
                          (so future scans are O(1) cheap)
```

### Why two tiers

- **URL dedup** catches the common "I clipped the same article twice" case via
  a deterministic doc id (sha1 of `userId|normalized_url`) — concurrent saves
  collide on the same row instead of forking.
- **Content-hash dedup** catches the "I voice-noted the same thought twice" or
  "I pasted the same insight from a different surface" case. URL-less notes
  don't have a deterministic id, so we scan the user's most-recent 200 memories
  in the last 90 days and compare normalized hashes. Bounded scan, no full
  collection sweep.

The hash normalises whitespace, lowercases, and truncates so trivial edits
(adding a period, fixing case) don't defeat the dedup.

---

## 4. Workspace Recall (`POST /workspace/recall`)

The existing `/recall` only searched memories. The new endpoint searches
**everything in your workspace** and synthesises a single cited answer.

### Scope per request

| Source        | Searched when `project_id` is null | Searched when `project_id` is set |
|---------------|-------------------------------------|-----------------------------------|
| Memories      | Yes (global, via memory_recall)     | Yes (still global — memories aren't project-bound) |
| Tasks         | Yes (all your tasks)                | Yes (project tasks first, then global) |
| Project items | No                                  | Yes (notes/links/files in that project) |
| Project list  | Yes (name + summary keyword match)  | Yes                               |

### Pipeline

```
query ─► strip stopwords ("show", "previous", "work", "on", "for", …)
       │
       ├─► memory tier: delegates to recall_agent.recall (3-tier search reused, no duplication)
       ├─► task tier:   keyword scan over tasks collection (priority + recency tiebreak)
       ├─► item tier:   keyword scan over selected project's items (when scoped)
       └─► project tier: keyword scan over workspace_projects (name + summary)
                     │
                     ▼
              merge + score + cap to `limit`
                     │
                     ▼
       LLM synthesis: 2-3 sentence answer with [Memory:Title], [Task:Title],
                      [Item:Title], [Project:Name] citations
                     │
                     ▼ (if synthesis fails)
       heuristic fallback: deterministic narrative built from top hits
                     │
                     ▼
       { ok, query, scope, answer, sources: {memories, items, tasks, projects}, counts }
```

### Example response (real, from smoke test)

```json
{
  "ok": true,
  "query": "hackathon submission",
  "scope": { "project_id": null, "project_name": "" },
  "answer": "You've captured information about Google Cloud Vertex AI, which unifies various ML services into one platform, and you have a pending task to record a 3-minute demo video for your hackathon submission due on April 29, 2026 [Memory: Google Cloud Vertex AI], [Task: Record 3-minute demo video for prototype submission]. A useful next step would be to start planning the content and structure of your demo video to ensure you effectively showcase your prototype.",
  "sources": {
    "memories": [{ "id": "...", "title": "Google Cloud Vertex AI — Enterprise AI Platform", "domain": "Technology", "summary": "..." }],
    "items": [],
    "tasks":    [{ "id": "...", "title": "Record 3-minute demo video for prototype submission", "due_date": "2026-04-29", "priority": "high", "status": "pending", "score": 1 }],
    "projects": []
  },
  "counts": { "memories": 1, "items": 0, "tasks": 1, "projects": 0, "total": 2 }
}
```

### Empty / bad input

| Input             | HTTP | Body                            |
|-------------------|------|---------------------------------|
| `{"query": ""}`   | 400  | `{"error": "query is required"}`|
| Unknown project_id| 200  | scope.project_name = ""; falls back to global search |

---

## Endpoint Reference

| Method | Path                                                    | Purpose                                |
|--------|---------------------------------------------------------|----------------------------------------|
| POST   | `/workspace/projects/{id}/extract-insights`             | Detect important work in a project     |
| POST   | `/workspace/projects/{id}/insights/apply`               | Execute one suggested action           |
| POST   | `/tasks/breakdown`                                      | Step-by-step micro-plan for a task     |
| POST   | `/workspace/recall`                                     | "Show my previous work on X"           |

All four are wired in `main.py`. Underlying logic lives in
`app/insight_agent.py`, `app/plan_agent.py:breakdown_task`,
`app/workspace_recall.py`, and the dedup helpers in `app/capture_agent.py`.
