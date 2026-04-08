import json
import asyncio
from typing import List, Dict, Any
from openai import AsyncOpenAI
from app.config import settings
from app.capture_agent import capture
from app.task_agent import create_task, list_tasks
from app.calendar_agent import create_event, list_upcoming_events
from app.recall_agent import recall

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "capture_knowledge",
            "description": "Save and summarize content from YouTube URLs, web articles, or typed notes. Use when user shares a URL or wants to save information.",
            "parameters": {
                "type": "object",
                "properties": {
                    "source_type": {"type": "string", "enum": ["youtube", "web", "note"], "description": "Type of content source"},
                    "url": {"type": "string", "description": "URL for youtube or web sources"},
                    "content": {"type": "string", "description": "Text content for notes"}
                },
                "required": ["source_type"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "recall_knowledge",
            "description": "Search and answer questions from saved memories in the Second Brain. Use when user asks a question about saved knowledge.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "The question or topic to search for"}
                },
                "required": ["query"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "create_task",
            "description": "Create a new task or to-do item. Use when user mentions needing to do something or wants a reminder.",
            "parameters": {
                "type": "object",
                "properties": {
                    "title": {"type": "string", "description": "Task title or description"},
                    "due_date": {"type": "string", "description": "Due date in YYYY-MM-DD format"},
                    "priority": {"type": "string", "enum": ["low", "medium", "high"], "description": "Task priority level"},
                    "linked_memory_id": {"type": "string", "description": "Optional ID of a related memory"}
                },
                "required": ["title"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "list_tasks",
            "description": "Show the user's current task list.",
            "parameters": {
                "type": "object",
                "properties": {
                    "status": {"type": "string", "enum": ["pending", "completed"], "default": "pending"}
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "schedule_event",
            "description": "Schedule a study session or calendar event. Use when user wants to book time or set a study session.",
            "parameters": {
                "type": "object",
                "properties": {
                    "title": {"type": "string", "description": "Event title"},
                    "date": {"type": "string", "description": "Date in YYYY-MM-DD format"},
                    "time": {"type": "string", "description": "Time in HH:MM format (24h)"},
                    "duration_minutes": {"type": "integer", "description": "Duration in minutes", "default": 60}
                },
                "required": ["title", "date", "time"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "list_schedule",
            "description": "Show upcoming calendar events and study sessions.",
            "parameters": {"type": "object", "properties": {}}
        }
    }
]

SYSTEM_PROMPT = """You are Recall X247, an AI-powered Second Brain assistant powered by OpenAI GPT.

You help users:
1. CAPTURE knowledge from YouTube videos, web articles, and typed notes
2. RECALL information from their saved knowledge base
3. CREATE and manage tasks linked to their learning
4. SCHEDULE study sessions and review events

WORKFLOW RULES:
- URL with youtube.com/youtu.be → use capture_knowledge with source_type "youtube"
- Other URLs → use capture_knowledge with source_type "web"
- User asks a question about saved content → use recall_knowledge
- User says "create task", "remind me", "todo" → use create_task
- User says "schedule", "book time", "study session" → use schedule_event
- COMPLEX: "Save this AND create a task" → capture first, then create_task with the memory
- COMPLEX: "Save and schedule review" → capture first, then schedule_event

After completing actions, always summarize what was done with ✅.
Be helpful, concise, and proactive in suggesting follow-up actions.
Today's date: {today}"""


async def run_tool(name: str, args: dict) -> Any:
    if name == "capture_knowledge":
        return await capture(
            source_type=args.get("source_type", "note"),
            url=args.get("url", ""),
            content=args.get("content", ""),
            user_id="demo_user"
        )
    elif name == "recall_knowledge":
        return await recall(query=args.get("query", ""))
    elif name == "create_task":
        return await create_task(
            title=args["title"],
            due_date=args.get("due_date", ""),
            priority=args.get("priority", "medium"),
            linked_memory_id=args.get("linked_memory_id", "")
        )
    elif name == "list_tasks":
        return await list_tasks(status=args.get("status", "pending"))
    elif name == "schedule_event":
        return await create_event(
            title=args["title"],
            date=args["date"],
            time=args["time"],
            duration_minutes=args.get("duration_minutes", 60)
        )
    elif name == "list_schedule":
        return await list_upcoming_events(days=7)
    return {"error": f"Unknown tool: {name}"}


async def run_coordinator(message: str, session_id: str) -> dict:
    if not settings.OPENAI_API_KEY:
        return {
            "reply": "AI Service is not configured. Please set OPENAI_API_KEY in the Secrets panel.",
            "agents_called": [],
            "session_id": session_id,
            "error": "Unauthorized"
        }

    import datetime
    client = AsyncOpenAI(
        api_key=settings.OPENAI_API_KEY,
        base_url=settings.openai_base_url,
        default_headers=settings.openai_extra_headers
    )
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT.format(today=datetime.date.today().isoformat())},
        {"role": "user", "content": message}
    ]

    agents_called = []
    reply = ""

    try:
        for _ in range(5):
            response = await client.chat.completions.create(
                model=settings.OPENAI_MODEL,
                messages=messages,
                tools=TOOLS,
                tool_choice="auto",
                temperature=0.3
            )

            msg = response.choices[0].message
            messages.append(msg)

            if not msg.tool_calls:
                reply = msg.content or ""
                break

            tool_results = []
            for tc in msg.tool_calls:
                tool_name = tc.function.name
                tool_args = json.loads(tc.function.arguments)

                if tool_name not in agents_called:
                    agents_called.append(tool_name)

                result = await run_tool(tool_name, tool_args)
                tool_results.append({
                    "tool_call_id": tc.id,
                    "role": "tool",
                    "content": json.dumps(result, default=str)
                })

            messages.extend(tool_results)

        if not reply:
            reply = "I've completed the requested actions. Let me know if you need anything else!"

    except Exception as e:
        print(f"Coordinator Error: {e}")
        reply = f"I encountered an error: {str(e)}"

    return {
        "reply": reply,
        "agents_called": agents_called,
        "session_id": session_id
    }
