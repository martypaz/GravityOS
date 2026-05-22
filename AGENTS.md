# AI Agent Guidelines

This file contains critical project-specific instructions and architecture rules for AI agents touching this codebase.

## Version Control & Source Management

**CRITICAL RULE: DO NOT AUTO-COMMIT CODE TO GIT.**
1. **Never** run `git commit` or `git push` without explicit instruction from the user.
2. Auto-committing triggers CI/CD pipelines which can deploy untested, work-in-progress code.
3. The user will review and manage all git commits and deployments manually.

## Terminology & Tone

1. **UK English spelling**: Always use UK English spelling (e.g. "colour" instead of "color", "optimise" instead of "optimize") for all UI text and code comments.
2. Maintain clean, direct, and helpful explanations across all inline documentation.

## AI Prompt Engineering & Content Generation

**CRITICAL RULE: Combating AI Content Detectors**
When building or modifying prompts for AI-generated content, you MUST enforce strict anti-AI-detector rules:
1. **High Burstiness & Perplexity**: Instruct the AI to vary sentence lengths dramatically (mixing very short, punchy sentences with longer, complex ones).
2. **Banned Buzzwords**: You MUST explicitly forbid the AI from using common, easily detectable AI buzzwords.
   **STRICT BLACKLIST**: *delve, robust, seamless, tapestry, testament, elevate, foster, realm, crucial, vital, unlock, comprehensive, tailored, landscape, enhance, empower, ensure, ultimate, transformative, navigate*.
3. **Conversational Phrasing**: Maintain humanlike transitions and clear logical structures.


<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->
