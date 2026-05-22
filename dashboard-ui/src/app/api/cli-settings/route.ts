import { NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as yaml from 'yaml';

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

    return NextResponse.json({
      success: true,
      hermes,
      projects,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
