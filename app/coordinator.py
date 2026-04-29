"""
Orchestrator — Primary multi-agent coordinator for Recall X247.
Routes user requests to specialized sub-agents using OpenAI function calling.
Tracks execution as Workflows with named Steps for full auditability.
"""

import json
import asyncio
import datetime
import httpx
from typing import List, Dict, Any, AsyncGenerator
from openai import AsyncOpenAI, APITimeoutError, APIConnectionError, RateLimitError
from app.config import settings, OPENROUTER_BASE_URL, OPENAI_BASE_URL

# Global timeout applied to every OpenAI call
_OPENAI_TIMEOUT = httpx.Timeout(connect=8.0, read=50.0, write=10.0, pool=5.0)


def _make_client(use_fallback: bool = False) -> AsyncOpenAI:
    """Create an OpenAI-compatible client. Falls back to OpenAI on Gemini rate limits."""
    if use_fallback and settings.FALLBACK_AI_KEY:
        from app.config import _is_openrouter_key
        fb_key = settings.FALLBACK_AI_KEY
        base = settings.FALLBACK_AI_BASE_URL
        extra = {"HTTP-Referer": "https://recall-x247.replit.app", "X-Title": "Recall X247"} if _is_openrouter_key(fb_key) else {}
        return AsyncOpenAI(api_key=fb_key, base_url=base, default_headers=extra, timeout=_OPENAI_TIMEOUT)
    return AsyncOpenAI(
        api_key=settings.PRIMARY_AI_KEY or settings.OPENAI_API_KEY,
        base_url=settings.openai_base_url,
        default_headers=settings.openai_extra_headers,
        timeout=_OPENAI_TIMEOUT,
    )


def _fallback_model() -> str:
    return settings.FALLBACK_AI_MODEL


from app.capture_agent import capture, generate_daily_briefing, generate_flashcards, generate_study_plan
from app.task_agent import create_task, list_tasks, get_tasks_summary
from app.calendar_agent import create_event, list_upcoming_events
from app.recall_agent import recall, list_memories, get_stats
from app.workflow_engine import create_workflow, Workflow, AGENT_REGISTRY

# ─── Tool Definitions (MCP-style) ─────────────────────────────────────────────

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "capture_knowledge",
            "description": "CaptureAgent: Save and summarize content from YouTube URLs, web articles, or typed notes. Automatically detects source type from URL.",
            "parameters": {
                "type": "object",
                "properties": {
                    "source_type": {"type": "string", "enum": ["youtube", "web", "note"], "description": "Type of content source"},
                    "url": {"type": "string", "description": "Full URL for youtube or web sources"},
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
            "description": "RecallAgent: Search and answer questions from saved memories in the knowledge base. Use when user asks about saved knowledge.",
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
            "name": "list_memories",
            "description": "RecallAgent: List memories from the knowledge vault, optionally filtered by domain.",
            "parameters": {
                "type": "object",
                "properties": {
                    "domain": {"type": "string", "description": "Optional domain filter (AI, Technology, Science, Business, Health, etc.)"},
                    "limit": {"type": "integer", "description": "Number of memories to return", "default": 10}
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "create_task",
            "description": "TaskAgent: Create a new task or to-do item. Use when user mentions needing to do something.",
            "parameters": {
                "type": "object",
                "properties": {
                    "title": {"type": "string", "description": "Task title or description"},
                    "due_date": {"type": "string", "description": "Due date in YYYY-MM-DD format"},
                    "priority": {"type": "string", "enum": ["low", "medium", "high"]},
                    "linked_memory_id": {"type": "string", "description": "Optional related memory ID"}
                },
                "required": ["title"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "list_tasks",
            "description": "TaskAgent: Show the user's current task list.",
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
            "description": "CalendarAgent: Schedule a study session or calendar event.",
            "parameters": {
                "type": "object",
                "properties": {
                    "title": {"type": "string"},
                    "date": {"type": "string", "description": "YYYY-MM-DD"},
                    "time": {"type": "string", "description": "HH:MM 24h"},
                    "duration_minutes": {"type": "integer", "default": 60}
                },
                "required": ["title", "date", "time"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "list_schedule",
            "description": "CalendarAgent: Show upcoming calendar events.",
            "parameters": {"type": "object", "properties": {}}
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_daily_briefing",
            "description": "BriefingAgent: Generate a personalized AI daily briefing with learning summary and recommendations.",
            "parameters": {"type": "object", "properties": {}}
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_knowledge_stats",
            "description": "AnalyticsAgent: Get statistics about the knowledge base including memory count, domains, and learning velocity.",
            "parameters": {"type": "object", "properties": {}}
        }
    },
    {
        "type": "function",
        "function": {
            "name": "generate_study_plan",
            "description": "BriefingAgent: Create a personalized multi-day study plan for a topic.",
            "parameters": {
                "type": "object",
                "properties": {
                    "topic": {"type": "string", "description": "Topic to study"},
                    "days": {"type": "integer", "description": "Number of days", "default": 7}
                },
                "required": ["topic"]
            }
        }
    }
]

# ─── Tool → Agent mapping ─────────────────────────────────────────────────────

TOOL_AGENT_MAP = {
    "capture_knowledge": "CaptureAgent",
    "recall_knowledge": "RecallAgent",
    "list_memories": "RecallAgent",
    "create_task": "TaskAgent",
    "list_tasks": "TaskAgent",
    "schedule_event": "CalendarAgent",
    "list_schedule": "CalendarAgent",
    "get_daily_briefing": "BriefingAgent",
    "get_knowledge_stats": "AnalyticsAgent",
    "generate_study_plan": "BriefingAgent"
}

TOOL_DISPLAY_NAMES = {
    "capture_knowledge": "Capturing knowledge",
    "recall_knowledge": "Searching memories",
    "list_memories": "Listing memories",
    "create_task": "Creating task",
    "list_tasks": "Fetching tasks",
    "schedule_event": "Scheduling event",
    "list_schedule": "Fetching schedule",
    "get_daily_briefing": "Generating briefing",
    "get_knowledge_stats": "Analyzing stats",
    "generate_study_plan": "Creating study plan"
}

# ─── System Prompt ────────────────────────────────────────────────────────────

SYSTEM_PROMPT = """You are Recall X247 Neural AI — an AI-powered Second Brain orchestrator.
You coordinate 7 specialized sub-agents and have FULL MEMORY of this conversation.

SUB-AGENTS YOU COORDINATE:
- CaptureAgent: Captures knowledge from YouTube, web, PDFs, notes → use capture_knowledge
- RecallAgent: Searches saved memories semantically → use recall_knowledge or list_memories
- TaskAgent: Creates and manages tasks → use create_task or list_tasks
- CalendarAgent: Schedules events and study sessions → use schedule_event or list_schedule
- BriefingAgent: Generates briefings and study plans → use get_daily_briefing or generate_study_plan
- AnalyticsAgent: Provides stats and insights → use get_knowledge_stats
- FlashcardAgent: Generates spaced-repetition flashcards from a memory

CONVERSATION CONTEXT IS SACRED:
- The full chat history is provided. NEVER pretend you don't know what was just discussed.
- If the user replies "yes", "sure", "do it", or any short affirmation, it ALWAYS refers to the most recent suggestion you made — execute that exact action without asking again.
- If the user says "no" / "later", acknowledge briefly and offer 1-2 alternative agents that could help.
- Always remember the most recently captured memory (its title, id, domain, tags) — refer to it by name in follow-ups.

ROUTING RULES:
- YouTube/web URL → CaptureAgent (capture_knowledge)
- Question about saved content → RecallAgent (recall_knowledge)
- "create task" / "remind me" / "todo" → TaskAgent (create_task)
- "schedule" / "book time" / "study session" → CalendarAgent (schedule_event)
- "briefing" / "daily summary" → BriefingAgent (get_daily_briefing)
- "stats" / "how am I doing" → AnalyticsAgent (get_knowledge_stats)
- COMPLEX workflows: chain multiple agents (e.g., capture THEN create_task THEN schedule_event)

AFTER EVERY SUCCESSFUL CAPTURE — MANDATORY FOLLOW-UP:
End your reply with a numbered list of 3-4 concrete next-actions tied to specific OTHER agents,
based on the captured topic. Example for an AI/ML capture:
  1. TaskAgent — Create a task: "Build a demo using these techniques" (due in 3 days)
  2. CalendarAgent — Schedule a 45-min deep-study session for this weekend
  3. BriefingAgent — Generate a 7-day study plan on this topic
  4. RecallAgent — Find related memories you've already saved on this domain
Then ask: "Which one should I run?" and WAIT. When the user picks (by number, name, or "yes" to a single suggestion), execute that tool immediately with the captured memory's details as context.

PROACTIVE RECALL:
For non-capture user questions, FIRST silently call recall_knowledge to find related saved memories.
If matches exist, weave them into your reply ("Based on what you saved about X last week…").
This makes the assistant feel like a true second brain.

Today: {today}

Always confirm completed actions with ✅. Be concise. Use Hinglish-friendly tone (warm, direct)."""

# ─── Session History (in-memory conversation memory) ──────────────────────────

_SESSION_HISTORY: Dict[str, List[dict]] = {}
_SESSION_MAX_MESSAGES = 24  # Keep last ~12 turns (user+assistant pairs)


def _serialize_assistant_msg(msg) -> dict:
    """Convert an OpenAI ChatCompletionMessage to a JSON-safe dict for replay."""
    out: dict = {"role": "assistant", "content": msg.content or ""}
    if getattr(msg, "tool_calls", None):
        out["tool_calls"] = [
            {
                "id": tc.id,
                "type": "function",
                "function": {"name": tc.function.name, "arguments": tc.function.arguments},
            }
            for tc in msg.tool_calls
        ]
    return out


def _trim_history(session_id: str) -> None:
    h = _SESSION_HISTORY.get(session_id, [])
    if len(h) <= _SESSION_MAX_MESSAGES:
        return
    # Drop oldest while ensuring we don't orphan a tool message without its assistant
    overflow = len(h) - _SESSION_MAX_MESSAGES
    new_start = overflow
    while new_start < len(h) and h[new_start].get("role") == "tool":
        new_start += 1
    _SESSION_HISTORY[session_id] = h[new_start:]


def get_session_history(session_id: str) -> List[dict]:
    return list(_SESSION_HISTORY.get(session_id, []))


def clear_session_history(session_id: str) -> int:
    n = len(_SESSION_HISTORY.get(session_id, []))
    _SESSION_HISTORY.pop(session_id, None)
    return n


# ─── Tool Executor ────────────────────────────────────────────────────────────

async def run_tool(name: str, args: dict) -> Any:
    if name == "capture_knowledge":
        return await capture(
            source_type=args.get("source_type", "note"),
            url=args.get("url", ""),
            content=args.get("content", ""),
        )
    elif name == "recall_knowledge":
        return await recall(query=args.get("query", ""))
    elif name == "list_memories":
        return await list_memories(domain=args.get("domain", ""), limit=args.get("limit", 10))
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
    elif name == "get_daily_briefing":
        return await generate_daily_briefing()
    elif name == "get_knowledge_stats":
        return await get_stats()
    elif name == "generate_study_plan":
        return await generate_study_plan(
            topic=args.get("topic", ""),
            days=args.get("days", 7)
        )
    return {"error": f"Unknown tool: {name}"}


# ─── Coordinator (sync) ───────────────────────────────────────────────────────

async def run_coordinator(message: str, session_id: str) -> dict:
    if not settings.OPENAI_API_KEY:
        return {
            "reply": "Neural AI is not configured. Please set GEN_APAC_API_KEY in the Secrets panel.",
            "agents_called": [],
            "session_id": session_id,
            "error": "Unauthorized"
        }

    workflow = create_workflow(
        name="Chat Request",
        description=message[:80],
        user_message=message,
        session_id=session_id
    )

    client = _make_client()
    current_model = settings.OPENAI_MODEL

    history = _SESSION_HISTORY.get(session_id, [])
    new_user_msg = {"role": "user", "content": message}
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT.format(today=datetime.date.today().isoformat())},
        *history,
        new_user_msg,
    ]
    turn_messages: List[dict] = [new_user_msg]

    reply = ""
    try:
        for _ in range(6):
            try:
                response = await asyncio.wait_for(
                    client.chat.completions.create(
                        model=current_model,
                        messages=messages,
                        tools=TOOLS,
                        tool_choice="auto",
                        temperature=0.3
                    ),
                    timeout=55.0
                )
            except RateLimitError:
                if current_model != _fallback_model():
                    import logging
                    logging.getLogger("recall-x247").warning("Gemini rate limit hit — falling back to OpenRouter.")
                    client = _make_client(use_fallback=True)
                    current_model = _fallback_model()
                    response = await asyncio.wait_for(
                        client.chat.completions.create(
                            model=current_model,
                            messages=messages,
                            tools=TOOLS,
                            tool_choice="auto",
                            temperature=0.3
                        ),
                        timeout=55.0
                    )
                else:
                    raise

            msg = response.choices[0].message
            messages.append(msg)
            serialized_assistant = _serialize_assistant_msg(msg)
            turn_messages.append(serialized_assistant)

            if not msg.tool_calls:
                reply = msg.content or ""
                break

            tool_results = []
            for tc in msg.tool_calls:
                tool_name = tc.function.name
                tool_args = json.loads(tc.function.arguments)
                agent_name = TOOL_AGENT_MAP.get(tool_name, "Orchestrator")
                display_name = TOOL_DISPLAY_NAMES.get(tool_name, tool_name)

                step = workflow.add_step(
                    name=display_name,
                    agent=agent_name,
                    tool=tool_name,
                    input_data=tool_args
                )
                step.start()

                try:
                    result = await run_tool(tool_name, tool_args)
                    step.complete(result)
                except Exception as e:
                    step.fail(str(e))
                    result = {"error": str(e)}

                tr = {
                    "tool_call_id": tc.id,
                    "role": "tool",
                    "content": json.dumps(result, default=str)
                }
                tool_results.append(tr)
                turn_messages.append(tr)

            messages.extend(tool_results)

        if not reply:
            reply = "I've completed the requested actions. Let me know if you need anything else!"
            turn_messages.append({"role": "assistant", "content": reply})

        workflow.complete(reply)

    except Exception as e:
        print(f"Coordinator Error: {e}")
        reply = f"I encountered an error: {str(e)}"
        workflow.fail(str(e))
        turn_messages.append({"role": "assistant", "content": reply})

    # Persist this turn into session history
    _SESSION_HISTORY.setdefault(session_id, []).extend(turn_messages)
    _trim_history(session_id)

    return {
        "reply": reply,
        "agents_called": workflow.agents_called,
        "session_id": session_id,
        "workflow_id": workflow.id
    }


# ─── Streaming Coordinator (SSE) ──────────────────────────────────────────────

async def run_coordinator_stream(message: str, session_id: str) -> AsyncGenerator[str, None]:
    """
    Streaming version of the coordinator.
    Yields SSE-formatted events as each agent step executes.
    """

    def sse(event_type: str, data: dict) -> str:
        return f"data: {json.dumps({'type': event_type, **data})}\n\n"

    if not settings.OPENAI_API_KEY:
        yield sse("error", {"message": "Neural AI not configured. Set GEN_APAC_API_KEY in Secrets."})
        return

    workflow = create_workflow(
        name="Chat Stream",
        description=message[:80],
        user_message=message,
        session_id=session_id
    )

    yield sse("workflow_start", {
        "workflow_id": workflow.id,
        "message": message,
        "timestamp": workflow.created_at
    })

    client = _make_client()
    current_model = settings.OPENAI_MODEL

    history = _SESSION_HISTORY.get(session_id, [])
    new_user_msg = {"role": "user", "content": message}
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT.format(today=datetime.date.today().isoformat())},
        *history,
        new_user_msg,
    ]
    turn_messages: List[dict] = [new_user_msg]

    reply = ""
    try:
        for iteration in range(6):
            yield sse("thinking", {"iteration": iteration})

            # ── Planning call (non-streaming, needs to inspect tool_calls) ──────
            try:
                response = await asyncio.wait_for(
                    client.chat.completions.create(
                        model=current_model,
                        messages=messages,
                        tools=TOOLS,
                        tool_choice="auto",
                        temperature=0.3
                    ),
                    timeout=55.0
                )
            except RateLimitError:
                if current_model != _fallback_model():
                    import logging
                    logging.getLogger("recall-x247").warning("Gemini rate limit — falling back to OpenRouter.")
                    client = _make_client(use_fallback=True)
                    current_model = _fallback_model()
                    try:
                        response = await asyncio.wait_for(
                            client.chat.completions.create(
                                model=current_model,
                                messages=messages,
                                tools=TOOLS,
                                tool_choice="auto",
                                temperature=0.3
                            ),
                            timeout=55.0
                        )
                    except Exception as fb_err:
                        yield sse("error", {"message": f"AI unavailable: {str(fb_err)}", "workflow_id": workflow.id})
                        workflow.fail(str(fb_err))
                        return
                else:
                    yield sse("error", {"message": "AI quota exceeded. Please try again later.", "workflow_id": workflow.id})
                    workflow.fail("Rate limit")
                    return
            except (asyncio.TimeoutError, APITimeoutError):
                yield sse("error", {
                    "message": "The AI took too long to respond. Please try again.",
                    "workflow_id": workflow.id
                })
                workflow.fail("LLM timeout")
                return
            except APIConnectionError as e:
                yield sse("error", {
                    "message": f"Connection to AI failed: {str(e)}",
                    "workflow_id": workflow.id
                })
                workflow.fail(str(e))
                return

            msg = response.choices[0].message
            messages.append(msg)
            serialized_assistant = _serialize_assistant_msg(msg)
            turn_messages.append(serialized_assistant)

            # ── No tool calls → stream final reply word-by-word ──────────────
            if not msg.tool_calls:
                raw = msg.content or "All done! Let me know if you need anything else."
                # Simulate streaming by yielding one word at a time so the
                # frontend can progressively render instead of waiting for
                # the full payload.  Then do a real stream call for subsequent
                # synthesis steps (when tools were already called).
                if iteration == 0:
                    # Direct answer — no tools used: stream word-by-word from content
                    words = raw.split(" ")
                    for i, word in enumerate(words):
                        chunk = word + (" " if i < len(words) - 1 else "")
                        reply += chunk
                        yield sse("token", {"text": chunk})
                        await asyncio.sleep(0.01)
                else:
                    # Post-tool synthesis: make a streaming call so the user
                    # sees the reply as it generates
                    try:
                        stream = await asyncio.wait_for(
                            client.chat.completions.create(
                                model=settings.OPENAI_MODEL,
                                messages=messages,
                                stream=True,
                                temperature=0.3
                            ),
                            timeout=55.0
                        )
                        async for chunk in stream:
                            delta = chunk.choices[0].delta.content if chunk.choices else None
                            if delta:
                                reply += delta
                                yield sse("token", {"text": delta})
                    except Exception:
                        if not reply:
                            reply = raw
                            yield sse("token", {"text": raw})
                    # The serialized assistant msg from the planning call had
                    # empty content — replace it with the actual streamed reply
                    # so session history reflects what the user saw.
                    if turn_messages and turn_messages[-1].get("role") == "assistant":
                        turn_messages[-1]["content"] = reply
                break

            # ── Execute tool calls ─────────────────────────────────────────────
            for tc in msg.tool_calls:
                tool_name = tc.function.name
                tool_args = json.loads(tc.function.arguments)
                agent_name = TOOL_AGENT_MAP.get(tool_name, "Orchestrator")
                display_name = TOOL_DISPLAY_NAMES.get(tool_name, tool_name)

                step = workflow.add_step(
                    name=display_name,
                    agent=agent_name,
                    tool=tool_name,
                    input_data=tool_args
                )
                step.start()

                yield sse("agent_start", {
                    "step_id": step.id,
                    "agent": agent_name,
                    "tool": tool_name,
                    "name": display_name,
                    "input": tool_args
                })

                try:
                    result = await asyncio.wait_for(run_tool(tool_name, tool_args), timeout=20.0)
                    step.complete(result)
                    yield sse("agent_complete", {
                        "step_id": step.id,
                        "agent": agent_name,
                        "tool": tool_name,
                        "name": display_name,
                        "output_summary": _summarize_output(result),
                        "duration_ms": round(step.duration_ms, 1)
                    })
                except asyncio.TimeoutError:
                    step.fail("Tool timed out")
                    result = {"error": "Tool execution timed out"}
                    yield sse("agent_error", {
                        "step_id": step.id,
                        "agent": agent_name,
                        "error": "Tool execution timed out"
                    })
                except Exception as e:
                    step.fail(str(e))
                    result = {"error": str(e)}
                    yield sse("agent_error", {
                        "step_id": step.id,
                        "agent": agent_name,
                        "error": str(e)
                    })

                tr = {
                    "tool_call_id": tc.id,
                    "role": "tool",
                    "content": json.dumps(result, default=str)
                }
                messages.append(tr)
                turn_messages.append(tr)

        if not reply:
            reply = "All tasks completed successfully! Let me know if you need anything else."
            turn_messages.append({"role": "assistant", "content": reply})

        workflow.complete(reply)

        # Persist this turn into session history
        _SESSION_HISTORY.setdefault(session_id, []).extend(turn_messages)
        _trim_history(session_id)

        yield sse("workflow_complete", {
            "workflow_id": workflow.id,
            "reply": reply,
            "agents_called": workflow.agents_called,
            "steps": [s.to_dict() for s in workflow.steps],
            "timestamp": workflow.completed_at
        })

    except Exception as e:
        print(f"Coordinator Stream Error: {e}")
        workflow.fail(str(e))
        yield sse("error", {"message": str(e), "workflow_id": workflow.id})


def _summarize_output(result: Any) -> str:
    """Create a short human-readable summary of a tool result."""
    if isinstance(result, dict):
        if "error" in result:
            return f"Error: {result['error']}"
        if "title" in result:
            return f"'{result['title']}'"
        if "answer" in result:
            return result["answer"][:120] + "..." if len(result.get("answer", "")) > 120 else result.get("answer", "")
        if "reply" in result:
            return result["reply"][:120]
        keys = list(result.keys())
        return f"Returned {len(keys)} fields: {', '.join(keys[:4])}"
    if isinstance(result, list):
        return f"{len(result)} items returned"
    return str(result)[:100]
