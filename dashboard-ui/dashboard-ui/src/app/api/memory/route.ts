import { NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const MEMORIES_FILE = path.join(os.homedir(), '.ai_memories.json');

interface MemoryDocument {
  id: string;
  category: string;
  title: string;
  content: string;
  timestamp: string;
  tokens: number;
}

const DEFAULT_MEMORIES: Record<string, MemoryDocument[]> = {
  'wicked_prints': [
    {
      id: 'wp-mem-1',
      category: 'Supplier Specs',
      title: 'Printify Shipping & Margin Rules',
      content: 'Standard apparel shipping calculated at $4.50 flat rate. Express delivery mapped at $8.50. Target retail markup coefficient set to 1.35x (35% margin) across both Printify and Printful catalog items.',
      timestamp: '2026-05-20 14:22:15',
      tokens: 45
    },
    {
      id: 'wp-mem-2',
      category: 'SEO Copywriting',
      title: 'Anti-AI Content Guidelines & Spacing',
      content: 'SEO page generation must use UK spellings (colour, customise, optimise). Sentences must have highly variable lengths (burstiness). Blacklist AI-isms: delve, robust, seamless, tapestry, testament.',
      timestamp: '2026-05-19 11:05:42',
      tokens: 38
    },
    {
      id: 'wp-mem-3',
      category: 'Product Assets',
      title: 'Local Rembg CUDA Scaling',
      content: 'Utilize GTX 1080 Ti CUDA execution for rembg background extraction. Output images saved as high-contrast transparent PNGs under client/public/assets/products.',
      timestamp: '2026-05-18 09:30:11',
      tokens: 32
    }
  ],
  'hosting': [
    {
      id: 'host-mem-1',
      category: 'Infrastructure',
      title: 'Cloudflare SaaS Custom Hostnames',
      content: 'All customer domains MUST route through Cloudflare Custom Hostnames. Point DNS records to Cloudflare Anycast IP, not raw Hetzner VPS IP. Fallback origin set to fallback.siteswift.app.',
      timestamp: '2026-05-15 16:45:10',
      tokens: 52
    },
    {
      id: 'host-mem-2',
      category: 'DevOps',
      title: 'PM2 VPS Daemon Monitoring',
      content: 'Nginx reverses proxies on VPS port 80/443. Core Node.js backend processes managed under PM2 process ID: gravity-server. Server cluster scales natively to 3 instances.',
      timestamp: '2026-05-14 10:12:05',
      tokens: 42
    }
  ],
  'business-domains': [
    {
      id: 'dom-mem-1',
      category: 'Pricing Strategy',
      title: 'Top-Level Domain (TLD) Margin Matrices',
      content: 'Domain registrations synced with eNom/OpenSRS. Co.uk domains purchased at £6.50, sold at £12.99. Com domains purchased at $10.50, sold at $18.99. Automated DNS zoning active.',
      timestamp: '2026-05-11 15:20:12',
      tokens: 48
    }
  ],
  'GravityOS': [
    {
      id: 'os-mem-1',
      category: 'System Core',
      title: 'Unified Skills Directory Mapping',
      content: 'Workspace skill directories symlinked globally from ~/.ai_skills directly into each active project folder (.hermes/skills). Distributing central core makes skills instantly available everywhere.',
      timestamp: '2026-05-21 16:30:00',
      tokens: 41
    },
    {
      id: 'os-mem-2',
      category: 'Hardware Specs',
      title: 'WSL2 GTX 1080 Ti GPU Allocation',
      content: 'NVIDIA WSL2 kernel driver maps local GTX 1080 Ti (11GB VRAM) for CUDA acceleration. Local embedding models (Chroma DB local instances) run with direct GPU access.',
      timestamp: '2026-05-21 15:45:12',
      tokens: 39
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
    const namespace = searchParams.get('namespace') || 'GravityOS';
    const query = searchParams.get('query');

    // 1. Check if Chroma DB is active on port 8000
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
      // Chroma DB offline or not listening
    }

    // 2. Fetch local persistent memories
    let docs = getMemories(namespace);

    // 3. Filter by search query if provided
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

    const newDoc: MemoryDocument = {
      id: `mem-${Date.now()}`,
      category,
      title,
      content,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      tokens: Math.round(content.split(' ').length * 1.3) // Safe approximation of tokens
    };

    memories[namespace].unshift(newDoc);
    fs.writeFileSync(MEMORIES_FILE, JSON.stringify(memories, null, 2));

    // Optional: Write to local Chroma DB container if active
    try {
      await fetch(`http://localhost:8000/api/v1/collections/${namespace}/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documents: [content],
          metadatas: [{ category, title, timestamp: newDoc.timestamp }],
          ids: [newDoc.id]
        }),
        signal: AbortSignal.timeout(1000)
      });
    } catch (e) {
      // Ignore background write errors if Chroma is offline
    }

    return NextResponse.json({ success: true, memory: newDoc, memories: memories[namespace] });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
