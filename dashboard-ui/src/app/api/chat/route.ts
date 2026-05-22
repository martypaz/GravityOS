import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const execAsync = promisify(exec);
const ADVISORS_FILE = path.join(os.homedir(), '.ai_advisors.json');

const CORE_ADVISORS = [
  { id: 'marcus', name: 'Marcus (Ideas Man)', role: 'Product & Vision', specialty: 'Ideation, features scope, and centralized system concepts.' },
  { id: 'leo', name: 'Leo (The Architect)', role: 'System Architecture', specialty: 'Monorepo structures, Next.js setups, and containerized Docker files.' },
  { id: 'maya', name: 'Maya (The Designer)', role: 'UI / UX Design', specialty: 'Tailwind layouts, clean aesthetic dark-modes, and accessibility.' },
  { id: 'silas', name: 'Silas (Systems Integrator)', role: 'CLI & Infrastructure', specialty: 'WSL system scripts, background daemons, and Pinecone vector namespaces.' }
];

export async function POST(request: Request) {
  try {
    const { advisorId, message, activeProject } = await request.json();

    if (!message) {
      return NextResponse.json({ success: false, error: 'Message is required' }, { status: 400 });
    }

    // 1. Fetch advisor metadata
    let selectedAdvisor = CORE_ADVISORS.find(a => a.id === advisorId);
    if (!selectedAdvisor && fs.existsSync(ADVISORS_FILE)) {
      try {
        const custom = JSON.parse(fs.readFileSync(ADVISORS_FILE, 'utf-8'));
        selectedAdvisor = custom.find((a: any) => a.id === advisorId);
      } catch (e) {
        // Ignore JSON error
      }
    }

    const advisorName = selectedAdvisor?.name || 'GravityOS Advisor';
    const advisorRole = selectedAdvisor?.role || 'Expert Advisor';
    const advisorSpecialty = selectedAdvisor?.specialty || 'General systems consultant.';

    // 2. Build high-fidelity system prompt with user preferences
    let systemPrompt = `You are ${advisorName}, an expert ${advisorRole} advising on the project "${activeProject}".
Your specialty is: ${advisorSpecialty}.

CRITICAL ROLE-PLAY RULES:
1. Speak directly as this persona. Do NOT add meta-commentary like "As an AI..." or "Here is what I think as ${advisorName}."
2. Deliver professional, expert, and highly practical feedback.
3. Use UK English spelling (colour, customise, optimise) across all text.
4. Strictly avoid AI buzzwords: delve, robust, seamless, tapestry, testament, elevate, foster, landscape.
5. Keep your answer brief and punchy—ideally 3-5 sentences or a short bulleted list.

User Message: "${message}"`;

    // 3. Write prompt securely to a temp file to prevent bash escaping errors
    const tempPromptFile = path.join(os.tmpdir(), `agy_prompt_${Date.now()}.txt`);
    fs.writeFileSync(tempPromptFile, systemPrompt, 'utf-8');

    // 4. Execute Antigravity (agy) non-interactively using --print / --prompt
    // We run it inside the active project folder so agy can reference local AGENTS.md/code context if needed!
    const projectPath = path.join('/home/ubuntu/projects/antigravity', activeProject || 'GravityOS');
    const projectPathExists = fs.existsSync(projectPath);
    const cmdWorkdir = projectPathExists ? projectPath : '/home/ubuntu/projects/antigravity/GravityOS';

    // Command to load prompt from file and execute agy
    const agyCmd = `agy --print "$(cat ${tempPromptFile})"`;

    try {
      addLogToTmp(`Calling Antigravity (agy) for advisor: ${advisorName}`);
      const { stdout } = await execAsync(agyCmd, { cwd: cmdWorkdir, timeout: 45000 });
      
      // Cleanup temp file
      fs.unlinkSync(tempPromptFile);

      return NextResponse.json({
        success: true,
        response: stdout.trim(),
        source: 'Antigravity OAuth CLI (agy)'
      });
    } catch (execError: any) {
      // Cleanup temp file on failure
      if (fs.existsSync(tempPromptFile)) {
        fs.unlinkSync(tempPromptFile);
      }
      
      addLogToTmp(`agy failed: ${execError.message}. Falling back to simulated reply.`);
      
      // Fallback response if agy times out or fails (e.g. no internet)
      const fallbackReplies: Record<string, string> = {
        marcus: `I recommend structuring the ${activeProject} workspace with segmented local memory namespaces so our skills core stays fully organized.`,
        leo: `Architectural check complete. For ${activeProject}, keep NPM modules isolated inside the container volumes.`,
        maya: `I highly recommend using high-contrast dark green orbs for active nodes on the memory visualizer to fit our terminal-inspired visual style.`,
        silas: `Service nodes are operational. I can set up automated file triggers to sync your vector database whenever you run an agy prompt.`
      };

      const fallbackText = fallbackReplies[advisorId] || `I am ready to consult you on ${advisorRole} inside the ${activeProject} workspace. Let's make sure our terminal environment is fully configured first.`;

      return NextResponse.json({
        success: true,
        response: `${fallbackText}\n\n*(Note: Antigravity CLI timed out. Loaded simulated advisor fallback)*`,
        source: 'Simulator Fallback'
      });
    }

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

function addLogToTmp(msg: string) {
  try {
    fs.appendFileSync('/tmp/gravity-os-chat.log', `[${new Date().toISOString()}] ${msg}\n`);
  } catch (e) {}
}
