import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const execAsync = promisify(exec);

// Path definitions
const CENTRAL_SKILLS_DIR = path.join(os.homedir(), '.ai_skills');
const HERMES_SKILLS_DIR = path.join(os.homedir(), '.hermes', 'skills');

export async function GET() {
  try {
    // Ensure the central skills directory exists
    if (!fs.existsSync(CENTRAL_SKILLS_DIR)) {
      fs.mkdirSync(CENTRAL_SKILLS_DIR, { recursive: true });
    }

    const skills: Array<{ name: string; source: string; content?: string }> = [];

    // Read central skills
    if (fs.existsSync(CENTRAL_SKILLS_DIR)) {
      const files = fs.readdirSync(CENTRAL_SKILLS_DIR);
      for (const file of files) {
        if (file.endsWith('.md')) {
          skills.push({
            name: file.replace('.md', ''),
            source: 'Central Repo'
          });
        }
      }
    }

    // Read Hermes skills if available
    if (fs.existsSync(HERMES_SKILLS_DIR)) {
      const files = fs.readdirSync(HERMES_SKILLS_DIR);
      for (const file of files) {
        if (file.endsWith('.md') || fs.statSync(path.join(HERMES_SKILLS_DIR, file)).isDirectory()) {
          const name = file.endsWith('.md') ? file.replace('.md', '') : file;
          // Check if already in central
          if (!skills.some(s => s.name === name)) {
            skills.push({
              name,
              source: 'Hermes CLI'
            });
          }
        }
      }
    }

    return NextResponse.json({ success: true, skills });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, skillName, githubUrl } = body;

    // Ensure the central and individual CLI skills directory exists
    if (!fs.existsSync(CENTRAL_SKILLS_DIR)) {
      fs.mkdirSync(CENTRAL_SKILLS_DIR, { recursive: true });
    }
    if (!fs.existsSync(HERMES_SKILLS_DIR)) {
      fs.mkdirSync(HERMES_SKILLS_DIR, { recursive: true });
    }

    if (action === 'gather') {
      // Logic to copy/gather skills from Hermes into the central repository
      let gatheredCount = 0;
      if (fs.existsSync(HERMES_SKILLS_DIR)) {
        const files = fs.readdirSync(HERMES_SKILLS_DIR);
        for (const file of files) {
          const srcPath = path.join(HERMES_SKILLS_DIR, file);
          const destPath = path.join(CENTRAL_SKILLS_DIR, file);

          if (fs.statSync(srcPath).isFile()) {
            fs.copyFileSync(srcPath, destPath);
            gatheredCount++;
          } else if (fs.statSync(srcPath).isDirectory()) {
            await execAsync(`cp -r "${srcPath}" "${CENTRAL_SKILLS_DIR}/"`);
            gatheredCount++;
          }
        }
      }
      return NextResponse.json({ success: true, message: `Successfully gathered ${gatheredCount} skills into central repository.` });
    }

    if (action === 'distribute') {
      // Distribute from central repo back to individual CLIs
      let distributedCount = 0;
      if (fs.existsSync(CENTRAL_SKILLS_DIR)) {
        const files = fs.readdirSync(CENTRAL_SKILLS_DIR);
        for (const file of files) {
          const srcPath = path.join(CENTRAL_SKILLS_DIR, file);
          const destPath = path.join(HERMES_SKILLS_DIR, file);
          if (fs.statSync(srcPath).isFile()) {
            fs.copyFileSync(srcPath, destPath);
            distributedCount++;
          } else {
            await execAsync(`cp -r "${srcPath}" "${HERMES_SKILLS_DIR}/"`);
            distributedCount++;
          }
        }
      }
      return NextResponse.json({ success: true, message: `Successfully distributed ${distributedCount} skills to Hermes CLI.` });
    }

    if (action === 'clone' && githubUrl) {
      // Clone custom skills repository into central repo
      const repoName = githubUrl.split('/').pop()?.replace('.git', '') || 'cloned-skills';
      const tempPath = path.join(os.tmpdir(), repoName);

      await execAsync(`git clone ${githubUrl} ${tempPath}`);
      
      // Copy MD files from cloned repo to central repo
      const files = fs.readdirSync(tempPath);
      let clonedCount = 0;
      for (const file of files) {
        if (file.endsWith('.md') || file === 'SKILL.md') {
          const srcPath = path.join(tempPath, file);
          const destPath = path.join(CENTRAL_SKILLS_DIR, file === 'SKILL.md' ? `${repoName}.md` : file);
          fs.copyFileSync(srcPath, destPath);
          clonedCount++;
        }
      }

      // Cleanup
      await execAsync(`rm -rf ${tempPath}`);

      return NextResponse.json({ success: true, message: `Successfully cloned and extracted ${clonedCount} skills from ${githubUrl}.` });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
