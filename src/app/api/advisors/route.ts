import { NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const ADVISORS_FILE = path.join(os.homedir(), '.ai_advisors.json');
const ACTIVE_PROJECT_PATH = '/home/ubuntu/projects/antigravity/.active_project.json';

interface Advisor {
  id: string;
  name: string;
  role: string;
  specialty: string;
  initialMessage: string;
  type: 'core' | 'custom';
  avatarInitials: string;
  avatarColor: string; // Tailwind class coloring or hex
  projectId?: string;  // Project restriction (optional)
}

const CORE_ADVISORS: Advisor[] = [
  {
    id: 'marcus',
    name: 'Marcus (Ideas Man)',
    role: 'Product & Vision',
    specialty: 'Ideation, features scope, and centralized system concepts.',
    initialMessage: 'Welcome to GravityOS! How can we optimize your WSL AI workflows today?',
    type: 'core',
    avatarInitials: 'M',
    avatarColor: 'bg-emerald-600/20 text-emerald-400 border-emerald-500/20'
  },
  {
    id: 'leo',
    name: 'Leo (The Architect)',
    role: 'System Architecture',
    specialty: 'Monorepo structures, Next.js setups, and containerized Docker files.',
    initialMessage: 'Core systems ready. Let’s make sure your configurations are modular and performant.',
    type: 'core',
    avatarInitials: 'L',
    avatarColor: 'bg-indigo-600/20 text-indigo-400 border-indigo-500/20'
  },
  {
    id: 'maya',
    name: 'Maya (The Designer)',
    role: 'UI / UX Design',
    specialty: 'Tailwind layouts, clean aesthetic dark-modes, and accessibility.',
    initialMessage: 'Hello! Ready to refine the interface and keep interactions smooth.',
    type: 'core',
    avatarInitials: 'Y',
    avatarColor: 'bg-pink-600/20 text-pink-400 border-pink-500/20'
  },
  {
    id: 'silas',
    name: 'Silas (Systems Integrator)',
    role: 'CLI & Infrastructure',
    specialty: 'WSL system scripts, background daemons, and Pinecone vector namespaces.',
    initialMessage: 'Bridges mapped and active. Let me know if you need any automated bash hooks.',
    type: 'core',
    avatarInitials: 'S',
    avatarColor: 'bg-amber-600/20 text-amber-400 border-amber-500/20'
  },
  {
    id: 'xavier',
    name: 'Xavier (The SEO Expert)',
    role: 'SEO & Copywriting',
    specialty: 'Keywords optimisation, humanised product descriptions, and metadata generation.',
    initialMessage: 'SEO engines aligned. Let’s make sure your product lines rank high and sell fast.',
    type: 'core',
    avatarInitials: 'X',
    avatarColor: 'bg-cyan-600/20 text-cyan-400 border-cyan-500/20'
  }
];

const DEFAULT_CUSTOM_ADVISORS: Advisor[] = [
  {
    id: 'oliver',
    name: 'Oliver (POD Expert)',
    role: 'Print on Demand Advisor',
    specialty: 'Printful & Printify specs, trend scoping, and supplier margins.',
    initialMessage: 'Hey! Ready to optimize print files, calculate margins, and automate product syncs.',
    type: 'custom',
    avatarInitials: 'O',
    avatarColor: 'bg-teal-600/20 text-teal-400 border-teal-500/20',
    projectId: 'wicked-prints-2'
  }
];

function getActiveProjectId(): string | null {
  if (fs.existsSync(ACTIVE_PROJECT_PATH)) {
    try {
      const data = fs.readFileSync(ACTIVE_PROJECT_PATH, 'utf-8');
      const parsed = JSON.parse(data);
      return parsed.activeProject || null;
    } catch (e) {
      return null;
    }
  }
  return null;
}

function getAdvisors(): Advisor[] {
  let custom: Advisor[] = [];
  let writeBack = false;

  if (!fs.existsSync(ADVISORS_FILE)) {
    fs.writeFileSync(ADVISORS_FILE, JSON.stringify(DEFAULT_CUSTOM_ADVISORS, null, 2));
    custom = DEFAULT_CUSTOM_ADVISORS;
  } else {
    try {
      const data = fs.readFileSync(ADVISORS_FILE, 'utf-8');
      custom = JSON.parse(data) as Advisor[];
      
      // Auto-migrate Oliver if he is missing projectId
      custom = custom.map(adv => {
        if (adv.id === 'oliver' && !adv.projectId) {
          writeBack = true;
          return { ...adv, projectId: 'wicked-prints-2' };
        }
        return adv;
      });

      if (writeBack) {
        fs.writeFileSync(ADVISORS_FILE, JSON.stringify(custom, null, 2));
      }
    } catch (e) {
      custom = DEFAULT_CUSTOM_ADVISORS;
    }
  }

  const activeProjectId = getActiveProjectId();

  // Combine core and custom, filtering by active project if projectId is locked
  const combined = [...CORE_ADVISORS, ...custom];

  return combined.filter(advisor => {
    if (!advisor.projectId) {
      return true;
    }
    return advisor.projectId === activeProjectId;
  });
}

export async function GET() {
  try {
    const advisors = getAdvisors();
    return NextResponse.json({ success: true, advisors });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, role, specialty, initialMessage, projectId } = body;

    if (!name || !role) {
      return NextResponse.json({ success: false, error: 'Name and Role are required' }, { status: 400 });
    }

    let currentCustom: Advisor[] = [];
    if (fs.existsSync(ADVISORS_FILE)) {
      try {
        currentCustom = JSON.parse(fs.readFileSync(ADVISORS_FILE, 'utf-8'));
      } catch (e) {
        currentCustom = [];
      }
    }

    const newId = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    
    // Check if ID is occupied by core or custom
    const idExists = CORE_ADVISORS.some(c => c.id === newId) || currentCustom.some(c => c.id === newId);
    const finalId = idExists ? `${newId}-${Date.now().toString().slice(-4)}` : newId;

    const newAdvisor: Advisor = {
      id: finalId,
      name,
      role,
      specialty: specialty || `${role} specialized advisor.`,
      initialMessage: initialMessage || `Hello, I am ${name}, your specialized advisor for ${role}.`,
      type: 'custom',
      avatarInitials: name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase(),
      avatarColor: 'bg-emerald-600/20 text-emerald-400 border-emerald-500/20'
    };

    if (projectId) {
      newAdvisor.projectId = projectId;
    }

    currentCustom.push(newAdvisor);
    fs.writeFileSync(ADVISORS_FILE, JSON.stringify(currentCustom, null, 2));

    const updatedAdvisors = getAdvisors(); // Re-read to respect active project filters
    return NextResponse.json({ success: true, advisor: newAdvisor, advisors: updatedAdvisors });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, name, role, specialty, initialMessage, projectId } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Advisor ID is required' }, { status: 400 });
    }

    let currentCustom: Advisor[] = [];
    if (fs.existsSync(ADVISORS_FILE)) {
      try {
        currentCustom = JSON.parse(fs.readFileSync(ADVISORS_FILE, 'utf-8'));
      } catch (e) {
        currentCustom = [];
      }
    }

    // Find if the custom advisor exists
    const idx = currentCustom.findIndex(c => c.id === id);
    if (idx === -1) {
      // If it's a core advisor, we can create an override in custom advisors
      const isCore = CORE_ADVISORS.some(c => c.id === id);
      if (!isCore) {
        return NextResponse.json({ success: false, error: 'Advisor not found' }, { status: 404 });
      }

      // Overriding a core advisor
      const coreInfo = CORE_ADVISORS.find(c => c.id === id)!;
      const overriddenAdvisor: Advisor = {
        ...coreInfo,
        name: name || coreInfo.name,
        role: role || coreInfo.role,
        specialty: specialty || coreInfo.specialty,
        initialMessage: initialMessage || coreInfo.initialMessage,
        projectId: projectId || coreInfo.projectId,
        type: 'custom' // Treat as custom to allow persistence
      };
      currentCustom.push(overriddenAdvisor);
    } else {
      // Update existing custom advisor
      currentCustom[idx] = {
        ...currentCustom[idx],
        name: name || currentCustom[idx].name,
        role: role || currentCustom[idx].role,
        specialty: specialty || currentCustom[idx].specialty,
        initialMessage: initialMessage || currentCustom[idx].initialMessage,
        projectId: projectId !== undefined ? (projectId || undefined) : currentCustom[idx].projectId
      };
    }

    fs.writeFileSync(ADVISORS_FILE, JSON.stringify(currentCustom, null, 2));

    const updatedAdvisors = getAdvisors();
    return NextResponse.json({ success: true, advisors: updatedAdvisors });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Advisor ID is required' }, { status: 400 });
    }

    let currentCustom: Advisor[] = [];
    if (fs.existsSync(ADVISORS_FILE)) {
      try {
        currentCustom = JSON.parse(fs.readFileSync(ADVISORS_FILE, 'utf-8'));
      } catch (e) {
        currentCustom = [];
      }
    }

    const filtered = currentCustom.filter(c => c.id !== id);
    fs.writeFileSync(ADVISORS_FILE, JSON.stringify(filtered, null, 2));

    const updatedAdvisors = getAdvisors();
    return NextResponse.json({ success: true, advisors: updatedAdvisors });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
