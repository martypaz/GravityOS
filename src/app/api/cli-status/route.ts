import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function GET() {
  const clis = [
    { name: 'hermes', command: 'which hermes' },
    { name: 'claude', command: 'which claude' },
    { name: 'codex', command: 'which codex' },
    { name: 'agy', command: 'which agy' }
  ];

  const results = await Promise.all(
    clis.map(async (cli) => {
      try {
        const { stdout } = await execAsync(cli.command);
        return {
          name: cli.name,
          installed: true,
          path: stdout.trim()
        };
      } catch (error) {
        return {
          name: cli.name,
          installed: false,
          path: null
        };
      }
    })
  );

  return NextResponse.json({ status: 'success', data: results });
}
