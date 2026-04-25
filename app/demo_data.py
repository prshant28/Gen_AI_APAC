"""
Demo data seeder — populates the in-memory (or real) DB with impressive
sample memories, tasks, and calendar events so judges see a full app instantly.
"""
import datetime
import uuid

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
            "Available via Google AI Studio and Vertex AI"
        ],
        "tags": ["gemini", "google", "multimodal", "ai", "llm"],
        "domain": "AI",
        "created_at": (datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=2)).isoformat(),
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
            "AgentBench shows 40% improvement over single-agent baselines"
        ],
        "tags": ["agents", "orchestration", "architecture", "ai", "multi-agent"],
        "domain": "AI",
        "created_at": (datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=5)).isoformat(),
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
            "Second Brain externalizes cognition to reduce mental load"
        ],
        "tags": ["productivity", "pkm", "para", "notes", "knowledge"],
        "domain": "Productivity",
        "created_at": (datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=7)).isoformat(),
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
            "Hybrid: fine-tune for style + RAG for factual grounding"
        ],
        "tags": ["rag", "fine-tuning", "llm", "retrieval", "embeddings"],
        "domain": "AI",
        "created_at": (datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=10)).isoformat(),
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
            "Vertex AI Search: enterprise RAG pipeline in minutes"
        ],
        "tags": ["vertexai", "googlecloud", "mlops", "gcp", "enterprise"],
        "domain": "Technology",
        "created_at": (datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=3)).isoformat(),
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
            "Mixture of Experts (MoE) scales parameters without proportional compute"
        ],
        "tags": ["transformer", "attention", "architecture", "ml", "deep-learning"],
        "domain": "AI",
        "created_at": (datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=14)).isoformat(),
    },
    {
        "title": "Effective Spaced Repetition for Technical Learning",
        "source_type": "note",
        "source_url": "",
        "summary": "Spaced repetition schedules review sessions at scientifically optimal intervals — 1d → 3d → 7d → 21d → 60d — reducing forgetting by 80% vs massed practice. Combined with active recall (not re-reading), learners can master 10x more material in the same time, making it the most evidence-based study technique.",
        "key_points": [
            "Ebbinghaus forgetting curve: 50% forgotten within 1 hour without review",
            "Spaced intervals: review before forgetting sets in, not after",
            "Active recall beats passive review: test yourself, don't re-read",
            "Anki algorithm (SM-2): adjusts intervals based on recall difficulty",
            "Interleaving: mixing topics improves long-term retention by 35%"
        ],
        "tags": ["learning", "spaced-repetition", "anki", "memory", "study"],
        "domain": "Productivity",
        "created_at": (datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=12)).isoformat(),
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
            "Least-to-Most: decompose hard problems into easy subproblems"
        ],
        "tags": ["prompting", "chain-of-thought", "llm", "cot", "reasoning"],
        "domain": "AI",
        "created_at": (datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=8)).isoformat(),
    },
]

DEMO_TASKS = [
    {"title": "Submit refined prototype to Google Cloud Gen AI Academy", "priority": "high",
     "due_date": "2026-04-30", "status": "pending", "category": "Hackathon"},
    {"title": "Record 3-minute demo video for prototype submission", "priority": "high",
     "due_date": "2026-04-29", "status": "pending", "category": "Hackathon"},
    {"title": "Capture 5 more YouTube lectures on Vertex AI", "priority": "medium",
     "due_date": "2026-04-28", "status": "pending", "category": "Learning"},
    {"title": "Review flashcards on Transformer architecture", "priority": "medium",
     "due_date": "2026-04-26", "status": "pending", "category": "Study"},
    {"title": "Write technical blog post on multi-agent AI systems", "priority": "low",
     "due_date": "2026-05-05", "status": "pending", "category": "Content"},
    {"title": "Set up Firestore for production data persistence", "priority": "high",
     "due_date": "2026-04-27", "status": "completed", "category": "Development"},
]


async def seed_demo_data(db) -> bool:
    """Seed demo data into the DB. Skips if data already exists."""
    try:
        existing = await db.collection("memories").limit(1).get()
        if existing:
            return False

        # Seed memories
        for memory in DEMO_MEMORIES:
            data = dict(memory)
            data["id"] = str(uuid.uuid4())
            await db.collection("memories").add(data)

        # Seed tasks
        for task in DEMO_TASKS:
            data = dict(task)
            data["id"] = str(uuid.uuid4())
            data["created_at"] = datetime.datetime.now(datetime.timezone.utc).isoformat()
            await db.collection("tasks").add(data)

        print(f"Demo data seeded: {len(DEMO_MEMORIES)} memories, {len(DEMO_TASKS)} tasks")
        return True
    except Exception as e:
        print(f"Demo seed error: {e}")
        return False
