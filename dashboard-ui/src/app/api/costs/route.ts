import { NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const COSTS_FILE = path.join(os.homedir(), '.ai_costs.json');

interface Transaction {
  date: string;
  cli: string;
  promptTokens: number;
  completionTokens: number;
  cost: number;
}

interface CostData {
  monthlyBudget: number;
  monthlySpent: number;
  usageByCLI: Array<{ name: string; spent: number; percentage: number }>;
  transactions: Transaction[];
}

const DEFAULT_TRANSACTIONS: Transaction[] = [
  { date: '2026-05-20', cli: 'Hermes', promptTokens: 1450000, completionTokens: 420000, cost: 6.42 },
  { date: '2026-05-19', cli: 'Claude Code', promptTokens: 520000, completionTokens: 120000, cost: 5.20 },
  { date: '2026-05-18', cli: 'Codex CLI', promptTokens: 323000, completionTokens: 80000, cost: 3.23 }
];

const DEFAULT_COST_DATA = {
  monthlyBudget: 50.00,
  transactions: DEFAULT_TRANSACTIONS
};

function calculateMetrics(data: any): CostData {
  const transactions: Transaction[] = data.transactions || DEFAULT_TRANSACTIONS;
  const monthlyBudget = data.monthlyBudget || 50.00;

  // Calculate total monthly spent
  const monthlySpent = Number(transactions.reduce((sum, tx) => sum + tx.cost, 0).toFixed(2));

  // Calculate usage grouped by CLI
  const cliGroups: Record<string, number> = {};
  transactions.forEach(tx => {
    cliGroups[tx.cli] = (cliGroups[tx.cli] || 0) + tx.cost;
  });

  const usageByCLI = Object.entries(cliGroups).map(([name, spent]) => {
    const roundedSpent = Number(spent.toFixed(2));
    const percentage = monthlySpent > 0 ? Math.round((roundedSpent / monthlySpent) * 100) : 0;
    return {
      name,
      spent: roundedSpent,
      percentage
    };
  });

  // Ensure other known CLIs are listed even if they have 0 spend
  const knownClis = ['Hermes', 'Claude Code', 'Antigravity (agy)', 'Codex CLI'];
  knownClis.forEach(cliName => {
    if (!usageByCLI.some(item => item.name === cliName)) {
      usageByCLI.push({
        name: cliName,
        spent: 0.00,
        percentage: 0
      });
    }
  });

  // Sort by spent amount descending
  usageByCLI.sort((a, b) => b.spent - a.spent);

  return {
    monthlyBudget,
    monthlySpent,
    usageByCLI,
    transactions
  };
}

function getCosts(): CostData {
  if (!fs.existsSync(COSTS_FILE)) {
    const initialData = calculateMetrics(DEFAULT_COST_DATA);
    fs.writeFileSync(COSTS_FILE, JSON.stringify(initialData, null, 2));
    return initialData;
  }
  try {
    const fileData = fs.readFileSync(COSTS_FILE, 'utf-8');
    const parsed = JSON.parse(fileData);
    return calculateMetrics(parsed);
  } catch (e) {
    return calculateMetrics(DEFAULT_COST_DATA);
  }
}

export async function GET() {
  try {
    const data = getCosts();
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const currentData = getCosts();

    // Merge transactions and monthlyBudget appropriately
    const updatedData = {
      ...currentData,
      ...body
    };

    const reCalculated = calculateMetrics(updatedData);

    fs.writeFileSync(COSTS_FILE, JSON.stringify(reCalculated, null, 2));
    return NextResponse.json({ success: true, data: reCalculated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
