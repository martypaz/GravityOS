import { NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const MEMORIES_FILE = path.join(os.homedir(), '.ai_memories.json');
const ANTIGRAVITY_ROOT = '/home/ubuntu/projects/antigravity';

interface MemoryDocument {
  id: string;
  category: string;
  title: string;
  content: string;
  timestamp: string;
  tokens: number;
  x: number; // 2D t-SNE Compression X Coordinate
  y: number; // 2D t-SNE Compression Y Coordinate
}

// Automatically compile and write vector memories to .hermes/memories.md inside the active project folder
function syncMemoriesToProjectFile(namespace: string, docs: MemoryDocument[]) {
  try {
    const projectPath = path.join(ANTIGRAVITY_ROOT, namespace);
    if (!fs.existsSync(projectPath)) return;

    const hermesDir = path.join(projectPath, '.hermes');
    if (!fs.existsSync(hermesDir)) {
      fs.mkdirSync(hermesDir, { recursive: true });
    }

    const memoriesMdPath = path.join(hermesDir, 'memories.md');
    
    let mdContent = `# GravityOS: Vector Memories Namespace (${namespace})\n\n`;
    mdContent += `This file contains local vector embeddings and semantic context memories synchronized from GravityOS.\n`;
    mdContent += `Do NOT modify this file manually—it is automatically updated by the GravityOS Memory Daemon.\n\n`;

    if (docs.length === 0) {
      mdContent += `*No memories indexed for this namespace yet.*\n`;
    } else {
      docs.forEach((doc) => {
        mdContent += `## [${doc.category}] ${doc.title}\n`;
        mdContent += `- **Timestamp**: ${doc.timestamp}\n`;
        mdContent += `- **Token Size**: ${doc.tokens} Tokens\n`;
        mdContent += `- **Semantic Coordinates**: X: ${doc.x}, Y: ${doc.y}\n\n`;
        mdContent += `\`\`\`text\n${doc.content}\n\`\`\`\n\n`;
        mdContent += `---\n\n`;
      });
    }

    fs.writeFileSync(memoriesMdPath, mdContent, 'utf-8');
  } catch (e) {
    // Ignore write issues
  }
}

const DEFAULT_MEMORIES: Record<string, MemoryDocument[]> = {
  'wicked_prints': [
    {
      id: 'wp-mem-1',
      category: 'Supplier Specs',
      title: 'Printify Shipping & Margin Rules',
      content: 'Standard apparel shipping calculated at $4.50 flat rate. Express delivery mapped at $8.50. Target retail markup coefficient set to 1.35x (35% margin) across both Printify and Printful catalog items.',
      timestamp: '2026-05-20 14:22:15',
      tokens: 45,
      x: 35,
      y: 60
    },
    {
      id: 'wp-mem-2',
      category: 'SEO Copywriting',
      title: 'Anti-AI Content Guidelines & Spacing',
      content: 'SEO page generation must use UK spellings (colour, customise, optimise). Sentences must have highly variable lengths (burstiness). Blacklist AI-isms: delve, robust, seamless, tapestry, testament.',
      timestamp: '2026-05-19 11:05:42',
      tokens: 38,
      x: 65,
      y: -25
    },
    {
      id: 'wp-mem-3',
      category: 'Product Assets',
      title: 'Local Rembg CUDA Scaling',
      content: 'Utilize GTX 1080 Ti CUDA execution for rembg background extraction. Output images saved as high-contrast transparent PNGs under client/public/assets/products.',
      timestamp: '2026-05-18 09:30:11',
      tokens: 32,
      x: -45,
      y: 40
    }
  ],
  'hosting': [
    {
      id: 'host-mem-1',
      category: 'Infrastructure',
      title: 'Cloudflare SaaS Custom Hostnames',
      content: 'All customer domains MUST route through Cloudflare Custom Hostnames. Point DNS records to Cloudflare Anycast IP, not raw Hetzner VPS IP. Fallback origin set to fallback.siteswift.app.',
      timestamp: '2026-05-15 16:45:10',
      tokens: 52,
      x: -15,
      y: -55
    },
    {
      id: 'host-mem-2',
      category: 'DevOps',
      title: 'PM2 VPS Daemon Monitoring',
      content: 'Nginx reverses proxies on VPS port 80/443. Core Node.js backend processes managed under PM2 process ID: gravity-server. Server cluster scales natively to 3 instances.',
      timestamp: '2026-05-14 10:12:05',
      tokens: 42,
      x: -65,
      y: -15
    }
  ],
  'business-domains': [
    {
      id: 'dom-mem-1',
      category: 'Pricing Strategy',
      title: 'Top-Level Domain (TLD) Margin Matrices',
      content: 'Domain registrations synced with eNom/OpenSRS. Co.uk domains purchased at £6.50, sold at £12.99. Com domains purchased at $10.50, sold at $18.99. Automated DNS zoning active.',
      timestamp: '2026-05-11 15:20:12',
      tokens: 48,
      x: 50,
      y: 20
    }
  ],
  'GravityOS': [
    {
      id: 'os-mem-1',
      category: 'System Core',
      title: 'Unified Skills Directory Mapping',
      content: 'Workspace skill directories symlinked globally from ~/.ai_skills directly into each active project folder (.hermes/skills). Distributing central core makes skills instantly available everywhere.',
      timestamp: '2026-05-21 16:30:00',
      tokens: 41,
      x: -10,
      y: 35
    },
    {
      id: 'os-mem-2',
      category: 'Hardware Specs',
      title: 'WSL2 GTX 1080 Ti GPU Allocation',
      content: 'NVIDIA WSL2 kernel driver maps local GTX 1080 Ti (11GB VRAM) for CUDA acceleration. Local embedding models (Chroma DB local instances) run with direct GPU access.',
      timestamp: '2026-05-21 15:45:12',
      tokens: 39,
      x: -40,
      y: 65
    }
  ]
};

function getMemories(namespace: string): MemoryDocument[] {
  let memories: Record<string, MemoryDocument[]> = DEFAULT_MEMORIES;

  if (!fs.existsSync(MEMORIES_FILE)) {
    fs.writeFileSync(MEMORIES_FILE, JSON.stringify(DEFAULT_MEMORIES, null, 2));
  } else {
    try {
      memories = JSON.parse(fs.readFileSync(MEMORIES_FILE, 'utf-8'));
    } catch (e) {
      memories = DEFAULT_MEMORIES;
    }
  }

  return memories[namespace] || [];
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const all = searchParams.get('all') === 'true';

    if (all) {
      let memories = DEFAULT_MEMORIES;
      if (fs.existsSync(MEMORIES_FILE)) {
        try {
          memories = JSON.parse(fs.readFileSync(MEMORIES_FILE, 'utf-8'));
        } catch (e) {}
      }
      return NextResponse.json({ success: true, memories });
    }

    const namespace = searchParams.get('namespace') || 'GravityOS';
    const query = searchParams.get('query');

    let chromaActive = false;
    let chromaCollections: string[] = [];

    try {
      const chromaRes = await fetch('http://localhost:8000/api/v1/collections', { signal: AbortSignal.timeout(1000) });
      if (chromaRes.ok) {
        chromaActive = true;
        const data = await chromaRes.json();
        chromaCollections = data.map((col: any) => col.name);
      }
    } catch (e) {
      // Chroma DB offline
    }

    let docs = getMemories(namespace);

    // Sync memories to .hermes/memories.md inside the active project folder
    syncMemoriesToProjectFile(namespace, docs);

    if (query) {
      const lowerQuery = query.toLowerCase();
      docs = docs.filter(doc => 
        doc.title.toLowerCase().includes(lowerQuery) || 
        doc.content.toLowerCase().includes(lowerQuery) ||
        doc.category.toLowerCase().includes(lowerQuery)
      );
    }

    return NextResponse.json({
      success: true,
      chromaActive,
      chromaCollections,
      namespace,
      memories: docs
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { namespace, category, title, content } = body;

    if (!namespace || !category || !title || !content) {
      return NextResponse.json({ success: false, error: 'Missing required parameters' }, { status: 400 });
    }

    let memories: Record<string, MemoryDocument[]> = DEFAULT_MEMORIES;
    if (fs.existsSync(MEMORIES_FILE)) {
      try {
        memories = JSON.parse(fs.readFileSync(MEMORIES_FILE, 'utf-8'));
      } catch (e) {
        memories = DEFAULT_MEMORIES;
      }
    }

    if (!memories[namespace]) {
      memories[namespace] = [];
    }

    // Generate random -80 to 80 coordinate for spatial simulation
    const randCoord = () => Math.round((Math.random() * 140 - 70));

    const newDoc: MemoryDocument = {
      id: `mem-${Date.now()}`,
      category,
      title,
      content,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      tokens: Math.round(content.split(' ').length * 1.3),
      x: randCoord(),
      y: randCoord()
    };

    memories[namespace].unshift(newDoc);
    fs.writeFileSync(MEMORIES_FILE, JSON.stringify(memories, null, 2));

    // Sync memories to .hermes/memories.md inside the active project folder
    syncMemoriesToProjectFile(namespace, memories[namespace]);

    return NextResponse.json({ success: true, memory: newDoc, memories: memories[namespace] });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
