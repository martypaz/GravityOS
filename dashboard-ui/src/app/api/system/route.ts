import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

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
    installCmd: 'npm install -g antigravity-cli || pip install antigravity-cli', // Placeholder install
    updateCmd: 'npm update -g antigravity-cli',
    repo: 'https://github.com/nousresearch/antigravity'
  },
  codex: {
    name: 'Codex CLI',
    cmd: 'codex --version || codex -v || which codex',
    installCmd: 'npm install -g codex-cli',
    updateCmd: 'npm update -g codex-cli',
    repo: ''
  }
};

const MEMORY_DEFINITIONS = {
  pinecone: {
    name: 'Pinecone Client',
    cmd: 'pip show pinecone-client || npm list -g @pinecone-database/pinecone',
    installCmd: 'pip install pinecone-client || npm install -g @pinecone-database/pinecone',
    type: 'python/npm'
  },
  chromadb: {
    name: 'Chroma DB',
    cmd: 'pip show chromadb || docker ps --filter name=chroma -q',
    installCmd: 'pip install chromadb || docker run -d -p 8000:8000 chromadb/chroma',
    type: 'python/docker'
  },
  milvus: {
    name: 'Milvus Lite',
    cmd: 'pip show milvus || docker ps --filter name=milvus -q',
    installCmd: 'pip install milvus || docker run -d --name milvus-standalone -p 19530:19530 milvusdb/milvus:latest',
    type: 'python/docker'
  }
};

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
        details: stdout.trim().split('\n')[0] || 'Installed'
      };
    } catch (e) {
      memoryStatus[key] = {
        name: mem.name,
        installed: false,
        type: mem.type,
        details: 'Not Installed'
      };
    }
  }

  return NextResponse.json({ clis: clisStatus, memory: memoryStatus });
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
