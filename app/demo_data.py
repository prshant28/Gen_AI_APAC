"""
Demo data seeder — populates the in-memory (or real) DB with a rich
guest-only demo so first-time visitors see a fully-loaded app.

Every doc is tagged with user_id / userId = "guest" so it is invisible to
real authenticated users (who land on a clean empty state and start
building their own Second Brain).
"""
import datetime
import uuid

GUEST_UID = "guest"

DEMO_MEMORIES = [
    {
        "title": "Gemini 2.0: Google's Most Capable Multimodal AI",
        "source_type": "youtube",
        "source_url": "https://youtube.com/watch?v=demo1",
        "summary": "Gemini 2.0 Flash delivers breakthrough multimodal reasoning, natively handling text, images, audio, and video in a single model. The architecture introduces native tool use, real-time streaming, and a 1M token context window — making it the backbone of modern agentic AI systems.",
        "key_points": [
            "1 million token context window enables full document analysis",
            "Native multimodal: text, image, audio, video in one model",
            "Real-time streaming with sub-second first token latency",
            "Function calling with parallel tool execution",
            "Available via Google AI Studio and Vertex AI",
        ],
        "tags": ["gemini", "google", "multimodal", "ai", "llm"],
        "domain": "AI",
        "days_ago": 2,
    },
    {
        "title": "The Architecture of Multi-Agent AI Systems",
        "source_type": "web",
        "source_url": "https://arxiv.org/abs/2309.07864",
        "summary": "Multi-agent AI orchestration separates concerns across specialized agents — each optimized for a narrow domain — coordinated by a primary orchestrator. This pattern achieves superhuman task performance on complex workflows by decomposing problems into parallel sub-tasks with shared memory and tool access.",
        "key_points": [
            "Orchestrator pattern: one planner, many specialist executors",
            "Shared vector memory enables cross-agent knowledge retrieval",
            "Tool use (function calling) bridges AI reasoning to real-world APIs",
            "ReAct loop: Reasoning + Acting iterates until task completion",
            "AgentBench shows 40% improvement over single-agent baselines",
        ],
        "tags": ["agents", "orchestration", "architecture", "ai", "multi-agent"],
        "domain": "AI",
        "days_ago": 5,
    },
    {
        "title": "Building a Second Brain — Tiago Forte Method",
        "source_type": "note",
        "source_url": "",
        "summary": "The PARA method (Projects, Areas, Resources, Archives) creates a universal organizational system across all digital tools. The key insight is that knowledge should be captured in the moment of relevance, summarized for future retrieval, and connected to existing ideas — not stored in monolithic silos.",
        "key_points": [
            "PARA: Projects (active goals), Areas (ongoing responsibilities), Resources (references), Archives",
            "Progressive summarization: layers of compression preserve signal",
            "Just-in-time knowledge: retrieve when needed, not when captured",
            "Intermediate packets: build reusable knowledge components",
            "Second Brain externalizes cognition to reduce mental load",
        ],
        "tags": ["productivity", "pkm", "para", "notes", "knowledge"],
        "domain": "Productivity",
        "days_ago": 7,
    },
    {
        "title": "RAG vs Fine-tuning: When to Use Each",
        "source_type": "web",
        "source_url": "https://research.google/pubs/retrieval-augmented-generation",
        "summary": "Retrieval-Augmented Generation (RAG) grounds LLM responses in verified, up-to-date documents without retraining — ideal for dynamic knowledge bases. Fine-tuning instead bakes knowledge into weights, trading flexibility for lower inference latency. Hybrid approaches combine both for production systems.",
        "key_points": [
            "RAG: retrieve relevant chunks → inject into prompt context",
            "Fine-tuning: modify model weights with domain-specific data",
            "RAG excels when knowledge changes frequently (news, docs, user data)",
            "Fine-tuning excels for consistent tone/format tasks",
            "Hybrid: fine-tune for style + RAG for factual grounding",
        ],
        "tags": ["rag", "fine-tuning", "llm", "retrieval", "embeddings"],
        "domain": "AI",
        "days_ago": 10,
    },
    {
        "title": "Google Cloud Vertex AI — Enterprise AI Platform",
        "source_type": "web",
        "source_url": "https://cloud.google.com/vertex-ai",
        "summary": "Vertex AI unifies all Google Cloud ML services into one platform — from AutoML to custom training, model registry, feature store, and Gemini API access. Its MLOps pipelines enable reproducible, scalable AI workflows with enterprise-grade security, data residency controls, and 99.9% SLA.",
        "key_points": [
            "One platform for the full ML lifecycle: data → train → deploy → monitor",
            "Gemini API: fastest path to production generative AI",
            "Feature Store: consistent feature serving for ML models",
            "Model Garden: 150+ open-source and Google models",
            "Vertex AI Search: enterprise RAG pipeline in minutes",
        ],
        "tags": ["vertexai", "googlecloud", "mlops", "gcp", "enterprise"],
        "domain": "Technology",
        "days_ago": 3,
    },
    {
        "title": "Transformer Architecture Deep Dive",
        "source_type": "youtube",
        "source_url": "https://youtube.com/watch?v=demo2",
        "summary": "The Transformer's self-attention mechanism computes relationships between every token pair in O(n²) time — enabling global context but limiting sequence length. Modern variants (Flash Attention, Ring Attention) address this through IO-aware tiling and distributed attention, pushing context windows to millions of tokens.",
        "key_points": [
            "Self-attention: Q·K^T/√d → softmax → V produces contextual embeddings",
            "Multi-head attention: 8-32 parallel attention heads capture different relationships",
            "Positional encoding (RoPE, ALiBi) injects sequence order information",
            "Flash Attention 3 reduces VRAM from O(n²) to O(n) via tiling",
            "Mixture of Experts (MoE) scales parameters without proportional compute",
        ],
        "tags": ["transformer", "attention", "architecture", "ml", "deep-learning"],
        "domain": "AI",
        "days_ago": 14,
    },
    {
        "title": "Effective Spaced Repetition for Technical Learning",
        "source_type": "note",
        "source_url": "",
        "summary": "Spaced repetition schedules review sessions at scientifically optimal intervals — 1d → 3d → 7d → 21d → 60d — reducing forgetting by 80% vs massed practice. Combined with active recall (not re-reading), learners can master 10x more material in the same time.",
        "key_points": [
            "Ebbinghaus forgetting curve: 50% forgotten within 1 hour without review",
            "Spaced intervals: review before forgetting sets in, not after",
            "Active recall beats passive review: test yourself, don't re-read",
            "Anki algorithm (SM-2): adjusts intervals based on recall difficulty",
            "Interleaving: mixing topics improves long-term retention by 35%",
        ],
        "tags": ["learning", "spaced-repetition", "anki", "memory", "study"],
        "domain": "Productivity",
        "days_ago": 12,
    },
    {
        "title": "Prompt Engineering Mastery — Chain-of-Thought & Beyond",
        "source_type": "web",
        "source_url": "https://arxiv.org/abs/2201.11903",
        "summary": "Chain-of-Thought (CoT) prompting instructs LLMs to show reasoning steps before answers, improving accuracy by 30-50% on math and logic tasks. Advanced techniques (Tree-of-Thought, Least-to-Most, Self-Consistency) further boost reliability by exploring multiple reasoning paths and voting across outputs.",
        "key_points": [
            "CoT: 'Think step by step' elicits intermediate reasoning, boosting accuracy",
            "Few-shot CoT: 3-5 worked examples outperform zero-shot significantly",
            "Tree-of-Thought: parallel reasoning branches + pruning finds best path",
            "Self-Consistency: sample multiple chains → majority vote final answer",
            "Least-to-Most: decompose hard problems into easy subproblems",
        ],
        "tags": ["prompting", "chain-of-thought", "llm", "cot", "reasoning"],
        "domain": "AI",
        "days_ago": 8,
    },
    # ─── New richer content (added April 2026) ───────────────────────────────
    {
        "title": "Vector Databases — Pinecone vs Weaviate vs pgvector",
        "source_type": "web",
        "source_url": "https://www.pinecone.io/learn/vector-database/",
        "summary": "Vector databases index high-dimensional embeddings for sub-50ms similarity search at billion-vector scale. Pinecone leads on managed simplicity, Weaviate on open-source + hybrid search, and pgvector on letting you stay inside Postgres. The choice usually comes down to operational comfort + scale ceiling.",
        "key_points": [
            "ANN indices (HNSW, IVF) trade recall for speed — tune ef/probes",
            "Pinecone: fully managed, serverless tier scales to millions of vectors",
            "Weaviate: hybrid sparse+dense + self-host friendly",
            "pgvector: stay in Postgres, great below 10M vectors",
            "Embedding choice (OpenAI ada-3, BGE, Cohere) matters more than the DB",
        ],
        "tags": ["vector-db", "embeddings", "rag", "pinecone", "weaviate", "pgvector"],
        "domain": "Technology",
        "days_ago": 4,
    },
    {
        "title": "Cal Newport — Deep Work for Builders",
        "source_type": "youtube",
        "source_url": "https://youtube.com/watch?v=deepwork-demo",
        "summary": "Newport argues that deep, distraction-free work is the rare and increasingly valuable skill of the knowledge economy. The book's central protocol — schedule deep blocks, reduce shallow noise, embrace boredom — yields measurable output gains for engineers, writers, and founders.",
        "key_points": [
            "Deep work hours, not total hours, drive output",
            "Schedule every minute of the day, then renegotiate as needed",
            "Quit social media that doesn't pass the craftsman cost-benefit test",
            "Drain the shallows: cap shallow work with weekly budgets",
            "Boredom training: don't reach for phone in 'in-between' moments",
        ],
        "tags": ["productivity", "deep-work", "focus", "habits"],
        "domain": "Productivity",
        "days_ago": 6,
    },
    {
        "title": "Founder's Guide to GTM — First 100 Customers",
        "source_type": "web",
        "source_url": "https://review.firstround.com/the-first-100",
        "summary": "Early-stage GTM is hand-to-hand combat — founders should personally close the first 100 customers to learn the language of the buyer. Patterns: do unscalable outreach, log every objection, ship same-day fixes. By customer 100 you should have a repeatable wedge and the start of a playbook.",
        "key_points": [
            "Do unscalable things: handwritten emails > automation in week one",
            "Log every objection in a shared doc — patterns become the FAQ",
            "Founder-led sales until $1M ARR, then hire your first AE",
            "Same-day shipping for paying customer feedback compounds trust",
            "Pricing experiments: charge early, raise often",
        ],
        "tags": ["gtm", "founder-sales", "startup", "business"],
        "domain": "Business",
        "days_ago": 9,
    },
    {
        "title": "Sleep, Glucose & Cognitive Performance",
        "source_type": "youtube",
        "source_url": "https://youtube.com/watch?v=hubermanlab-sleep",
        "summary": "Sleep debt and post-meal glucose spikes are the two largest reversible drags on knowledge-worker cognition. A 10pm-6am window, morning sunlight within 30 minutes of waking, and protein-first meals can shift HRV, focus, and mood within 14 days.",
        "key_points": [
            "Get 5-15 minutes of direct sunlight on the eyes within 30 min of waking",
            "Caffeine half-life is ~6h — last cup by noon for stable sleep onset",
            "Protein/fibre before carbs flattens glucose spikes by ~30%",
            "Zone 2 cardio 3x/week boosts mitochondrial density + focus",
            "Cool, dark, 18°C room is the cheapest sleep upgrade",
        ],
        "tags": ["health", "sleep", "glucose", "performance", "huberman"],
        "domain": "Health",
        "days_ago": 11,
    },
    {
        "title": "Latent Space Podcast — The Year of Agents",
        "source_type": "youtube",
        "source_url": "https://youtube.com/watch?v=latentspace-agents",
        "summary": "2026 is the year agents stop being demos and start owning real workflows. The conversation covers planning loops, tool calling reliability, eval harnesses, and why most teams fail at long-horizon tasks (state explosion + bad recovery from tool errors).",
        "key_points": [
            "Long-horizon agents need explicit memory + checkpointing",
            "Eval harness > prompt tweaks: invest in offline eval first",
            "Tool error recovery is the #1 differentiator between toys and prod",
            "Planner / executor split outperforms single-prompt agents",
            "Reasoning model (o-series) for plan, fast model for tool calls",
        ],
        "tags": ["agents", "podcast", "evals", "ai", "tooling"],
        "domain": "AI",
        "days_ago": 1,
    },
    {
        "title": "TypeScript Strict Mode — The 12 Settings That Matter",
        "source_type": "web",
        "source_url": "https://www.typescriptlang.org/tsconfig#strict",
        "summary": "Strict mode is a bundle of 8 (now 12) compiler flags that catch most runtime bugs at type-check time. Turning them on incrementally — strictNullChecks first — is the highest-ROI refactor a TS codebase can do.",
        "key_points": [
            "strictNullChecks: kills the trillion-dollar mistake",
            "noImplicitAny: forces you to think about every parameter",
            "exactOptionalPropertyTypes: distinguishes 'missing' vs 'undefined'",
            "noUncheckedIndexedAccess: arr[i] is now T | undefined",
            "Migrate one folder at a time using // @ts-strict-ignore comments",
        ],
        "tags": ["typescript", "strict", "frontend", "best-practice"],
        "domain": "Engineering",
        "days_ago": 13,
    },
    {
        "title": "Cloud Run vs Lambda vs Fly.io — Where to Deploy in 2026",
        "source_type": "web",
        "source_url": "https://blog.lakera.ai/serverless-2026",
        "summary": "All three serverless platforms have converged on container-first deploys, generous free tiers, and sub-100ms cold starts. Cloud Run wins on Google ecosystem + GPU support, Lambda on AWS depth, Fly.io on global low-latency edges.",
        "key_points": [
            "Cloud Run gen2 cold start ~150ms; supports H100 GPUs",
            "Lambda SnapStart drops Java cold start to ~80ms",
            "Fly.io anycast routes to nearest region — sub-50ms p50 globally",
            "All three now support container images up to 10GB",
            "Egress pricing remains the hidden cost — monitor it",
        ],
        "tags": ["serverless", "cloud-run", "aws-lambda", "fly", "deploy"],
        "domain": "Engineering",
        "days_ago": 15,
    },
]

DEMO_TASKS = [
    {"title": "Submit refined prototype to Google Cloud Gen AI Academy", "priority": "high",
     "due_offset_days": 1, "status": "pending", "category": "Hackathon"},
    {"title": "Record 3-minute demo video for prototype submission", "priority": "high",
     "due_offset_days": 0, "status": "pending", "category": "Hackathon"},
    {"title": "Capture 5 more YouTube lectures on Vertex AI", "priority": "medium",
     "due_offset_days": -1, "status": "pending", "category": "Learning"},
    {"title": "Review flashcards on Transformer architecture", "priority": "medium",
     "due_offset_days": -3, "status": "pending", "category": "Study"},
    {"title": "Write technical blog post on multi-agent AI systems", "priority": "low",
     "due_offset_days": 6, "status": "pending", "category": "Content"},
    {"title": "Set up Firestore for production data persistence", "priority": "high",
     "due_offset_days": -2, "status": "completed", "category": "Development"},
    # ── New (April 2026) ───────────────────────────────────────────────────
    {"title": "Add per-user data scoping (X-User-Id header)", "priority": "high",
     "due_offset_days": 0, "status": "completed", "category": "Development"},
    {"title": "Polish demo seed with richer content", "priority": "medium",
     "due_offset_days": 0, "status": "pending", "category": "Development"},
    {"title": "Pitch rehearsal with mentor", "priority": "high",
     "due_offset_days": 1, "status": "pending", "category": "Hackathon"},
    {"title": "Schedule Sleep / Glucose experiment for 2 weeks", "priority": "low",
     "due_offset_days": 14, "status": "pending", "category": "Health"},
    {"title": "Migrate Recall to Cloud Run autoscaler", "priority": "medium",
     "due_offset_days": 4, "status": "pending", "category": "Development"},
    {"title": "Outreach to first 10 beta testers", "priority": "high",
     "due_offset_days": 2, "status": "pending", "category": "GTM"},
    {"title": "Refactor capture pipeline to use streaming", "priority": "medium",
     "due_offset_days": 7, "status": "pending", "category": "Development"},
]


def _today_iso_offset(days: int) -> str:
    return (datetime.date.today() + datetime.timedelta(days=days)).isoformat()


async def seed_demo_data(db) -> bool:
    """Seed GUEST demo data into the DB. Skips if any guest data already exists.

    Real authenticated users are unaffected — they land on a clean app and
    only see the data they themselves capture.
    """
    try:
        # Skip if guest already has memories
        existing = await db.collection("memories").limit(50).get()
        for doc in existing:
            data = doc.to_dict() or {}
            owner = data.get("user_id") or data.get("userId") or GUEST_UID
            if owner == GUEST_UID:
                return False  # already seeded

        now = datetime.datetime.now(datetime.timezone.utc)

        # ─── Memories ────────────────────────────────────────────────────────
        seeded_memory_ids: list = []
        for memory in DEMO_MEMORIES:
            data = dict(memory)
            data.pop("days_ago", None)
            data["id"] = str(uuid.uuid4())
            data["created_at"] = (now - datetime.timedelta(days=memory.get("days_ago", 1))).isoformat()
            data["user_id"] = GUEST_UID
            data["userId"] = GUEST_UID
            await db.collection("memories").document(data["id"]).set(data)
            seeded_memory_ids.append((data["id"], data["title"], data.get("source_type", "note"), data.get("source_url", ""), data.get("tags", [])))

        # ─── Tasks ───────────────────────────────────────────────────────────
        for task in DEMO_TASKS:
            data = dict(task)
            data["id"] = str(uuid.uuid4())
            data["created_at"] = now.isoformat()
            data["user_id"] = GUEST_UID
            data["userId"] = GUEST_UID
            data["due_date"] = _today_iso_offset(int(task.pop("due_offset_days", 0)))
            await db.collection("tasks").document(data["id"]).set(data)

        # ─── Calendar / schedule events ──────────────────────────────────────
        try:
            today = datetime.date.today()
            schedule_events = [
                ("Pitch rehearsal with mentor", 1, "10:00", 60, "Hackathon"),
                ("Deep work block — capture pipeline refactor", 0, "14:00", 120, "Engineering"),
                ("Demo recording session", 0, "16:30", 45, "Hackathon"),
                ("Submit prototype + write-up", 1, "11:00", 30, "Hackathon"),
                ("Beta tester onboarding call (#1)", 2, "15:00", 30, "GTM"),
                ("Beta tester onboarding call (#2)", 2, "16:00", 30, "GTM"),
                ("Weekly review", 5, "09:00", 45, "Productivity"),
                ("Read & summarise 'Year of Agents' podcast", 3, "08:00", 60, "Learning"),
            ]
            for title, day_off, time_str, dur, topic in schedule_events:
                ev_id = str(uuid.uuid4())
                ev = {
                    "id": ev_id,
                    "title": title,
                    "date": (today + datetime.timedelta(days=day_off)).isoformat(),
                    "time": time_str,
                    "duration_minutes": dur,
                    "description": "",
                    "linked_task_id": "",
                    "linked_memory_id": "",
                    "topic": topic,
                    "source": "demo-seed",
                    "created_at": now.isoformat(),
                    "gcal_event_id": "mock_calendar_id",
                    "user_id": GUEST_UID,
                    "userId": GUEST_UID,
                }
                await db.collection("schedules").document(ev_id).set(ev)
        except Exception as cal_e:
            print(f"Calendar seed warning: {cal_e}")

        # ─── Revisits (spaced repetition reminders) ──────────────────────────
        try:
            for idx, (mid, title, src_type, src_url, tags) in enumerate(seeded_memory_ids[:6]):
                rid = str(uuid.uuid4())
                next_due_dt = now + datetime.timedelta(days=(idx % 4) - 1, hours=idx * 3)
                rv = {
                    "id": rid,
                    "title": f"Revisit: {title[:120]}",
                    "memory_id": mid,
                    "url": src_url,
                    "notes": "",
                    "frequency": ["daily", "weekly", "monthly", "custom_days"][idx % 4],
                    "interval_days": 3 if idx % 4 == 3 else 0,
                    "specific_date": "",
                    "action_label": "Open",
                    "next_due": next_due_dt.isoformat(),
                    "last_visited": "",
                    "visit_count": idx,
                    "status": "active",
                    "created_at": now.isoformat(),
                    "updated_at": now.isoformat(),
                    "user_id": GUEST_UID,
                    "userId": GUEST_UID,
                }
                await db.collection("revisits").document(rid).set(rv)
        except Exception as rv_e:
            print(f"Revisits seed warning: {rv_e}")

        # ─── Workspace projects (3 demo projects) ────────────────────────────
        try:
            await _seed_workspace_projects(db, now, seeded_memory_ids)
        except Exception as ws_e:
            print(f"Workspace seed warning: {ws_e}")

        print(
            f"Demo data seeded for guest: "
            f"{len(DEMO_MEMORIES)} memories, {len(DEMO_TASKS)} tasks, "
            f"8 calendar events, 6 revisits, 3 workspace projects."
        )
        return True
    except Exception as e:
        print(f"Demo seed error: {e}")
        return False


async def _seed_workspace_projects(db, now: datetime.datetime, seeded_memory_ids: list) -> None:
    # Project 1 — GenAI APAC Hackathon (existing)
    project_id = "ws_demo_genai_apac"
    folder_id = "fld_research"
    ws_items = []
    ws_tasks = []
    for idx, (mid, title, src_type, src_url, tags) in enumerate(seeded_memory_ids[:6]):
        ws_items.append({
            "id": f"wi_{idx}_{uuid.uuid4().hex[:6]}",
            "kind": "memory",
            "ref_id": mid,
            "title": title,
            "url": src_url,
            "folder_id": folder_id,
            "section_id": "resources" if src_type in ("youtube", "web") else "notes",
            "tags": (tags or [])[:5],
            "added_at": (now - datetime.timedelta(days=max(0, 6 - idx))).isoformat(),
            "meta": {"source_type": src_type, "summary": title[:160], "tags": (tags or [])[:5]},
        })
    for tt in [
        ("Outline 3-min demo script with multi-agent flow", False, 1),
        ("Record screen capture of Capture → Recall → Plan flow", False, 2),
        ("Polish slide deck and pitch narrative", True, 4),
        ("Submit final prototype + write-up to GenAI APAC portal", False, 0),
    ]:
        ws_tasks.append({
            "id": f"wt_{uuid.uuid4().hex[:8]}",
            "text": tt[0],
            "folder_id": folder_id,
            "done": tt[1],
            "created_at": (now - datetime.timedelta(days=tt[2])).isoformat(),
        })
    project = {
        "id": project_id,
        "name": "GenAI APAC Hackathon 2026",
        "description": "Recall X247 — multi-agent second brain. Capture → Recall → Plan → Demo.",
        "color": "#f59e0b",
        "goal_type": "project",
        "folders": [
            {"id": folder_id, "name": "Research", "description": "Captured material to study", "weight": 1.0,
             "sections": [
                 {"id": "notes", "name": "Notes"},
                 {"id": "tasks", "name": "Tasks"},
                 {"id": "ideas", "name": "Ideas"},
                 {"id": "resources", "name": "Resources"},
             ]},
            {"id": "fld_demo", "name": "Demo Day", "description": "Pitch + recording", "weight": 0.6,
             "sections": [
                 {"id": "notes", "name": "Notes"},
                 {"id": "tasks", "name": "Tasks"},
                 {"id": "ideas", "name": "Ideas"},
                 {"id": "resources", "name": "Resources"},
             ]},
        ],
        "items": ws_items,
        "tasks": ws_tasks,
        "groups": [],
        "created_at": (now - datetime.timedelta(days=8)).isoformat(),
        "updated_at": now.isoformat(),
        "user_id": GUEST_UID,
        "userId": GUEST_UID,
    }
    await db.collection("workspace_projects").document(project_id).set(project)

    # Project 2 — Beta launch GTM
    fld_outreach = "fld_outreach"
    fld_onboard = "fld_onboard"
    p2_id = "ws_demo_beta_launch"
    p2_items = []
    p2_tasks = [
        {"id": f"wt_{uuid.uuid4().hex[:8]}", "text": "Draft launch tweet thread", "folder_id": fld_outreach, "done": True, "created_at": (now - datetime.timedelta(days=3)).isoformat()},
        {"id": f"wt_{uuid.uuid4().hex[:8]}", "text": "DM 25 PKM enthusiasts on Twitter", "folder_id": fld_outreach, "done": False, "created_at": (now - datetime.timedelta(days=2)).isoformat()},
        {"id": f"wt_{uuid.uuid4().hex[:8]}", "text": "Build onboarding checklist", "folder_id": fld_onboard, "done": False, "created_at": (now - datetime.timedelta(days=1)).isoformat()},
        {"id": f"wt_{uuid.uuid4().hex[:8]}", "text": "Send welcome email template", "folder_id": fld_onboard, "done": False, "created_at": now.isoformat()},
    ]
    project_2 = {
        "id": p2_id,
        "name": "Beta launch — first 100 users",
        "description": "Hand-pick beta testers, learn from every interaction, ship same-day fixes.",
        "color": "#22c55e",
        "goal_type": "project",
        "folders": [
            {"id": fld_outreach, "name": "Outreach", "description": "Cold + warm outreach playbook", "weight": 1.0,
             "sections": [{"id": "notes", "name": "Notes"}, {"id": "tasks", "name": "Tasks"},
                          {"id": "ideas", "name": "Ideas"}, {"id": "resources", "name": "Resources"}]},
            {"id": fld_onboard, "name": "Onboarding", "description": "Get first-runs to 'aha' fast", "weight": 0.7,
             "sections": [{"id": "notes", "name": "Notes"}, {"id": "tasks", "name": "Tasks"},
                          {"id": "ideas", "name": "Ideas"}, {"id": "resources", "name": "Resources"}]},
        ],
        "items": p2_items,
        "tasks": p2_tasks,
        "groups": [],
        "created_at": (now - datetime.timedelta(days=4)).isoformat(),
        "updated_at": now.isoformat(),
        "user_id": GUEST_UID,
        "userId": GUEST_UID,
    }
    await db.collection("workspace_projects").document(p2_id).set(project_2)

    # Project 3 — Personal learning area
    p3_id = "ws_demo_learning"
    fld_ai = "fld_ai_learn"
    fld_eng = "fld_eng_learn"
    project_3 = {
        "id": p3_id,
        "name": "Continuous learning",
        "description": "Ongoing area: AI papers, engineering practices, founder mindset.",
        "color": "#a78bfa",
        "goal_type": "area",
        "folders": [
            {"id": fld_ai, "name": "AI / ML", "description": "Papers, talks, podcasts", "weight": 1.0,
             "sections": [{"id": "notes", "name": "Notes"}, {"id": "tasks", "name": "Tasks"},
                          {"id": "ideas", "name": "Ideas"}, {"id": "resources", "name": "Resources"}]},
            {"id": fld_eng, "name": "Engineering", "description": "Tools, infra, best practice", "weight": 0.6,
             "sections": [{"id": "notes", "name": "Notes"}, {"id": "tasks", "name": "Tasks"},
                          {"id": "ideas", "name": "Ideas"}, {"id": "resources", "name": "Resources"}]},
        ],
        "items": [],
        "tasks": [
            {"id": f"wt_{uuid.uuid4().hex[:8]}", "text": "Read 'Year of Agents' Latent Space episode notes", "folder_id": fld_ai, "done": False, "created_at": (now - datetime.timedelta(days=1)).isoformat()},
            {"id": f"wt_{uuid.uuid4().hex[:8]}", "text": "Try TS strict-mode migration on side project", "folder_id": fld_eng, "done": False, "created_at": (now - datetime.timedelta(days=2)).isoformat()},
        ],
        "groups": [],
        "created_at": (now - datetime.timedelta(days=20)).isoformat(),
        "updated_at": now.isoformat(),
        "user_id": GUEST_UID,
        "userId": GUEST_UID,
    }
    await db.collection("workspace_projects").document(p3_id).set(project_3)
