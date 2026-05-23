import { NextResponse } from 'next/server';
import { exec, execSync } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const execAsync = promisify(exec);

const CLI_DEFINITIONS = {
  hermes: {
    name: 'Hermes',
    cmd: 'hermes --version || hermes -v || which hermes',
    installCmd: 'npm install -g @nousresearch/hermes || curl -sSL https://hermes-agent.nousresearch.com/install.sh | bash',
    updateCmd: 'npm update -g @nousresearch/hermes',
    repo: 'https://github.com/NousResearch/hermes-agent'
  },
  claude: {
    name: 'Claude Code',
    cmd: 'claude --version || claude -v || which claude',
    installCmd: 'npm install -g @anthropic-ai/claude-code',
    updateCmd: 'npm update -g @anthropic-ai/claude-code',
    repo: 'https://github.com/anthropics/claude-code'
  },
  agy: {
    name: 'Antigravity (agy)',
    cmd: 'agy --version || agy -v || which agy',
    installCmd: 'npm install -g antigravity-cli || pip install antigravity-cli',
    updateCmd: 'npm update -g antigravity-cli',
    repo: 'https://github.com/nousresearch/antigravity'
  },
  codex: {
    name: 'Codex CLI',
    cmd: 'codex --version || codex -v || which codex',
    installCmd: 'npm install -g codex-cli',
    updateCmd: 'npm update -g codex-cli',
    repo: ''
  },
  openclaw: {
    name: 'OpenClaw',
    cmd: 'which openclaw || pm2 show "openclaw" || pgrep -x openclaw',
    installCmd: 'npm install -g openclaw-cli || pip install openclaw',
    updateCmd: 'npm update -g openclaw-cli',
    repo: ''
  }
};

const MEMORY_DEFINITIONS = {
  pinecone: {
    name: 'Pinecone Client',
    cmd: 'pip show pinecone-client || npm list -g @pinecone-database/pinecone',
    installCmd: 'pip install pinecone-client || npm install -g @pinecone-database/pinecone',
    type: 'python/npm',
    description: 'Cloud vector storage'
  },
  chromadb: {
    name: 'Chroma DB',
    cmd: 'pip show chromadb || docker ps --filter name=chroma -q',
    installCmd: 'pip install chromadb || docker run -d -p 8000:8000 chromadb/chroma',
    type: 'python/docker',
    description: 'Local vector store'
  },
  milvus: {
    name: 'Milvus Lite',
    cmd: 'pip show milvus || docker ps --filter name=milvus -q',
    installCmd: 'pip install milvus || docker run -d --name milvus-standalone -p 19530:19530 milvusdb/milvus:latest',
    type: 'python/docker',
    description: 'Embedded milvus vector store'
  },
  gravityos_memory: {
    name: 'GravityOS MCP Hub',
    cmd: 'ls /home/ubuntu/projects/antigravity/GravityOS/scripts/mcp-memory-server.js',
    installCmd: 'chmod +x /home/ubuntu/projects/antigravity/GravityOS/scripts/mcp-memory-server.js',
    type: 'mcp/node',
    description: 'Shared JSON-RPC stdio memory hub'
  }
};

const ACTIVE_PROJECT_PATH = '/home/ubuntu/projects/antigravity/.active_project.json';

export async function GET() {
  const clisStatus: Record<string, any> = {};
  const memoryStatus: Record<string, any> = {};

  // Check CLIs
  for (const [key, cli] of Object.entries(CLI_DEFINITIONS)) {
    try {
      const { stdout } = await execAsync(cli.cmd);
      clisStatus[key] = {
        name: cli.name,
        installed: true,
        version: stdout.trim().split('\n')[0] || 'Installed',
        repo: cli.repo
      };
    } catch (e) {
      clisStatus[key] = {
        name: cli.name,
        installed: false,
        version: 'Not Found',
        repo: cli.repo
      };
    }
  }

  // Check Memory Systems
  for (const [key, mem] of Object.entries(MEMORY_DEFINITIONS)) {
    try {
      const { stdout } = await execAsync(mem.cmd);
      memoryStatus[key] = {
        name: mem.name,
        installed: true,
        type: mem.type,
        details: stdout.trim().split('\n')[0] || 'Installed',
        description: mem.description
      };
    } catch (e) {
      memoryStatus[key] = {
        name: mem.name,
        installed: false,
        type: mem.type,
        details: 'Not Installed',
        description: mem.description
      };
    }
  }

  // Probe Client MCP Connections
  let hermesConfigured = false;
  const hermesConfigPath = path.join(os.homedir(), '.hermes/config.yaml');
  if (fs.existsSync(hermesConfigPath)) {
    try {
      const content = fs.readFileSync(hermesConfigPath, 'utf-8');
      hermesConfigured = content.includes('gravityos_memory');
    } catch (e) {}
  }

  let claudeConfigured = false;
  const claudeConfigPath = path.join(os.homedir(), '.claude.json');
  if (fs.existsSync(claudeConfigPath)) {
    try {
      const content = fs.readFileSync(claudeConfigPath, 'utf-8');
      claudeConfigured = content.includes('gravityos_memory') || content.includes('gravityos-memory');
    } catch (e) {}
  }

  let cursorConfigured = false;
  let vscodeConfigured = false;
  try {
    // Dynamically retrieve the Windows host username
    const winUserLines = execSync('cmd.exe /c "echo %USERNAME%"').toString().trim().split('\n');
    const winUser = winUserLines.length > 0 ? winUserLines[winUserLines.length - 1].trim() : '';
    if (winUser) {
      // 1. Cursor Check
      const cursorDbPath = `/mnt/c/Users/${winUser}/AppData/Roaming/Cursor/User/globalStorage/state.vscdb`;
      if (fs.existsSync(cursorDbPath)) {
        const pyCmd = `python3 -c "import sqlite3; conn = sqlite3.connect('${cursorDbPath}'); cursor = conn.cursor(); print(any('gravityos' in str(row).lower() for row in cursor.execute('SELECT * FROM ItemTable').fetchall()))"`;
        const stdout = execSync(pyCmd).toString().trim();
        cursorConfigured = stdout === 'True';
      }

      // 2. VS Code Check
      const vscodeDbPath = `/mnt/c/Users/${winUser}/AppData/Roaming/Code/User/globalStorage/state.vscdb`;
      if (fs.existsSync(vscodeDbPath)) {
        const pyCmd = `python3 -c "import sqlite3; conn = sqlite3.connect('${vscodeDbPath}'); cursor = conn.cursor(); print(any('gravityos' in str(row).lower() for row in cursor.execute('SELECT * FROM ItemTable').fetchall()))"`;
        const stdout = execSync(pyCmd).toString().trim();
        vscodeConfigured = stdout === 'True';
      }
    }
  } catch (e) {}

  // 3. Antigravity IDE connection check
  const antigravityConfigured = fs.existsSync(ACTIVE_PROJECT_PATH);

  // 4. Codex CLI connection check
  let codexConfigured = false;
  const codexConfigPath = path.join(os.homedir(), '.codex/config.toml');
  if (fs.existsSync(codexConfigPath)) {
    try {
      const content = fs.readFileSync(codexConfigPath, 'utf-8');
      codexConfigured = content.includes('gravityos-memory') || content.includes('gravityos_memory');
    } catch (e) {}
  }

  return NextResponse.json({
    clis: clisStatus,
    memory: memoryStatus,
    mcpConfigured: {
      hermes: hermesConfigured,
      claude: claudeConfigured,
      cursor: cursorConfigured,
      vscode: vscodeConfigured,
      antigravity: antigravityConfigured,
      codex: codexConfigured
    }
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, type, name } = body;

    let cmd = '';
    if (type === 'cli' && name in CLI_DEFINITIONS) {
      const cli = CLI_DEFINITIONS[name as keyof typeof CLI_DEFINITIONS];
      cmd = action === 'update' ? cli.updateCmd : cli.installCmd;
    } else if (type === 'memory' && name in MEMORY_DEFINITIONS) {
      const mem = MEMORY_DEFINITIONS[name as keyof typeof MEMORY_DEFINITIONS];
      cmd = mem.installCmd;
    } else {
      return NextResponse.json({ success: false, error: 'Invalid targets' }, { status: 400 });
    }

    // Run installation/update in background
    exec(cmd, (error, stdout, stderr) => {
      console.log(`Command Executed: ${cmd}`);
      if (error) {
        console.error(`Exec error: ${error.message}`);
        return;
      }
      console.log(`Stdout: ${stdout}`);
      console.error(`Stderr: ${stderr}`);
    });

    return NextResponse.json({ success: true, message: `Command initiated: ${cmd}` });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
