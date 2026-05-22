# GravityOS: Getting Started Guide

Welcome to the **GravityOS AI Control Dashboard**! This dashboard allows you to fully monitor, configure, and customize the AI systems installed on your WSL environment from a unified React interface.

---

## Prerequisites

1. **Node.js**: Ensure Node.js (v18 or higher) and `npm` are installed.
2. **WSL2 Environment**: Optimized for running Ubuntu or WSL2 configurations.
3. **Docker (Optional)**: Required if you want 1-click deployments for memory systems like Chroma or Milvus.

---

## Launching the Dashboard

To run the GravityOS Dashboard locally in development mode:

1. Navigate to the dashboard directory:
   ```bash
   cd dashboard-ui
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

---

## Features Explained

### 1. Overview & Advisor Team
- View high-level metrics (active CLIs, unified skills count, memory states, budget spent).
- Interact with specialized persona advisors:
  - **Marcus (The Ideas Man)** for system brainstorming.
  - **Leo (The Architect)** for core Next.js & monorepo structure.
  - **Maya (The Designer)** for clean CSS, dark themes, and usability.
  - **Silas (The Systems Integrator)** for WSL integrations and docker bindings.

### 2. CLI Tools Management
- Checks for installed CLIs: `hermes`, `claude`, `agy`, and `codex`.
- Automatically executes update checks or 1-click installations into your WSL environment.
- Register other customized CLI system hooks using the "Extend AI Interfaces" form.

### 3. Central Skills Core
- **Gather All Skills**: Auto-scans individual folders (e.g. `~/.hermes/skills/`) and consolidates them into a central `~/.ai_skills` folder.
- **Distribute Shared Core**: Propagates central skills back to individual CLI tools so all agents benefit from the unified knowledge base.
- **Clone Remote Skills**: Form to input any GitHub repository URL containing Markdown/SKILL.md specs to clone and integrate them instantly.

### 4. Memory Systems
- Scan for vector databases like **Pinecone Client**, **Chroma DB**, or **Milvus**.
- Options to execute background installations and Docker deployments when missing.

### 5. Token Cost Management
- Visualize actual and estimated monthly spend using a responsive safety progress meter.
- Adjust monthly threshold allowances.
- Review detailed transactions showing precise token counts and net USD expenditures.
