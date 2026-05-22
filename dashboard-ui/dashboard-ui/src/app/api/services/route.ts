import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const SERVICE_COMMANDS = {
  hermes: {
    start: 'pm2 start hermes --name "hermes-agent" || nohup hermes > /tmp/hermes-agent.log 2>&1 &',
    stop: 'pm2 stop "hermes-agent" || pkill -f hermes',
    check: 'pm2 show "hermes-agent" || pgrep -f hermes'
  },
  openclaw: {
    start: 'pm2 start openclaw --name "openclaw" || nohup openclaw > /tmp/openclaw.log 2>&1 &',
    stop: 'pm2 stop "openclaw" || pkill -f openclaw',
    check: 'pm2 show "openclaw" || pgrep -f openclaw'
  }
};

export async function GET(request: Request) {
  console.log("INNER SERVICES ROUTE CALLED");
  try {
    const { searchParams } = new URL(request.url);
    const service = searchParams.get('service');

    if (service && service in SERVICE_COMMANDS) {
      const cmd = SERVICE_COMMANDS[service as keyof typeof SERVICE_COMMANDS].check;
      try {
        await execAsync(cmd);
        return NextResponse.json({ success: true, running: true, service });
      } catch (e) {
        return NextResponse.json({ success: true, running: false, service });
      }
    }

    // Default: Check all services
    const statuses: Record<string, boolean> = {};
    for (const [key, commands] of Object.entries(SERVICE_COMMANDS)) {
      try {
        await execAsync(commands.check);
        statuses[key] = true;
      } catch (e) {
        statuses[key] = false;
      }
    }

    return NextResponse.json({ success: true, services: statuses });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { service, action } = await request.json();

    if (!service || !(service in SERVICE_COMMANDS)) {
      return NextResponse.json({ success: false, error: 'Invalid service specified' }, { status: 400 });
    }

    if (action !== 'start' && action !== 'stop') {
      return NextResponse.json({ success: false, error: 'Invalid action specified' }, { status: 400 });
    }

    const cmd = SERVICE_COMMANDS[service as keyof typeof SERVICE_COMMANDS][action as 'start' | 'stop'];

    // Execute service command in background
    exec(cmd, (error, stdout, stderr) => {
      console.log(`Service ${service} ${action} command executed.`);
    });

    return NextResponse.json({ 
      success: true, 
      message: `Command sent: ${action}ing ${service} background daemon...` 
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
