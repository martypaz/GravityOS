import { NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as yaml from 'yaml';
import { exec } from 'child_process';

const ANTGRAVITY_ROOT = '/home/ubuntu/projects/antigravity';
const HERMES_CONFIG = path.join(os.homedir(), '.hermes', 'config.yaml');

interface HermesSettings {
  model: string;
  provider: string;
  personality: string;
  maxTurns: number;
  terminalBackend: string;
  toolsets: string[];
  memoryEnabled: boolean;
  compressionEnabled: boolean;
  delegation: { maxConcurrent: number; maxDepth: number };
  approvals: string;
  secretRedaction: boolean;
  sttProvider: string;
  ttsProvider: string;
  messagingPlatforms: string[];
  reasoning: string;
}

interface ProjectScripts {
  project: string;
  path: string;
  scripts: Record<string, string>;
  engine?: string;
  dependencies?: string[];
}

// Define types for the YAML config
interface HermesConfig {
  model?: { default?: string; provider?: string };
  display?: { personality?: string };
  agent?: { max_turns?: number };
  terminal?: { backend?: string };
  platform_toolsets?: { cli?: string[] };
  memory?: { memory_enabled?: boolean };
  compression?: { enabled?: boolean };
  delegation?: { max_concurrent_children?: number; max_spawn_depth?: number };
  approvals?: { mode?: string };
  security?: { redact_secrets?: boolean };
  stt?: { provider?: string };
  tts?: { provider?: string };
  telegram?: Record<string, unknown>;
  discord?: Record<string, unknown>;
  agent_new?: { reasoning_effort?: string };
}

interface GoogleOAuthData {
  email?: string;
  project_id?: string;
  is_connected: boolean;
}

function parseHermesConfig(): HermesSettings {
  try {
    const raw = fs.readFileSync(HERMES_CONFIG, 'utf-8');
    const config: HermesConfig = yaml.parse(raw);

    const platforms: string[] = [];
    if (config.telegram && Object.keys(config.telegram).length > 0) platforms.push('Telegram');
    if (config.discord && Object.keys(config.discord).length > 0) platforms.push('Discord');

    return {
      model: config.model?.default || 'unknown',
      provider: config.model?.provider || 'unknown',
      personality: config.display?.personality || 'helpful',
      maxTurns: config.agent?.max_turns || 90,
      terminalBackend: config.terminal?.backend || 'local',
      toolsets: config.platform_toolsets?.cli || [],
      memoryEnabled: config.memory?.memory_enabled ?? true,
      compressionEnabled: config.compression?.enabled ?? true,
      delegation: {
        maxConcurrent: config.delegation?.max_concurrent_children || 3,
        maxDepth: config.delegation?.max_spawn_depth || 1,
      },
      approvals: config.approvals?.mode || 'manual',
      secretRedaction: config.security?.redact_secrets ?? true,
      sttProvider: config.stt?.provider || 'local',
      ttsProvider: config.tts?.provider || 'edge',
      messagingPlatforms: platforms,
      reasoning: config.agent_new?.reasoning_effort || 'medium',
    };
  } catch (e: any) {
    return {
      model: 'error',
      provider: 'error',
      personality: 'unknown',
      maxTurns: 0,
      terminalBackend: 'unknown',
      toolsets: [],
      memoryEnabled: false,
      compressionEnabled: false,
      delegation: { maxConcurrent: 0, maxDepth: 0 },
      approvals: 'unknown',
      secretRedaction: false,
      sttProvider: 'unknown',
      ttsProvider: 'unknown',
      messagingPlatforms: [],
      reasoning: 'unknown',
    };
  }
}

function parseGoogleOAuth(): GoogleOAuthData {
  const oauthPath = path.join(os.homedir(), '.hermes', 'auth', 'google_oauth.json');
  const envPath = path.join(os.homedir(), '.hermes', '.env');
  
  let email = '';
  let project_id = '';
  let is_connected = false;

  // 1. Try reading from google_oauth.json first
  if (fs.existsSync(oauthPath)) {
    try {
      const raw = fs.readFileSync(oauthPath, 'utf-8');
      const data = JSON.parse(raw);
      email = data.email || '';
      
      const refreshPacked = data.refresh || '';
      const parts = refreshPacked.split('|');
      project_id = parts[1] || '';
      is_connected = !!data.access && !!parts[0];
    } catch (e) {
      // Ignored
    }
  }

  // 2. Try reading HERMES_GEMINI_PROJECT_ID from .env if project_id is not already resolved
  if (!project_id && fs.existsSync(envPath)) {
    try {
      const envContent = fs.readFileSync(envPath, 'utf-8');
      const match = envContent.match(/^\s*HERMES_GEMINI_PROJECT_ID\s*=\s*(.+)$/m);
      if (match) {
        project_id = match[1].trim();
      }
    } catch (e) {
      // Ignored
    }
  }

  return { email, project_id, is_connected };
}

function updateEnvFile(projectId: string) {
  const envPath = path.join(os.homedir(), '.hermes', '.env');
  let content = '';
  if (fs.existsSync(envPath)) {
    content = fs.readFileSync(envPath, 'utf-8');
  }
  
  const lines = content.split('\n');
  let found = false;
  const newLines = lines.map(line => {
    if (/^#?\s*HERMES_GEMINI_PROJECT_ID\s*=/.test(line)) {
      found = true;
      return `HERMES_GEMINI_PROJECT_ID=${projectId}`;
    }
    return line;
  });
  
  if (!found) {
    newLines.push(`HERMES_GEMINI_PROJECT_ID=${projectId}`);
  }
  
  fs.writeFileSync(envPath, newLines.join('\n'));
}

function updateGoogleOAuthProject(projectId: string) {
  const filePath = path.join(os.homedir(), '.hermes', 'auth', 'google_oauth.json');
  if (!fs.existsSync(filePath)) {
    return;
  }
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(raw);
    const refreshPacked = data.refresh || '';
    const parts = refreshPacked.split('|');
    const refreshToken = parts[0] || '';
    const managed_project_id = parts[2] || '';
    data.refresh = `${refreshToken}|${projectId}|${managed_project_id}`;
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', { mode: 0o600 });
  } catch (e) {
    console.error('Error customising google_oauth.json project ID:', e);
  }
}

// Helper to run python script via temporary file
async function runPythonScript(script: string, stdinData?: any): Promise<any> {
  const tempDir = path.join(ANTGRAVITY_ROOT, 'GravityOS', '.temp_auth');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  const tempFile = path.join(tempDir, `oauth_${Date.now()}_${Math.random().toString(36).substring(7)}.py`);
  fs.writeFileSync(tempFile, script);
  
  const pythonPath = '/usr/local/lib/hermes-agent/venv/bin/python';
  return new Promise((resolve, reject) => {
    const child = exec(`"${pythonPath}" "${tempFile}"`);
    let stdout = '';
    let stderr = '';
    
    child.stdout?.on('data', (data) => { stdout += data; });
    child.stderr?.on('data', (data) => { stderr += data; });
    
    child.on('close', (code) => {
      try {
        fs.unlinkSync(tempFile);
      } catch (e) {
        // Ignored
      }
      
      if (code === 0) {
        try {
          resolve(JSON.parse(stdout));
        } catch (e) {
          reject(new Error(`Failed to parse Python stdout: ${stdout}`));
        }
      } else {
        reject(new Error(`Python script failed with code ${code}: ${stderr}`));
      }
    });
    
    if (stdinData !== undefined) {
      child.stdin?.write(JSON.stringify(stdinData));
    }
    child.stdin?.end();
  });
}

function scanProjectScripts(): ProjectScripts[] {
  const projects: ProjectScripts[] = [];

  // Known project directories in the monorepo
  const knownProjects: Array<{ dir: string; name: string }> = [
    { dir: 'GravityOS/dashboard-ui', name: 'GravityOS Dashboard' },
    { dir: 'hosting', name: 'SiteSwift Hosting' },
    { dir: 'boring_tools', name: 'Boring Tools' },
    { dir: 'business-domains', name: 'Business Domains' },
    { dir: 'wicked_prints/backend', name: 'Wicked Prints (Backend)' },
    { dir: 'wicked_prints/frontend', name: 'Wicked Prints (Frontend)' },
    { dir: 'feedback', name: 'Feedback Manager' },
  ];

  for (const { dir, name } of knownProjects) {
    const pkgPath = path.join(ANTGRAVITY_ROOT, dir, 'package.json');
    if (!fs.existsSync(pkgPath)) continue;

    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      const scripts: Record<string, string> = {};
      if (pkg.scripts) {
        for (const [key, cmd] of Object.entries(pkg.scripts)) {
          scripts[key] = cmd as string;
        }
      }

      const deps: string[] = [];
      if (pkg.dependencies) deps.push(...Object.keys(pkg.dependencies));
      if (pkg.devDependencies) deps.push(...Object.keys(pkg.devDependencies));

      projects.push({
        project: name,
        path: path.join(ANTGRAVITY_ROOT, dir),
        scripts,
        engine: pkg.engines?.node,
        dependencies: deps.slice(0, 10), // limit for display
      });
    } catch (e) {
      // skip unparseable package.json
    }
  }

  return projects;
}

export async function GET() {
  try {
    const hermes = parseHermesConfig();
    const projects = scanProjectScripts();
    const oauth = parseGoogleOAuth();

    return NextResponse.json({
      success: true,
      hermes,
      projects,
      oauth,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, ...params } = body;

    if (action === 'generate-auth-url') {
      const script = `
import sys
sys.path.append('/usr/local/lib/hermes-agent')
from agent import google_oauth
import json
import urllib.parse
import secrets

try:
    client_id = google_oauth._require_client_id()
    verifier, challenge = google_oauth._generate_pkce_pair()
    state = secrets.token_urlsafe(16)
    redirect_uri = f"http://{google_oauth.REDIRECT_HOST}:{google_oauth.DEFAULT_REDIRECT_PORT}{google_oauth.CALLBACK_PATH}"

    params = {
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": google_oauth.OAUTH_SCOPES,
        "state": state,
        "code_challenge": challenge,
        "code_challenge_method": "S256",
        "access_type": "offline",
        "prompt": "consent",
    }
    auth_url = google_oauth.AUTH_ENDPOINT + "?" + urllib.parse.urlencode(params) + "#hermes"
    print(json.dumps({
        "success": True,
        "auth_url": auth_url,
        "verifier": verifier,
        "state": state,
        "redirect_uri": redirect_uri
    }))
except Exception as e:
    print(json.dumps({
        "success": False,
        "error": str(e)
    }))
`;
      const result = await runPythonScript(script);
      return NextResponse.json(result);
    }

    if (action === 'exchange-code') {
      const { code, verifier, state } = params;
      const script = `
import sys
sys.path.append('/usr/local/lib/hermes-agent')
from agent import google_oauth
import json
import urllib.parse

try:
    data = json.load(sys.stdin)
    code = data.get('code', '').strip()
    verifier = data.get('verifier', '').strip()
    state = data.get('state', '').strip()

    if code.startswith("http://") or code.startswith("https://"):
        parsed = urllib.parse.urlparse(code)
        params = urllib.parse.parse_qs(parsed.query)
        code = (params.get("code") or [""])[0]
    elif code.startswith("?"):
        params = urllib.parse.parse_qs(code[1:])
        code = (params.get("code") or [""])[0]

    redirect_uri = f"http://{google_oauth.REDIRECT_HOST}:{google_oauth.DEFAULT_REDIRECT_PORT}{google_oauth.CALLBACK_PATH}"

    token_resp = google_oauth.exchange_code(
        code, verifier, redirect_uri,
        client_id=google_oauth._require_client_id(),
        client_secret=google_oauth._get_client_secret(),
    )
    creds = google_oauth._persist_token_response(token_resp, project_id="")
    print(json.dumps({
        "success": True,
        "email": creds.email,
        "project_id": creds.project_id
    }))
except Exception as e:
    print(json.dumps({
        "success": False,
        "error": str(e)
    }))
`;
      const result = await runPythonScript(script, { code, verifier, state });
      return NextResponse.json(result);
    }

    if (action === 'update-project') {
      const { project_id } = params;
      
      // Update google_oauth.json if it exists
      updateGoogleOAuthProject(project_id);
      
      // Update .env file
      updateEnvFile(project_id);
      
      return NextResponse.json({ success: true });
    }

    if (action === 'disconnect') {
      const script = `
import sys
sys.path.append('/usr/local/lib/hermes-agent')
from agent import google_oauth
import json

try:
    google_oauth.clear_credentials()
    print(json.dumps({"success": True}))
except Exception as e:
    print(json.dumps({"success": False, "error": str(e)}))
`;
      const result = await runPythonScript(script);
      return NextResponse.json(result);
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
