import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const SERVICE_COMMANDS = {
  hermes: {
    start: 'nohup hermes dashboard --port 9119 --host 127.0.0.1 --no-open --skip-build > /tmp/hermes-dashboard.log 2>&1 &',
    stop: 'hermes dashboard --stop || pkill -f "hermes dashboard"',
    check: 'pgrep -f "hermes dashboard"'
  },
  openclaw: {
    start: 'pm2 start openclaw --name "openclaw" || nohup openclaw > /tmp/openclaw.log 2>&1 &',
    stop: 'pm2 stop "openclaw" || pkill -f openclaw',
    check: 'pm2 show "openclaw" || pgrep -x openclaw'
  }
};

export async function GET(request: Request) {
  console.log("OUTER SERVICES ROUTE CALLED");
  try {
    const { searchParams } = new URL(request.url);
    const service = searchParams.get('service');

    const checkHermesDashboard = async () => {
      try {
        const { stdout } = await execAsync('ps -ef');
        const lines = stdout.split('\n');
        const line = lines.find(l => l.includes('hermes') && l.includes('dashboard') && !l.includes('grep'));
        if (line) {
          let host = '127.0.0.1';
          let port = '9119';
          const portMatch = line.match(/--port\s+(\d+)/);
          if (portMatch) port = portMatch[1];
          const hostMatch = line.match(/--host\s+([^\s]+)/);
          if (hostMatch) host = hostMatch[1];
          return { running: true, host, port };
        }
      } catch (e) {
        // Fallback
      }
      try {
        await execAsync('pgrep -f "hermes dashboard"');
        return { running: true, host: '127.0.0.1', port: '9119' };
      } catch (e) {
        return { running: false, host: '127.0.0.1', port: '9119' };
      }
    };

    if (service === 'hermes') {
      const status = await checkHermesDashboard();
      return NextResponse.json({ success: true, running: status.running, service, host: status.host, port: status.port });
    }

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
    const hermesStatus = await checkHermesDashboard();
    statuses.hermes = hermesStatus.running;

    for (const [key, commands] of Object.entries(SERVICE_COMMANDS)) {
      if (key === 'hermes') continue;
      try {
        const { stdout, stderr } = await execAsync(commands.check);
        console.log(`Check ${key} stdout: "${stdout.trim()}" stderr: "${stderr.trim()}"`);
        statuses[key] = true;
      } catch (e: any) {
        console.log("Error checking " + key + ":", e.message.trim(), "stdout:", e.stdout ? e.stdout.trim() : "", "stderr:", e.stderr ? e.stderr.trim() : "");
        statuses[key] = false;
      }
    }

    return NextResponse.json({ 
      success: true, 
      services: statuses, 
      hermes: { host: hermesStatus.host, port: hermesStatus.port } 
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { service, action, options } = await request.json();

    if (!service || !(service in SERVICE_COMMANDS)) {
      return NextResponse.json({ success: false, error: 'Invalid service specified' }, { status: 400 });
    }

    if (action !== 'start' && action !== 'stop') {
      return NextResponse.json({ success: false, error: 'Invalid action specified' }, { status: 400 });
    }

    let cmd = '';
    if (service === 'hermes' && action === 'start') {
      const port = options?.port || 9119;
      const host = options?.host || '127.0.0.1';
      const insecure = options?.insecure ? '--insecure' : '';
      const tui = options?.tui ? '--tui' : '';
      const skipBuild = options?.skipBuild ? '--skip-build' : '';
      
      cmd = `nohup hermes dashboard --port ${port} --host ${host} --no-open ${insecure} ${tui} ${skipBuild} > /tmp/hermes-dashboard.log 2>&1 &`;
    } else {
      cmd = SERVICE_COMMANDS[service as keyof typeof SERVICE_COMMANDS][action as 'start' | 'stop'];
    }

    // Execute service command in background
    exec(cmd, (error, stdout, stderr) => {
      console.log(`Service ${service} ${action} command executed: ${cmd}`);
      if (error) {
        console.error(`Exec error for ${service} ${action}: ${error.message}`);
      }
    });

    return NextResponse.json({ 
      success: true, 
      message: `Command sent: ${action === 'stop' ? 'stopping' : 'starting'} ${service} background daemon...` 
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
