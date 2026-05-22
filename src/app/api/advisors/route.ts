import { NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const ADVISORS_FILE = path.join(os.homedir(), '.ai_advisors.json');

interface Advisor {
  id: string;
  name: string;
  role: string;
  specialty: string;
  initialMessage: string;
  type: 'core' | 'custom';
  avatarInitials: string;
  avatarColor: string; // Tailwind class coloring or hex
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
    avatarColor: 'bg-teal-600/20 text-teal-400 border-teal-500/20'
  }
];

function getAdvisors(): Advisor[] {
  if (!fs.existsSync(ADVISORS_FILE)) {
    fs.writeFileSync(ADVISORS_FILE, JSON.stringify(DEFAULT_CUSTOM_ADVISORS, null, 2));
    return [...CORE_ADVISORS, ...DEFAULT_CUSTOM_ADVISORS];
  }
  try {
    const data = fs.readFileSync(ADVISORS_FILE, 'utf-8');
    const custom = JSON.parse(data) as Advisor[];
    return [...CORE_ADVISORS, ...custom];
  } catch (e) {
    return [...CORE_ADVISORS, ...DEFAULT_CUSTOM_ADVISORS];
  }
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
    const { name, role, specialty, initialMessage } = body;

    if (!name || !role) {
      return NextResponse.json({ success: false, error: 'Name and Role are required' }, { status: 400 });
    }

    // Read current custom advisors
    let currentCustom: Advisor[] = [];
    if (fs.existsSync(ADVISORS_FILE)) {
      try {
        currentCustom = JSON.parse(fs.readFileSync(ADVISORS_FILE, 'utf-8'));
      } catch (e) {
        currentCustom = [];
      }
    }

    const newId = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const newAdvisor: Advisor = {
      id: newId,
      name,
      role,
      specialty: specialty || `${role} specialized advisor.`,
      initialMessage: initialMessage || `Hello, I am ${name}, your specialized advisor for ${role}.`,
      type: 'custom',
      avatarInitials: name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase(),
      avatarColor: 'bg-emerald-600/20 text-emerald-400 border-emerald-500/20' // Default custom styling
    };

    currentCustom.push(newAdvisor);
    fs.writeFileSync(ADVISORS_FILE, JSON.stringify(currentCustom, null, 2));

    return NextResponse.json({ success: true, advisor: newAdvisor, advisors: [...CORE_ADVISORS, ...currentCustom] });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
