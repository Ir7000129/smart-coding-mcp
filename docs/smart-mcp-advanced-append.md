
---

# Smart Coding MCP - Advanced Rules (BMAD Optimization)

> Extends the base rules with BMAD-specific optimizations.

## Rule 4: Architecture First

**Trigger:** Before implementing any system, component, or feature.

**Action:**
- **MUST** search for existing architecture documentation first.
- **QUERY:** `a_semantic_search("[system name] architecture design")`
- **GOAL:** Find the canonical design patterns, interfaces, and persistence schemas defined in the `Verse/game design/` folder.
- **DO NOT** invent new patterns without verifying they don't already exist.

## Rule 5: Requirements Integrity

**Trigger:** Before writing code for a specific user story or epic.

**Action:**
- **MUST** retrieve the specific acceptance criteria and specs.
- **QUERY:** `a_semantic_search("story-[id] specs")` or `a_semantic_search("GDD [feature] requirements")`
- **GOAL:** Ensure implementation matches the strictly defined GDD/Story requirements.
- **NEVER** infer requirements; always lookup the source of truth.

## Rule 6: Workflow Awareness

**Trigger:** When picking up new work.

**Action:**
- **CHECK** the current sprint status to ensure alignment.
- **QUERY:** `a_semantic_search("story status Ready In Progress")`
- **GOAL:** Avoid working on deprioritized or blocked items.

## Rule 7: Granular Method Search

**Trigger:** Finding specific function logic within large files/classes.

**Action:**
- **USE** `ClassName::MethodName` format (or just `MethodName`) in queries.
- **EXAMPLE:** `a_semantic_search("custom_timer::StartTimer")`
- **NOTE:** The optimized Verse chunker now indexes individual methods separately.
