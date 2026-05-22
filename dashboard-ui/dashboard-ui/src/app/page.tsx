'use client';

import React, { useState, useEffect } from 'react';
import { 
  Server, Cpu, BookOpen, DollarSign, RefreshCw, 
  ArrowDownToLine, Globe, Users, Terminal, CheckCircle2, 
  XCircle, AlertCircle, PlusCircle, ArrowUpRight, Check, Send,
  FolderOpen, Folder, Code2, Layers, ShieldCheck, UserPlus
} from 'lucide-react';

interface CLI {
  name: string;
  installed: boolean;
  version: string;
  repo: string;
}

interface MemorySystem {
  name: string;
  installed: boolean;
  type: string;
  details: string;
}

interface Skill {
  name: string;
  source: string;
}

interface CostData {
  monthlyBudget: number;
  monthlySpent: number;
  usageByCLI: Array<{ name: string; spent: number; percentage: number }>;
  transactions: Array<{ date: string; cli: string; promptTokens: number; completionTokens: number; cost: number }>;
}

interface ProjectMeta {
  name: string;
  path: string;
  hasAgentsMd: boolean;
  hasClaudeMd: boolean;
  hasCursorrules: boolean;
  agents: string[];
  skills: string[];
  languages: Record<string, number>;
}

interface Advisor {
  id: string;
  name: string;
  role: string;
  specialty: string;
  initialMessage: string;
  type: 'core' | 'custom';
  avatarInitials: string;
  avatarColor: string;
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<'overview' | 'projects' | 'clis' | 'skills' | 'memory' | 'costs'>('overview');
  const [clis, setClis] = useState<Record<string, CLI>>({});
  const [memorySystems, setMemorySystems] = useState<Record<string, MemorySystem>>({});
  const [skills, setSkills] = useState<Skill[]>([]);
  const [costs, setCosts] = useState<CostData | null>(null);
  
  // Projects state
  const [projects, setProjects] = useState<ProjectMeta[]>([]);
  const [activeProject, setActiveProject] = useState<string>('GravityOS');
  
  // Advisors state
  const [advisors, setAdvisors] = useState<Advisor[]>([]);
  const [selectedAdvisorId, setSelectedAdvisorId] = useState<string>('marcus');
  const [showAddAdvisorForm, setShowAddAdvisorForm] = useState(false);
  
  // New Advisor Form State
  const [newAdvisorName, setNewAdvisorName] = useState('');
  const [newAdvisorRole, setNewAdvisorRole] = useState('');
  const [newAdvisorSpecialty, setNewAdvisorSpecialty] = useState('');
  const [newAdvisorMessage, setNewAdvisorMessage] = useState('');

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Forms & Actions states
  const [newCliName, setNewCliName] = useState('');
  const [newCliCmd, setNewCliCmd] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [budgetInput, setBudgetInput] = useState('');
  const [statusMessage, setStatusMessage] = useState({ text: '', type: 'info' });
  const [logs, setLogs] = useState<string[]>(['[System Initialization] GravityOS Control Dashboard loaded successfully.']);

  // Chat/Persona interaction state
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<Array<{ sender: string; text: string; time: string }>>([
    { sender: 'Marcus (Ideas Man)', text: 'Welcome to GravityOS! How can we optimize your WSL AI workflows today?', time: 'Just now' }
  ]);

  const addLog = (msg: string) => {
    setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 49)]);
  };

  const showStatus = (text: string, type: 'info' | 'success' | 'error' = 'info') => {
    setStatusMessage({ text, type });
    setTimeout(() => setStatusMessage({ text: '', type: 'info' }), 6000);
  };

  // Fetch all system data
  const fetchData = async () => {
    setRefreshing(true);
    try {
      // System Status (CLIs & Memory)
      const sysRes = await fetch('/api/system');
      const sysData = await sysRes.json();
      if (sysData.clis) setClis(sysData.clis);
      if (sysData.memory) setMemorySystems(sysData.memory);

      // Skills
      const skillsRes = await fetch('/api/skills');
      const skillsData = await skillsRes.json();
      if (skillsData.success) setSkills(skillsData.skills);

      // Costs
      const costsRes = await fetch('/api/costs');
      const costsData = await costsRes.json();
      if (costsData.success) {
        setCosts(costsData.data);
        setBudgetInput(costsData.data.monthlyBudget.toString());
      }

      // Projects
      const projectsRes = await fetch('/api/projects');
      const projectsData = await projectsRes.json();
      if (projectsData.success) {
        setProjects(projectsData.projects);
        setActiveProject(projectsData.activeProject);
      }

      // Advisors
      const advisorsRes = await fetch('/api/advisors');
      const advisorsData = await advisorsRes.json();
      if (advisorsData.success) {
        setAdvisors(advisorsData.advisors);
      }
      
      addLog('System status and metrics synchronized.');
    } catch (e: any) {
      addLog(`Error fetching data: ${e.message}`);
      showStatus('Failed to sync system data', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Switch Active Project
  const handleSelectProject = async (projectName: string) => {
    addLog(`Workspace targeting synced to: ${projectName}...`);
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activeProject: projectName })
      });
      const data = await res.json();
      if (data.success) {
        setActiveProject(projectName);
        showStatus(`Workspace target switched to '${projectName}'!`, 'success');
        addLog(`Active workspace locked to '${projectName}'.`);
        fetchData();
      } else {
        showStatus(`Failed to switch project: ${data.error}`, 'error');
      }
    } catch (e: any) {
      showStatus('Failed to connect to projects API', 'error');
    }
  };

  // Switch Selected Advisor
  const handleSelectAdvisor = (advisor: Advisor) => {
    setSelectedAdvisorId(advisor.id);
    setChatHistory([
      { sender: advisor.name, text: advisor.initialMessage, time: 'Just now' }
    ]);
    addLog(`Switched guidance context to ${advisor.name}.`);
  };

  // Create a Custom Advisor
  const handleCreateAdvisor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdvisorName || !newAdvisorRole) return;
    
    addLog(`Registering new global advisor '${newAdvisorName}'...`);
    try {
      const res = await fetch('/api/advisors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newAdvisorName,
          role: newAdvisorRole,
          specialty: newAdvisorSpecialty,
          initialMessage: newAdvisorMessage
        })
      });
      const data = await res.json();
      if (data.success) {
        setAdvisors(data.advisors);
        setNewAdvisorName('');
        setNewAdvisorRole('');
        setNewAdvisorSpecialty('');
        setNewAdvisorMessage('');
        setShowAddAdvisorForm(false);
        showStatus(`Advisor '${newAdvisorName}' registered globally!`, 'success');
        addLog(`New global advisor '${newAdvisorName}' successfully operational.`);
        
        // Auto-select the newly created advisor
        const newlyCreated = data.advisors.find((a: Advisor) => a.name === newAdvisorName) || data.advisor;
        if (newlyCreated) {
          handleSelectAdvisor(newlyCreated);
        }
      } else {
        showStatus(`Failed to register advisor: ${data.error}`, 'error');
      }
    } catch (e: any) {
      showStatus('Error connecting to advisor registration pipeline', 'error');
    }
  };

  // Handle CLI or Memory installation/updating
  const handleInstallUpdate = async (type: 'cli' | 'memory', name: string, action: 'install' | 'update') => {
    addLog(`Initiating ${action} for ${name}...`);
    try {
      const res = await fetch('/api/system', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, name, action })
      });
      const data = await res.json();
      if (data.success) {
        showStatus(`${name} ${action} command sent successfully!`, 'success');
        addLog(`${name} installation/update triggered.`);
        // Refresh after a short delay
        setTimeout(fetchData, 3000);
      } else {
        showStatus(`Failed to ${action} ${name}: ${data.error}`, 'error');
      }
    } catch (e: any) {
      showStatus(`Network error during ${action}`, 'error');
    }
  };

  // Handle Skills actions (gather, distribute, clone repo)
  const handleSkillsAction = async (action: 'gather' | 'distribute' | 'clone') => {
    addLog(`Running skills action: ${action}...`);
    try {
      const body: any = { action };
      if (action === 'clone') {
        if (!githubUrl) {
          showStatus('Please specify a GitHub repo URL', 'error');
          return;
        }
        body.githubUrl = githubUrl;
      }

      const res = await fetch('/api/skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (data.success) {
        showStatus(data.message, 'success');
        addLog(data.message);
        setGithubUrl('');
        fetchData();
      } else {
        showStatus(`Failed to run skill action: ${data.error}`, 'error');
      }
    } catch (e: any) {
      showStatus('Network error during skill aggregation', 'error');
    }
  };

  // Update budget limit
  const handleUpdateBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    const newBudget = parseFloat(budgetInput);
    if (isNaN(newBudget)) {
      showStatus('Invalid budget amount', 'error');
      return;
    }
    try {
      const res = await fetch('/api/costs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ monthlyBudget: newBudget })
      });
      const data = await res.json();
      if (data.success) {
        setCosts(data.data);
        showStatus('Monthly budget successfully updated!', 'success');
        addLog(`Monthly budget limit adjusted to $${newBudget}.`);
      }
    } catch (e: any) {
      showStatus('Failed to update budget', 'error');
    }
  };

  // Custom CLI Add simulation
  const handleAddCustomCli = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCliName) return;
    addLog(`Custom CLI '${newCliName}' registered successfully.`);
    setClis(prev => ({
      ...prev,
      [newCliName.toLowerCase()]: {
        name: newCliName,
        installed: false,
        version: 'Manual Install Req.',
        repo: ''
      }
    }));
    setNewCliName('');
    showStatus(`Custom CLI '${newCliName}' added to monitoring.`, 'success');
  };

  // Persona Interactive Panel
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg = { sender: 'You', text: chatInput, time: 'Just now' };
    setChatHistory(prev => [...prev, userMsg]);
    const prompt = chatInput;
    setChatInput('');

    // Simulated responses from our custom advisors based on their specialties
    setTimeout(() => {
      const activeAdvisor = advisors.find(a => a.id === selectedAdvisorId);
      if (!activeAdvisor) return;

      let responseText = '';
      if (activeAdvisor.id === 'marcus') {
        responseText = `Splendid context! Switching active targets between projects like 'wicked_prints' or 'GravityOS' allows us to dynamically segment custom skillsets so agents remain focused on domain boundaries.`;
      } else if (activeAdvisor.id === 'leo') {
        responseText = `Checking files like AGENTS.md, CLAUDE.md, and .cursorrules at the project root is the most modular way to inject environment boundaries. We should make sure our sub-agents inherit these automatically.`;
      } else if (activeAdvisor.id === 'maya') {
        responseText = `Let's make sure that when you switch between folders, the active project name displays clearly with an elegant, glowing indicator. The folder checklist gives a great visual scan of project completeness!`;
      } else if (activeAdvisor.id === 'silas') {
        responseText = `Excellent. I can script a hook that reads from your project's local .hermes/skills directory and temporarily overlays them on top of the central database when that project is checked as 'Active'.`;
      } else if (activeAdvisor.id === 'oliver') {
        responseText = `For Print on Demand margins, I highly recommend calculating shipping rates dynamically across both Printify and Printful. We can store supplier spec variables in your local vector memory to speed up multi-agent SEO descriptions!`;
      } else {
        responseText = `Understood. As your specialized advisor for ${activeAdvisor.role}, I recommend setting up project-specific skills and storing custom references in the local '${activeProject}' directory. Let's build a modular automation workflow for this!`;
      }

      setChatHistory(prev => [...prev, { sender: activeAdvisor.name, text: responseText, time: 'Just now' }]);
      addLog(`Received advice from ${activeAdvisor.name}`);
    }, 1000);
  };

  const selectedProjectMeta = projects.find(p => p.name === activeProject);
  const activeAdvisor = advisors.find(a => a.id === selectedAdvisorId);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-950 text-white font-sans">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="w-12 h-12 animate-spin text-emerald-500" />
          <p className="text-zinc-400 font-medium">Booting GravityOS Core Manager...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-zinc-950 text-zinc-100 font-sans">
      {/* SIDEBAR NAVIGATION */}
      <aside className="w-64 border-r border-zinc-800 bg-zinc-900/50 flex flex-col">
        <div className="p-6 border-b border-zinc-800">
          <h1 className="text-xl font-bold tracking-wider text-emerald-500 flex items-center gap-2">
            <Cpu className="w-6 h-6 animate-pulse" /> GRAVITY OS
          </h1>
          <p className="text-xs text-zinc-500 mt-1 font-mono">ACTIVE: {activeProject}</p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <button 
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'overview' ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/20' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'}`}
          >
            <Users className="w-5 h-5" /> Overview & Team
          </button>
          <button 
            onClick={() => setActiveTab('projects')}
            className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'projects' ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/20' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'}`}
          >
            <FolderOpen className="w-5 h-5" /> Projects Folder
          </button>
          <button 
            onClick={() => setActiveTab('clis')}
            className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'clis' ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/20' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'}`}
          >
            <Server className="w-5 h-5" /> CLI Tools
          </button>
          <button 
            onClick={() => setActiveTab('skills')}
            className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'skills' ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/20' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'}`}
          >
            <BookOpen className="w-5 h-5" /> Central Skills
          </button>
          <button 
            onClick={() => setActiveTab('memory')}
            className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'memory' ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/20' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'}`}
          >
            <Cpu className="w-5 h-5" /> Memory Systems
          </button>
          <button 
            onClick={() => setActiveTab('costs')}
            className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'costs' ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/20' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'}`}
          >
            <DollarSign className="w-5 h-5" /> Cost Management
          </button>
        </nav>

        {/* Sync Button & Footer */}
        <div className="p-4 border-t border-zinc-800 space-y-3">
          <button 
            onClick={fetchData} 
            disabled={refreshing}
            className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-sm font-medium rounded-lg text-white transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Sync Dashboard
          </button>
          <div className="text-center text-[10px] text-zinc-600 font-mono">
            Hardware: GTX 1080 Ti Active
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT SPACE */}
      <main className="flex-1 flex flex-col h-screen overflow-y-auto">
        {/* TOP STATUS BAR */}
        <header className="border-b border-zinc-800 bg-zinc-900/20 px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold capitalize">{activeTab} Manager</h2>
            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs px-3 py-1 rounded-full font-mono flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Active Workspace: {activeProject}
            </div>
          </div>
          <div className="flex items-center gap-6">
            <span className="text-xs text-zinc-400 font-mono">Path: <strong className="text-zinc-200">/home/ubuntu/projects/antigravity/{activeProject}</strong></span>
          </div>
        </header>

        {/* STATUS FLASH BANNER */}
        {statusMessage.text && (
          <div className={`mx-8 mt-6 p-4 rounded-lg flex items-center gap-3 border ${
            statusMessage.type === 'success' ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-400' :
            statusMessage.type === 'error' ? 'bg-rose-950/30 border-rose-500/30 text-rose-400' :
            'bg-zinc-900/80 border-zinc-700 text-zinc-300'
          }`}>
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm font-medium">{statusMessage.text}</span>
          </div>
        )}

        <div className="p-8 flex-1 space-y-8">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-8">
              {/* CURRENT ACTIVE PROJECT METRICS HEADER */}
              {selectedProjectMeta && (
                <div className="bg-zinc-900 border border-emerald-500/10 p-6 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <FolderOpen className="w-5 h-5 text-emerald-500" />
                      <h3 className="text-base font-bold text-zinc-100">{selectedProjectMeta.name}</h3>
                    </div>
                    <p className="text-xs text-zinc-400 font-mono">{selectedProjectMeta.path}</p>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-center px-4 border-r border-zinc-800">
                      <span className="text-[10px] text-zinc-500 block uppercase font-semibold">Common Agents</span>
                      <span className="text-lg font-bold text-emerald-400">{selectedProjectMeta.agents.length || 4} Active</span>
                    </div>
                    <div className="text-center px-4 border-r border-zinc-800">
                      <span className="text-[10px] text-zinc-500 block uppercase font-semibold">Project Skills</span>
                      <span className="text-lg font-bold text-emerald-400">{selectedProjectMeta.skills.length} Loaded</span>
                    </div>
                    <div className="text-center px-4">
                      <span className="text-[10px] text-zinc-500 block uppercase font-semibold">Configuration</span>
                      <div className="flex gap-1.5 mt-0.5">
                        <span title="AGENTS.md" className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold ${selectedProjectMeta.hasAgentsMd ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-800 text-zinc-600'}`}>A</span>
                        <span title="CLAUDE.md" className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold ${selectedProjectMeta.hasClaudeMd ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-800 text-zinc-600'}`}>C</span>
                        <span title=".cursorrules" className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold ${selectedProjectMeta.hasCursorrules ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-800 text-zinc-600'}`}>R</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SYSTEM STATUS GRID */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl space-y-3">
                  <div className="flex items-center justify-between text-zinc-400">
                    <span className="text-xs font-semibold uppercase tracking-wider">Active CLIs</span>
                    <Server className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div className="text-3xl font-bold">
                    {Object.values(clis).filter(c => c.installed).length}/{Object.keys(clis).length}
                  </div>
                  <p className="text-xs text-zinc-500 font-mono">WSL binary paths mapped</p>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl space-y-3">
                  <div className="flex items-center justify-between text-zinc-400">
                    <span className="text-xs font-semibold uppercase tracking-wider">Unified Skills</span>
                    <BookOpen className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div className="text-3xl font-bold">{skills.length}</div>
                  <p className="text-xs text-zinc-500 font-mono">Shared core memory units</p>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl space-y-3">
                  <div className="flex items-center justify-between text-zinc-400">
                    <span className="text-xs font-semibold uppercase tracking-wider">Vector Memory</span>
                    <Cpu className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div className="text-3xl font-bold">
                    {Object.values(memorySystems).filter(m => m.installed).length}/{Object.keys(memorySystems).length}
                  </div>
                  <p className="text-xs text-zinc-500 font-mono">Installed search engines</p>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl space-y-3">
                  <div className="flex items-center justify-between text-zinc-400">
                    <span className="text-xs font-semibold uppercase tracking-wider">Monthly Spend</span>
                    <DollarSign className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div className="text-3xl font-bold">
                    ${costs?.monthlySpent.toFixed(2)}
                  </div>
                  <p className="text-xs text-zinc-500 font-mono font-mono">Budget: ${costs?.monthlyBudget.toFixed(2)}</p>
                </div>
              </div>

              {/* PERSONAS / ADVISOR PANEL */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Advisor Selector */}
                <div className="lg:col-span-1 bg-zinc-900 border border-zinc-800 rounded-xl p-6 flex flex-col justify-between space-y-6">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <h3 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
                        <Users className="w-5 h-5 text-emerald-500" /> OS Advisory Board
                      </h3>
                      <button 
                        onClick={() => setShowAddAdvisorForm(!showAddAdvisorForm)}
                        className="text-xs text-emerald-500 hover:text-emerald-400 font-medium flex items-center gap-1 font-mono"
                      >
                        <UserPlus className="w-3.5 h-3.5" /> Extras
                      </button>
                    </div>
                    <p className="text-xs text-zinc-400">Consult dynamic role experts across your workspaces:</p>
                  </div>

                  {/* Expandable Add Advisor Form */}
                  {showAddAdvisorForm && (
                    <form onSubmit={handleCreateAdvisor} className="bg-zinc-950 p-4 rounded-lg border border-zinc-800 space-y-3">
                      <div className="text-xs font-bold text-zinc-400 border-b border-zinc-800 pb-1 flex justify-between items-center">
                        <span>Add Extra Expert Advisor</span>
                        <button type="button" onClick={() => setShowAddAdvisorForm(false)} className="text-zinc-600 hover:text-zinc-400">×</button>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-zinc-500 font-semibold font-mono">Advisor Name</label>
                        <input 
                          type="text" required value={newAdvisorName} onChange={e => setNewAdvisorName(e.target.value)}
                          placeholder="e.g. Oliver (POD Expert)"
                          className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-xs text-white focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-zinc-500 font-semibold font-mono">Expert Role</label>
                        <input 
                          type="text" required value={newAdvisorRole} onChange={e => setNewAdvisorRole(e.target.value)}
                          placeholder="e.g. Print on Demand Advisor"
                          className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-xs text-white focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-zinc-500 font-semibold font-mono">Specialty Specialties</label>
                        <input 
                          type="text" value={newAdvisorSpecialty} onChange={e => setNewAdvisorSpecialty(e.target.value)}
                          placeholder="e.g. Printful / Printify cost optimization"
                          className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-xs text-white focus:outline-none"
                        />
                      </div>
                      <button type="submit" className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-500 text-xs font-bold rounded text-white font-mono">
                        Deploy Advisor
                      </button>
                    </form>
                  )}

                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {advisors.map((advisor) => (
                      <button 
                        key={advisor.id}
                        onClick={() => handleSelectAdvisor(advisor)}
                        className={`flex items-start gap-3 w-full p-3 rounded-lg border text-left transition-all ${
                          selectedAdvisorId === advisor.id 
                            ? 'bg-emerald-950/20 border-emerald-500 text-white shadow-lg shadow-emerald-500/5' 
                            : 'border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800 hover:border-zinc-700'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-full border flex items-center justify-center font-bold text-xs font-mono flex-shrink-0 ${advisor.avatarColor || 'bg-zinc-800 text-zinc-400 border-zinc-700'}`}>
                          {advisor.avatarInitials}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold truncate text-zinc-200">{advisor.name}</div>
                          <div className="text-[10px] text-zinc-400 font-mono truncate">{advisor.role}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Persona Chat Console */}
                <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-xl flex flex-col h-96">
                  <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/80">
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-zinc-300">Live Workspace Advisory</span>
                      {activeAdvisor && (
                        <span className="text-[10px] text-zinc-500 font-mono mt-0.5">Consulting: {activeAdvisor.specialty}</span>
                      )}
                    </div>
                    <span className="text-xs text-zinc-500 uppercase tracking-wider font-mono">Interactive</span>
                  </div>

                  <div className="flex-1 p-4 overflow-y-auto space-y-4">
                    {chatHistory.map((msg, idx) => (
                      <div key={idx} className={`flex flex-col ${msg.sender === 'You' ? 'items-end' : 'items-start'}`}>
                        <div className={`p-3 rounded-lg text-sm max-w-lg ${msg.sender === 'You' ? 'bg-emerald-600 text-white' : 'bg-zinc-800 text-zinc-200 border border-zinc-700'}`}>
                          <div className="text-[10px] opacity-75 mb-1 font-semibold font-mono">{msg.sender}</div>
                          <p>{msg.text}</p>
                        </div>
                        <span className="text-[9px] text-zinc-600 mt-1 font-mono">{msg.time}</span>
                      </div>
                    ))}
                  </div>

                  <form onSubmit={handleSendMessage} className="p-3 border-t border-zinc-800 flex gap-2">
                    <input 
                      type="text"
                      value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                      placeholder={activeAdvisor ? `Ask ${activeAdvisor.name} about ${activeProject}...` : "Ask your advisor..."}
                      className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 font-mono"
                    />
                    <button type="submit" className="p-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg">
                      <Send className="w-4 h-4" />
                    </button>
                  </form>
                </div>
              </div>

              {/* INTEGRATION CONSOLE LOGS */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2 mb-4">
                  <Terminal className="w-5 h-5 text-zinc-400" /> Background Daemon Outputs
                </h3>
                <div className="bg-zinc-950 rounded-lg p-4 font-mono text-xs text-zinc-400 h-32 overflow-y-auto space-y-1.5">
                  {logs.map((log, i) => (
                    <div key={i} className="whitespace-pre-wrap">{log}</div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PROJECTS SECTION */}
          {activeTab === 'projects' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* Projects List Panel */}
                <div className="xl:col-span-2 space-y-6">
                  <h3 className="text-base font-semibold">Workspace Projects (/home/ubuntu/projects/antigravity)</h3>

                  <div className="grid grid-cols-1 gap-4">
                    {projects.map((proj) => (
                      <div 
                        key={proj.name} 
                        className={`bg-zinc-900 border rounded-xl p-6 flex flex-col md:flex-row justify-between md:items-center gap-6 transition-all ${
                          activeProject === proj.name ? 'border-emerald-500 bg-emerald-950/5' : 'border-zinc-800 hover:border-zinc-700'
                        }`}
                      >
                        <div className="space-y-2">
                          <div className="flex items-center gap-2.5">
                            <Folder className={`w-5 h-5 ${activeProject === proj.name ? 'text-emerald-500' : 'text-zinc-500'}`} />
                            <h4 className="font-bold text-zinc-100 text-base">{proj.name}</h4>
                            {activeProject === proj.name && (
                              <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] px-2.5 py-0.5 rounded-full font-semibold font-mono">
                                Active Target
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-zinc-500 font-mono">{proj.path}</p>

                          {/* Extra Project-specific Skills */}
                          {proj.skills.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {proj.skills.map((s, idx) => (
                                <span key={idx} className="bg-zinc-950 text-zinc-400 font-mono text-[9px] px-2 py-0.5 rounded border border-zinc-800">
                                  skill:{s}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="flex flex-row md:flex-col items-end gap-3 justify-between md:justify-center">
                          {/* File config indicators */}
                          <div className="flex gap-2">
                            <div className="flex flex-col items-center">
                              <span className="text-[8px] text-zinc-500 font-mono uppercase">AGENTS.md</span>
                              <span className={`text-xs font-semibold ${proj.hasAgentsMd ? 'text-emerald-500' : 'text-zinc-600'}`}>
                                {proj.hasAgentsMd ? <CheckCircle2 className="w-4 h-4 mt-0.5" /> : <XCircle className="w-4 h-4 mt-0.5" />}
                              </span>
                            </div>
                            <div className="flex flex-col items-center">
                              <span className="text-[8px] text-zinc-500 font-mono uppercase">CLAUDE.md</span>
                              <span className={`text-xs font-semibold ${proj.hasClaudeMd ? 'text-emerald-500' : 'text-zinc-600'}`}>
                                {proj.hasClaudeMd ? <CheckCircle2 className="w-4 h-4 mt-0.5" /> : <XCircle className="w-4 h-4 mt-0.5" />}
                              </span>
                            </div>
                            <div className="flex flex-col items-center">
                              <span className="text-[8px] text-zinc-500 font-mono uppercase">.cursorrules</span>
                              <span className={`text-xs font-semibold ${proj.hasCursorrules ? 'text-emerald-500' : 'text-zinc-600'}`}>
                                {proj.hasCursorrules ? <CheckCircle2 className="w-4 h-4 mt-0.5" /> : <XCircle className="w-4 h-4 mt-0.5" />}
                              </span>
                            </div>
                          </div>

                          {activeProject !== proj.name ? (
                            <button 
                              onClick={() => handleSelectProject(proj.name)}
                              className="px-4 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold rounded-lg text-white transition-all font-mono"
                            >
                              Lock Target
                            </button>
                          ) : (
                            <div className="text-emerald-500 text-xs font-semibold flex items-center gap-1 font-mono">
                              <Check className="w-4 h-4" /> Locked
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Selected Project Breakdown Panel */}
                <div className="space-y-6">
                  <h3 className="text-base font-semibold">Active Metadata Breakdown</h3>

                  {selectedProjectMeta ? (
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-6">
                      {/* Common Agents Section */}
                      <div className="space-y-3">
                        <span className="text-xs text-zinc-500 block uppercase font-mono font-semibold">Discovered Agents (AGENTS.md)</span>
                        {selectedProjectMeta.agents.length === 0 ? (
                          <p className="text-xs text-zinc-500 leading-normal">
                            {selectedProjectMeta.hasAgentsMd 
                              ? "System guidelines and rules configured. No custom persona teams mapped."
                              : "No custom AGENTS.md located. Default general assistants active."}
                          </p>
                        ) : (
                          <div className="grid grid-cols-2 gap-2">
                            {selectedProjectMeta.agents.map((agent, idx) => (
                              <div key={idx} className="bg-zinc-950 p-2.5 rounded-lg border border-zinc-800/80 text-xs font-mono flex items-center gap-2">
                                <Users className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                                <span className="truncate text-zinc-300 font-medium">{agent}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Project Specific Skills */}
                      <div className="space-y-3">
                        <span className="text-xs text-zinc-500 block uppercase font-mono font-semibold">Discovered Skills Directory</span>
                        {selectedProjectMeta.skills.length === 0 ? (
                          <p className="text-xs text-zinc-500 leading-normal">No local skills directories detected for this folder.</p>
                        ) : (
                          <div className="space-y-1.5">
                            {selectedProjectMeta.skills.map((skill, idx) => (
                              <div key={idx} className="bg-zinc-950 px-3 py-2 rounded-lg border border-zinc-800 flex justify-between items-center">
                                <span className="text-xs font-mono text-zinc-300 font-medium">{skill}</span>
                                <span className="bg-emerald-950/30 border border-emerald-500/20 text-emerald-400 text-[9px] px-2 py-0.5 rounded font-bold font-mono">Discovered</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Language distribution stats */}
                      <div className="space-y-3">
                        <span className="text-xs text-zinc-500 block uppercase font-mono font-semibold">Tree Extensions Distribution</span>
                        <div className="bg-zinc-950 rounded-lg p-4 border border-zinc-800 space-y-2.5">
                          {Object.entries(selectedProjectMeta.languages).length === 0 ? (
                            <p className="text-xs text-zinc-500">No project files found.</p>
                          ) : (
                            Object.entries(selectedProjectMeta.languages)
                              .sort((a, b) => b[1] - a[1])
                              .slice(0, 5)
                              .map(([ext, count]) => (
                                <div key={ext} className="flex justify-between items-center text-xs font-mono">
                                  <span className="text-zinc-400 flex items-center gap-1.5">
                                    <Code2 className="w-3.5 h-3.5 text-zinc-600" /> .{ext} files
                                  </span>
                                  <span className="text-zinc-200 font-semibold bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">{count}</span>
                                </div>
                              ))
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center text-zinc-500 text-sm">
                      <AlertCircle className="w-8 h-8 mx-auto text-zinc-700 mb-2" />
                      Select a project from the left panel to display metadata analysis.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: CLIS MANAGER */}
          {activeTab === 'clis' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* CLI Cards */}
                <div className="xl:col-span-2 space-y-4">
                  <h3 className="text-base font-semibold">Configured Command Lines</h3>
                  {Object.entries(clis).map(([key, cli]) => (
                    <div key={key} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 flex justify-between items-center">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-zinc-100">{cli.name}</h4>
                          <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-semibold border ${
                            cli.installed ? 'bg-emerald-950/20 border-emerald-500/20 text-emerald-400' : 'bg-rose-950/20 border-rose-500/20 text-rose-400'
                          }`}>
                            {cli.installed ? 'Operational' : 'Missing'}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-400">Installed Command Path: <span className="font-mono text-zinc-300 bg-zinc-950 px-1 py-0.5 rounded">{cli.installed ? `/usr/local/bin/${key}` : 'Unknown'}</span></p>
                        {cli.repo && (
                          <a href={cli.repo} target="_blank" rel="noreferrer" className="text-xs text-emerald-500 hover:underline flex items-center gap-1.5">
                            <Globe className="w-3 h-3" /> View Repository <ArrowUpRight className="w-3 h-3" />
                          </a>
                        )}
                      </div>

                      <div className="flex gap-2">
                        {!cli.installed ? (
                          <button 
                            onClick={() => handleInstallUpdate('cli', key, 'install')}
                            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold rounded-lg text-white"
                          >
                            <ArrowDownToLine className="w-3.5 h-3.5" /> Install CLI
                          </button>
                        ) : (
                          <button 
                            onClick={() => handleInstallUpdate('cli', key, 'update')}
                            className="flex items-center gap-1.5 px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold rounded-lg text-white"
                          >
                            <RefreshCw className="w-3.5 h-3.5" /> Update Check
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Form to add more CLIs */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 h-fit space-y-4">
                  <div>
                    <h3 className="text-base font-semibold">Extend AI Interfaces</h3>
                    <p className="text-xs text-zinc-400 mt-1">Register other customized system hooks to check updates</p>
                  </div>

                  <form onSubmit={handleAddCustomCli} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-zinc-400">CLI Binary Name</label>
                      <input 
                        type="text" 
                        required
                        value={newCliName}
                        onChange={e => setNewCliName(e.target.value)}
                        placeholder="e.g. ooba-cli, ollama"
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-zinc-400">Checking Bash Expression</label>
                      <input 
                        type="text" 
                        value={newCliCmd}
                        onChange={e => setNewCliCmd(e.target.value)}
                        placeholder="e.g. ollama --version || which ollama"
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <button 
                      type="submit"
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-sm font-semibold rounded-lg text-white"
                    >
                      Add CLI Hook
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: SKILLS MANAGEMENT */}
          {activeTab === 'skills' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* Central list */}
                <div className="xl:col-span-2 space-y-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-base font-semibold">Central Repository (Shared Core)</h3>
                      <p className="text-xs text-zinc-400">All registered skills available to Hermes, Claude & Codex</p>
                    </div>

                    <div className="flex gap-2 font-mono">
                      <button 
                        onClick={() => handleSkillsAction('gather')}
                        className="px-3.5 py-2 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 border border-emerald-500/20 text-xs font-semibold rounded-lg"
                      >
                        Gather All Skills
                      </button>
                      <button 
                        onClick={() => handleSkillsAction('distribute')}
                        className="px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold rounded-lg"
                      >
                        Distribute Shared Core
                      </button>
                    </div>
                  </div>

                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                    {skills.length === 0 ? (
                      <div className="p-8 text-center text-zinc-500 text-sm space-y-2">
                        <AlertCircle className="w-8 h-8 mx-auto text-zinc-600" />
                        <p>No unified skills collected yet.</p>
                        <p className="text-xs text-zinc-600">Click &apos;Gather All Skills&apos; above to auto-scan your WSL directories.</p>
                      </div>
                    ) : (
                      <table className="w-full border-collapse text-left text-sm text-zinc-300">
                        <thead className="bg-zinc-950 border-b border-zinc-800 text-zinc-400 font-medium font-mono text-xs">
                          <tr>
                            <th className="p-4">Skill Namespace</th>
                            <th className="p-4">Current Master Source</th>
                            <th className="p-4 text-right">Scope status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/50">
                          {skills.map((skill, i) => (
                            <tr key={i} className="hover:bg-zinc-800/30">
                              <td className="p-4 font-mono text-zinc-100">{skill.name}</td>
                              <td className="p-4 text-xs text-zinc-400 font-mono">{skill.source}</td>
                              <td className="p-4 text-right">
                                <span className="bg-emerald-950/20 border border-emerald-500/20 text-emerald-400 text-[10px] px-2 py-0.5 rounded-full font-semibold font-mono">
                                  Synchronized
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>

                {/* Pull from Github Form */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 h-fit space-y-4">
                  <div>
                    <h3 className="text-base font-semibold">Clone Remote Skills</h3>
                    <p className="text-xs text-zinc-400 mt-1">Import skill packages directly from any open GitHub repository</p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-zinc-400">GitHub Repository URL</label>
                      <input 
                        type="url"
                        value={githubUrl}
                        onChange={e => setGithubUrl(e.target.value)}
                        placeholder="https://github.com/username/repo-skills"
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 font-mono"
                      />
                    </div>

                    <button 
                      onClick={() => handleSkillsAction('clone')}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-sm font-semibold rounded-lg text-white"
                    >
                      Fetch & Clone
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: MEMORY SYSTEMS */}
          {activeTab === 'memory' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {Object.entries(memorySystems).map(([key, mem]) => (
                  <div key={key} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 flex flex-col justify-between h-56 space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between items-start">
                        <h4 className="font-bold text-zinc-100">{mem.name}</h4>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                          mem.installed ? 'bg-emerald-950/20 border-emerald-500/20 text-emerald-400' : 'bg-rose-950/20 border-rose-500/20 text-rose-400'
                        }`}>
                          {mem.installed ? 'Deployed' : 'Unavailable'}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 font-mono">Connection Standard: <span className="font-mono text-zinc-300 bg-zinc-950 px-1 py-0.5 rounded">{mem.type}</span></p>
                      <p className="text-xs text-zinc-500 leading-normal">{mem.details}</p>
                    </div>

                    {!mem.installed ? (
                      <button 
                        onClick={() => handleInstallUpdate('memory', key, 'install')}
                        className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold rounded-lg text-white text-center flex items-center justify-center gap-2"
                      >
                        <ArrowDownToLine className="w-4 h-4" /> Install Package
                      </button>
                    ) : (
                      <div className="text-xs text-zinc-500 flex items-center gap-1">
                        <Check className="w-4 h-4 text-emerald-500" /> Active in environment
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 6: COST SETTINGS */}
          {activeTab === 'costs' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* Cost Chart Metrics */}
                <div className="xl:col-span-2 space-y-6">
                  <h3 className="text-base font-semibold">Active Consumption Metrics</h3>

                  {/* Meter bar */}
                  {costs && (
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-zinc-400 font-medium">Monthly budget limit usage</span>
                        <span className="text-zinc-100 font-bold font-mono">
                          ${costs.monthlySpent.toFixed(2)} / ${costs.monthlyBudget.toFixed(2)}
                        </span>
                      </div>

                      <div className="w-full bg-zinc-950 h-3 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${
                            (costs.monthlySpent / costs.monthlyBudget) > 0.8 ? 'bg-rose-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.min((costs.monthlySpent / costs.monthlyBudget) * 100, 100)}%` }}
                        />
                      </div>

                      <p className="text-xs text-zinc-500">
                        {((costs.monthlySpent / costs.monthlyBudget) * 100).toFixed(0)}% of your monthly designated budget allocated has been consumed.
                      </p>
                    </div>
                  )}

                  {/* Transaction Table */}
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                    <div className="p-4 border-b border-zinc-800 bg-zinc-950/40">
                      <span className="text-sm font-semibold text-zinc-300">Detailed Transaction Feed</span>
                    </div>

                    <table className="w-full border-collapse text-left text-sm text-zinc-300">
                      <thead className="bg-zinc-950 border-b border-zinc-800 text-zinc-400 font-medium text-xs uppercase tracking-wider font-mono">
                        <tr>
                          <th className="p-4">Timestamp</th>
                          <th className="p-4">Target Agent</th>
                          <th className="p-4 text-right">Tokens In / Out</th>
                          <th className="p-4 text-right">Net Cost</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/50">
                        {costs?.transactions.map((tx, i) => (
                          <tr key={i} className="hover:bg-zinc-800/30">
                            <td className="p-4 text-zinc-400 font-mono text-xs">{tx.date}</td>
                            <td className="p-4 font-semibold text-zinc-200">{tx.cli}</td>
                            <td className="p-4 text-right font-mono text-zinc-400 text-xs">
                              {tx.promptTokens.toLocaleString()} / {tx.completionTokens.toLocaleString()}
                            </td>
                            <td className="p-4 text-right font-mono text-emerald-400 font-semibold">
                              ${tx.cost.toFixed(4)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Update limit form */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 h-fit space-y-4">
                  <div>
                    <h3 className="text-base font-semibold">Adjust Token Budget</h3>
                    <p className="text-xs text-zinc-400 mt-1">Set maximum monthly threshold allowances</p>
                  </div>

                  <form onSubmit={handleUpdateBudget} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-zinc-400">Monthly Target Budget ($ USD)</label>
                      <input 
                        type="number" 
                        step="0.01"
                        required
                        value={budgetInput}
                        onChange={e => setBudgetInput(e.target.value)}
                        placeholder="e.g. 100.00"
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 font-mono"
                      />
                    </div>

                    <button 
                      type="submit"
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-sm font-semibold rounded-lg text-white"
                    >
                      Save Budget Configuration
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
