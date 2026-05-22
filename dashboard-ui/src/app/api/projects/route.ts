import { NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const ANTIGRAVITY_ROOT = '/home/ubuntu/projects/antigravity';
const CURRENT_ACTIVE_FILE = path.join(ANTIGRAVITY_ROOT, '.active_project.json');

interface ProjectMeta {
  name: string;
  path: string;
  hasAgentsMd: boolean;
  hasClaudeMd: boolean;
  hasCursorrules: boolean;
  hasHermesPlans: boolean;
  hasHermesSkills: boolean;
  agents: string[];
  skills: string[];
  languages: Record<string, number>;
}

// Simple recursive file scan to get counts of file extensions
function scanProjectFiles(dir: string, currentDepth = 0): Record<string, number> {
  const exts: Record<string, number> = {};
  if (currentDepth > 3) return exts; // Limit depth for safety and performance

  try {
    const items = fs.readdirSync(dir);
    for (const item of items) {
      if (item === 'node_modules' || item === '.git' || item === '.next' || item === 'out') continue;
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        const subExts = scanProjectFiles(fullPath, currentDepth + 1);
        for (const [ext, count] of Object.entries(subExts)) {
          exts[ext] = (exts[ext] || 0) + count;
        }
      } else if (stat.isFile()) {
        const ext = path.extname(item).toLowerCase().substring(1) || 'others';
        exts[ext] = (exts[ext] || 0) + 1;
      }
    }
  } catch (e) {
    // Ignore read errors
  }
  return exts;
}

// Parse AGENTS.md to extract agent names/roles
function parseAgents(filePath: string): string[] {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const agents: string[] = [];
    const lines = content.split('\n');
    
    // Look for lists of agents: bullet points with bold names
    const agentRegex = /^[*-]\s+\*\*([^*]+)\*\*/; 
    const headingRegex = /^#+\s+(.+Agent.+|.+Persona.+|.+Team.+)/i;

    let inAgentSection = false;
    for (const line of lines) {
      if (line.startsWith('#')) {
        const headingText = line.toLowerCase();
        inAgentSection = headingRegex.test(line) && 
                         !headingText.includes('guideline') && 
                         !headingText.includes('instruction') && 
                         !headingText.includes('rule');
      }
      
      if (inAgentSection) {
        const match = line.match(agentRegex);
        if (match) {
          const name = match[1].trim();
          if (name && name.length < 35 && !name.includes(':') && !name.includes('CRITICAL') && !name.includes('RULE')) {
            agents.push(name);
          }
        } else if (line.trim().startsWith('- ')) {
          const cleanName = line.replace('- ', '').trim().split(':')[0].trim();
          if (cleanName && cleanName.length < 35 && !cleanName.includes('#') && !cleanName.includes('CRITICAL') && !cleanName.includes('RULE')) {
            agents.push(cleanName);
          }
        }
      }
    }

    return Array.from(new Set(agents));
  } catch (e) {
    return [];
  }
}

// Scan for project-specific skills
function scanProjectSkills(projectPath: string): string[] {
  const skills: string[] = [];
  const skillDirs = [
    path.join(projectPath, '.hermes', 'skills'),
    path.join(projectPath, '.skills'),
    path.join(projectPath, 'skills')
  ];

  for (const dir of skillDirs) {
    if (fs.existsSync(dir)) {
      try {
        const files = fs.readdirSync(dir);
        for (const file of files) {
          if (file.endsWith('.md')) {
            skills.push(file.replace('.md', ''));
          } else if (fs.statSync(path.join(dir, file)).isDirectory()) {
            skills.push(file);
          }
        }
      } catch (e) {
        // Ignore errors
      }
    }
  }
  return Array.from(new Set(skills));
}

function getActiveProjectName(): string {
  if (fs.existsSync(CURRENT_ACTIVE_FILE)) {
    try {
      const data = fs.readFileSync(CURRENT_ACTIVE_FILE, 'utf-8');
      return JSON.parse(data).activeProject || 'GravityOS';
    } catch (e) {
      return 'GravityOS';
    }
  }
  return 'GravityOS';
}

export async function GET() {
  try {
    if (!fs.existsSync(ANTIGRAVITY_ROOT)) {
      return NextResponse.json({ success: false, error: 'Antigravity root directory not found' }, { status: 404 });
    }

    const activeProject = getActiveProjectName();
    const directories = fs.readdirSync(ANTIGRAVITY_ROOT);
    const projects: ProjectMeta[] = [];

    for (const dir of directories) {
      const fullPath = path.join(ANTIGRAVITY_ROOT, dir);
      if (!fs.existsSync(fullPath)) continue;
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory() && !dir.startsWith('.')) {
        const hasAgentsMd = fs.existsSync(path.join(fullPath, 'AGENTS.md'));
        const hasClaudeMd = fs.existsSync(path.join(fullPath, 'CLAUDE.md'));
        const hasCursorrules = fs.existsSync(path.join(fullPath, '.cursorrules'));
        
        // Hermes specific checks
        const hasHermesPlans = fs.existsSync(path.join(fullPath, '.hermes', 'plans'));
        const hasHermesSkills = fs.existsSync(path.join(fullPath, '.hermes', 'skills'));

        const agents = hasAgentsMd ? parseAgents(path.join(fullPath, 'AGENTS.md')) : [];
        const skills = scanProjectSkills(fullPath);
        const languages = scanProjectFiles(fullPath);

        projects.push({
          name: dir,
          path: fullPath,
          hasAgentsMd,
          hasClaudeMd,
          hasCursorrules,
          hasHermesPlans,
          hasHermesSkills,
          agents,
          skills,
          languages
        });
      }
    }

    return NextResponse.json({ 
      success: true, 
      activeProject,
      projects 
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { activeProject, action } = await request.json();
    if (!activeProject) {
      return NextResponse.json({ success: false, error: 'No active project specified' }, { status: 400 });
    }

    const fullPath = path.join(ANTIGRAVITY_ROOT, activeProject);
    if (!fs.existsSync(fullPath) || !fs.statSync(fullPath).isDirectory()) {
      return NextResponse.json({ success: false, error: `Project folder ${activeProject} does not exist` }, { status: 400 });
    }

    // Handle standard target selection lock
    if (!action) {
      fs.writeFileSync(CURRENT_ACTIVE_FILE, JSON.stringify({ activeProject }, null, 2));
      return NextResponse.json({ success: true, activeProject });
    }

    // Handle Hermes Auto-Bootstrap feature
    if (action === 'bootstrap') {
      const hermesDir = path.join(fullPath, '.hermes');
      const plansDir = path.join(hermesDir, 'plans');
      const skillsDir = path.join(hermesDir, 'skills');

      // 1. Create directories
      if (!fs.existsSync(hermesDir)) fs.mkdirSync(hermesDir, { recursive: true });
      if (!fs.existsSync(plansDir)) fs.mkdirSync(plansDir, { recursive: true });

      // 1b. Intelligently Symlink local skills to global central skills repo (~/.ai_skills)
      const centralSkillsDir = path.join(os.homedir(), '.ai_skills');
      if (!fs.existsSync(centralSkillsDir)) {
        fs.mkdirSync(centralSkillsDir, { recursive: true });
      }

      if (fs.existsSync(skillsDir)) {
        const lstat = fs.lstatSync(skillsDir);
        if (!lstat.isSymbolicLink()) {
          // It's a real folder! Let's harvest its custom skills to the central repo first
          try {
            const files = fs.readdirSync(skillsDir);
            for (const file of files) {
              const srcFile = path.join(skillsDir, file);
              const destFile = path.join(centralSkillsDir, file);
              if (!fs.existsSync(destFile)) {
                fs.copyFileSync(srcFile, destFile);
              }
            }
            // Remove the folder so we can replace it with a clean symlink
            fs.rmSync(skillsDir, { recursive: true, force: true });
          } catch (e) {
            // Ignore block issues
          }
        }
      }

      // Re-link the local folder as a symlink to the central core repository
      if (!fs.existsSync(skillsDir)) {
        try {
          fs.symlinkSync(centralSkillsDir, skillsDir, 'dir');
        } catch (symError) {
          // Fallback if symlinks are restricted, just use regular directory
          fs.mkdirSync(skillsDir, { recursive: true });
        }
      }

      // 2. Generate custom AGENTS.md if missing
      const agentsMdPath = path.join(fullPath, 'AGENTS.md');
      if (!fs.existsSync(agentsMdPath)) {
        const customAgentsContent = `# AI Agent Guidelines

This file contains critical project-specific instructions and architecture rules for AI agents touching this codebase.

## Version Control & Source Management

**CRITICAL RULE: DO NOT AUTO-COMMIT CODE TO GIT.**
1. **Never** run \`git commit\` or \`git push\` without explicit instruction from the user.
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
`;
        fs.writeFileSync(agentsMdPath, customAgentsContent, 'utf-8');
      }

      // 3. Generate .cursorrules if missing
      const cursorRulesPath = path.join(fullPath, '.cursorrules');
      if (!fs.existsSync(cursorRulesPath)) {
        const cursorRulesContent = `{
  "instruction": "Please read AGENTS.md at the project root for strict guidelines before writing any code. Always use absolute paths for file system queries. Ensure UK spelling standards are met."
}
`;
        fs.writeFileSync(cursorRulesPath, cursorRulesContent, 'utf-8');
      }

      return NextResponse.json({ success: true, message: `Successfully bootstrapped Hermes configuration inside ${activeProject}!` });
    }

    return NextResponse.json({ success: false, error: 'Invalid action specified' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
