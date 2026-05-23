'use client';

import React, { useState, useEffect } from 'react';
import {
  Server, Cpu, BookOpen, DollarSign, RefreshCw,
  ArrowDownToLine, Globe, Users, Terminal, CheckCircle2,
  XCircle, AlertCircle, PlusCircle, ArrowUpRight, Check, Send,
  FolderOpen, Folder, Code2, Layers, ShieldCheck, UserPlus, Settings,
  ArrowLeft, ArrowRight, RotateCw, Lock, X, Minus, Square
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
  hasHermesPlans: boolean;
  hasHermesSkills: boolean;
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

interface HermesSettingsData {
  model: string;
  provider: string;
  personality: string;
  maxTurns: number;
  terminalBackend: string;
  toolsets: string[];
  memoryEnabled: boolean;
  compressionEnabled: boolean;
  delegation: { maxConcurrent: number; maxDepth: number };
  approvals: string;
  secretRedaction: boolean;
  sttProvider: string;
  ttsProvider: string;
  messagingPlatforms: string[];
  reasoning: string;
}

interface ProjectSettings {
  project: string;
  path: string;
  scripts: Record<string, string>;
  engine?: string;
  dependencies?: string[];
}

interface GoogleOAuthData {
  email?: string;
  project_id?: string;
  is_connected: boolean;
}

interface CliSettingsData {
  hermes: HermesSettingsData;
  projects: ProjectSettings[];
  oauth: GoogleOAuthData;
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

  // Active Agent Service panel state
  const [activeAgentTab, setActiveAgentTab] = useState<'hermes' | 'openclaw' | null>(null);
  const [servicesRunning, setServicesRunning] = useState<Record<string, boolean>>({ hermes: false, openclaw: false });
  const [iframeKey, setIframeKey] = useState(0);

  // Hermes Agent dashboard startup configuration states
  const [hermesPort, setHermesPort] = useState('9119');
  const [hermesHost, setHermesHost] = useState('127.0.0.1');
  const [hermesTui, setHermesTui] = useState(false);
  const [hermesSkipBuild, setHermesSkipBuild] = useState(true);
  const [hermesInsecure, setHermesInsecure] = useState(false);
  const [isStartingHermes, setIsStartingHermes] = useState(false);
  const [hermesConfirmedAlive, setHermesConfirmedAlive] = useState(false);
  const [checkingHermesLiveness, setCheckingHermesLiveness] = useState(false);

  // CLI Settings panel state
  const [cliSettings, setCliSettings] = useState<CliSettingsData | null>(null);
  const [cliSettingsLoading, setCliSettingsLoading] = useState(false);

  // Google OAuth states for Gemini Integration
  const [oauthAuthUrl, setOauthAuthUrl] = useState('');
  const [oauthVerifier, setOauthVerifier] = useState('');
  const [oauthState, setOauthState] = useState('');
  const [pastedCode, setPastedCode] = useState('');
  const [customProjectId, setCustomProjectId] = useState('');
  const [oauthLoading, setOauthLoading] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // New Advisor Form State
  const [newAdvisorName, setNewAdvisorName] = useState('');
  const [newAdvisorRole, setNewAdvisorRole] = useState('');
  const [newAdvisorSpecialty, setNewAdvisorSpecialty] = useState('');
  const [newAdvisorMessage, setNewAdvisorMessage] = useState('');

  // Memory Documents visualization state
  interface MemoryDoc {
    id: string;
    category: string;
    title: string;
    content: string;
    timestamp: string;
    tokens: number;
    x: number;
    y: number;
  }
  const [memoryDocs, setMemoryDocs] = useState<MemoryDoc[]>([]);
  const [selectedMemoryNode, setSelectedMemoryNode] = useState<MemoryDoc | null>(null);
  const [memorySearchQuery, setMemorySearchQuery] = useState('');

  // Add Memory states
  const [newMemCategory, setNewMemCategory] = useState('');
  const [newMemTitle, setNewMemTitle] = useState('');
  const [newMemContent, setNewMemContent] = useState('');

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Forms & Actions states
  const [newCliName, setNewCliName] = useState('');
  const [newCliCmd, setNewCliCmd] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [budgetInput, setBudgetInput] = useState('');
  const [statusMessage, setStatusMessage] = useState({ text: '', type: 'info' });
  const [logs, setLogs] = useState<string[]>(['[System Initialization] GravityOS Control Dashboard loaded successfully.']);

  // Project bootstrap / creation states
  const [showBootstrapModal, setShowBootstrapModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectSpec, setNewProjectSpec] = useState('');
  const [newProjectArchType, setNewProjectArchType] = useState('Standalone SPA');
  const [newProjectTechDev, setNewProjectTechDev] = useState('');
  const [newProjectTechProd, setNewProjectTechProd] = useState('');
  const [bootstrapLoading, setBootstrapLoading] = useState(false);
  const [lastBootstrappedProject, setLastBootstrappedProject] = useState<{
    name: string;
    spec: string;
    archType: string;
    techDev: string;
    techProd: string;
  } | null>(null);
  const [showKickoffInstructions, setShowKickoffInstructions] = useState(false);

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

      // CLI Settings
      fetchCliSettings();

      // Memories
      const targetNamespace = projectsData.activeProject || activeProject;
      const memRes = await fetch(`/api/memory?namespace=${targetNamespace}`);
      const memData = await memRes.json();
      if (memData.success) {
        setMemoryDocs(memData.memories);
        if (memData.memories.length > 0) {
          setSelectedMemoryNode(memData.memories[0]);
        } else {
          setSelectedMemoryNode(null);
        }
      }

      // Service statuses
      try {
        const servicesRes = await fetch('/api/services');
        const servicesData = await servicesRes.json();
        if (servicesData.success && servicesData.services) {
          setServicesRunning(servicesData.services);
          if (servicesData.hermes) {
            setHermesHost(servicesData.hermes.host);
            setHermesPort(servicesData.hermes.port);
          }
        }
      } catch (serviceErr) {
        // Ignore service checks if off-network
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

  useEffect(() => {
    let pollInterval: NodeJS.Timeout;
    if (isStartingHermes && !servicesRunning.hermes) {
      let attempts = 0;
      pollInterval = setInterval(async () => {
        attempts++;
        try {
          const res = await fetch('/api/services');
          const data = await res.json();
          if (data.success && data.services) {
            setServicesRunning(data.services);
            if (data.hermes) {
              setHermesHost(data.hermes.host);
              setHermesPort(data.hermes.port);
            }
            if (data.services.hermes) {
              setIsStartingHermes(false);
              clearInterval(pollInterval);
              showStatus('Hermes dashboard service started successfully.', 'success');
              addLog('Hermes dashboard verified active.');
            }
          }
        } catch (err) {
          // Ignore connection errors during boot
        }

        if (attempts >= 12) { // 18 seconds timeout
          setIsStartingHermes(false);
          clearInterval(pollInterval);
          showStatus('Hermes service start timed out. Please check if the port is already in use.', 'error');
          addLog('Hermes dashboard startup timed out.');
        }
      }, 1500);
    }
    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [isStartingHermes, servicesRunning.hermes]);

  // Periodic HEAD-based liveness check — keeps the UI in sync even when
  // the service is toggled externally (systemctl, cron, etc.)
  useEffect(() => {
    let interval: NodeJS.Timeout;
    const ping = async () => {
      const alive = await checkHermesLiveness();
      setHermesConfirmedAlive(alive);
      // Sync the servicesRunning state too so side-panel badges stay correct
      setServicesRunning(prev => {
        if (prev.hermes !== alive) {
          return { ...prev, hermes: alive };
        }
        return prev;
      });
    };
    // Initial ping on mount + every 8 seconds
    ping();
    interval = setInterval(ping, 8000);
    return () => clearInterval(interval);
  }, [hermesPort, hermesHost]);

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

  // Bootstrap Hermes Configurations
  const handleBootstrapHermes = async (projectName: string) => {
    addLog(`Bootstrapping Hermes system configurations inside ${projectName}...`);
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activeProject: projectName, action: 'bootstrap' })
      });
      const data = await res.json();
      if (data.success) {
        showStatus(data.message, 'success');
        addLog(`Successfully configured ${projectName} for Hermes AI environment.`);
        fetchData();
      } else {
        showStatus(`Failed to bootstrap: ${data.error}`, 'error');
      }
    } catch (e: any) {
      showStatus('Failed to connect to bootstrapping API pipeline', 'error');
    }
  };

  // Fetch CLI detailed settings
  const fetchCliSettings = async () => {
    setCliSettingsLoading(true);
    try {
      const res = await fetch('/api/cli-settings');
      const data = await res.json();
      if (data.success) {
        setCliSettings(data);
        if (data.oauth?.project_id) {
          setCustomProjectId(data.oauth.project_id);
        }
      }
    } catch (e: any) {
      addLog(`Error fetching CLI settings: ${e.message}`);
    } finally {
      setCliSettingsLoading(false);
    }
  };

  const handleGenerateAuthUrl = async () => {
    setOauthLoading(true);
    addLog('Generating Google OAuth authorisation URL...');
    try {
      const res = await fetch('/api/cli-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate-auth-url' })
      });
      const data = await res.json();
      if (data.success) {
        setOauthAuthUrl(data.auth_url);
        setOauthVerifier(data.verifier);
        setOauthState(data.state);
        setShowAuthModal(true);
        addLog('Google OAuth authorisation URL generated successfully.');
        showStatus('Google OAuth URL generated.', 'success');
      } else {
        showStatus(`Failed to generate URL: ${data.error}`, 'error');
        addLog(`Error generating OAuth URL: ${data.error}`);
      }
    } catch (e: any) {
      showStatus('Network error generating OAuth URL', 'error');
      addLog(`Network error generating OAuth URL: ${e.message}`);
    } finally {
      setOauthLoading(false);
    }
  };

  const handleExchangeCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pastedCode.trim()) return;
    setOauthLoading(true);
    addLog('Exchanging code for Google credentials...');
    try {
      const res = await fetch('/api/cli-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'exchange-code',
          code: pastedCode.trim(),
          verifier: oauthVerifier,
          state: oauthState
        })
      });
      const data = await res.json();
      if (data.success) {
        showStatus('Google Account connected successfully!', 'success');
        addLog(`Successfully connected Google Account: ${data.email}`);
        setShowAuthModal(false);
        setPastedCode('');
        fetchCliSettings();
      } else {
        showStatus(`Authentication failed: ${data.error}`, 'error');
        addLog(`Authentication error: ${data.error}`);
      }
    } catch (e: any) {
      showStatus('Network error during authentication exchange', 'error');
      addLog(`Network error during authentication exchange: ${e.message}`);
    } finally {
      setOauthLoading(false);
    }
  };

  const handleUpdateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setOauthLoading(true);
    addLog(`Saving customised Google Cloud Project ID: ${customProjectId}...`);
    try {
      const res = await fetch('/api/cli-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update-project',
          project_id: customProjectId.trim()
        })
      });
      const data = await res.json();
      if (data.success) {
        showStatus('Google Cloud Project ID updated successfully.', 'success');
        addLog(`Google Cloud Project ID set to: ${customProjectId}`);
        fetchCliSettings();
      } else {
        showStatus(`Failed to update project ID: ${data.error}`, 'error');
        addLog(`Error updating project ID: ${data.error}`);
      }
    } catch (e: any) {
      showStatus('Network error updating project ID', 'error');
      addLog(`Network error updating project ID: ${e.message}`);
    } finally {
      setOauthLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect your Google Account?')) return;
    setOauthLoading(true);
    addLog('Disconnecting Google Account...');
    try {
      const res = await fetch('/api/cli-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'disconnect' })
      });
      const data = await res.json();
      if (data.success) {
        showStatus('Google Account disconnected.', 'success');
        addLog('Google Account credentials removed.');
        setCustomProjectId('');
        fetchCliSettings();
      } else {
        showStatus(`Failed to disconnect: ${data.error}`, 'error');
        addLog(`Error disconnecting Google Account: ${data.error}`);
      }
    } catch (e: any) {
      showStatus('Network error disconnecting Google Account', 'error');
      addLog(`Network error disconnecting Google Account: ${e.message}`);
    } finally {
      setOauthLoading(false);
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

  // Pools for automatic randomized advisor names
  const FIRST_NAMES = ['Aiden', 'Sophia', 'Dominic', 'Elena', 'Liam', 'Zoe', 'Chloe', 'Victor', 'Amelia', 'Devon', 'Leila', 'Julian', 'Fiona', 'Gavin', 'Nora', 'Zachary', 'Isabella', 'Xavier'];
  const LAST_NAMES = ['Vance', 'Jenkins', 'Rostova', 'O\'Connor', 'Chen', 'Rodriguez', 'Blackwood', 'Sterling', 'Hargreaves', 'Mercer', 'Hawthorne', 'Sinclair', 'Brooks', 'Donovan', 'Mendoza'];

  const handleToggleAddAdvisorForm = () => {
    const nextVal = !showAddAdvisorForm;
    setShowAddAdvisorForm(nextVal);
    if (nextVal) {
      const randFirst = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
      const randLast = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
      setNewAdvisorName(`${randFirst} ${randLast}`);
    }
  };

  const handleSuggestSpecialties = async (role: string) => {
    if (!role) return;
    addLog(`Querying AI for specialties suggestions for role '${role}'...`);
    try {
      const res = await fetch(`/api/advisors/suggest?role=${encodeURIComponent(role)}`);
      const data = await res.json();
      if (data.success) {
        setNewAdvisorSpecialty(data.specialties);
        setNewAdvisorMessage(data.message);
        addLog(`AI suggestions retrieved successfully (Source: ${data.source}).`);
      }
    } catch (e: any) {
      addLog(`Error loading AI suggestions: ${e.message}`);
    }
  };

  const handleQueryMemories = async (queryStr: string) => {
    setMemorySearchQuery(queryStr);
    try {
      const res = await fetch(`/api/memory?namespace=${activeProject}&query=${encodeURIComponent(queryStr)}`);
      const data = await res.json();
      if (data.success) {
        setMemoryDocs(data.memories);
      }
    } catch (e: any) {
      addLog(`Error querying memories: ${e.message}`);
    }
  };

  const handleInsertMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemCategory || !newMemTitle || !newMemContent) return;

    addLog(`Injecting new memory document into '${activeProject}' namespace...`);
    try {
      const res = await fetch('/api/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          namespace: activeProject,
          category: newMemCategory,
          title: newMemTitle,
          content: newMemContent
        })
      });
      const data = await res.json();
      if (data.success) {
        setMemoryDocs(data.memories);
        setSelectedMemoryNode(data.memory);
        setNewMemCategory('');
        setNewMemTitle('');
        setNewMemContent('');
        showStatus('New memory embedded successfully!', 'success');
        addLog(`Embedded document '${newMemTitle}' cleanly.`);
      } else {
        showStatus(`Failed to add memory: ${data.error}`, 'error');
      }
    } catch (e: any) {
      showStatus('Network error during memory injection', 'error');
    }
  };

  const checkHermesLiveness = async () => {
    // Hermes dashboard doesn't support HEAD, so use a minimal GET with Range header
    // to verify liveness without pulling the full page
    const url = `http://${hermesHost}:${hermesPort}/env`;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(url, {
        method: 'GET',
        headers: { 'Range': 'bytes=0-0' },
        signal: controller.signal
      });
      clearTimeout(timeout);
      return res.ok || res.status === 206;
    } catch {
      return false;
    }
  };

  const handleToggleService = async (service: 'hermes' | 'openclaw', action: 'start' | 'stop', options?: any) => {
    addLog(`Sending request to ${action} background service: ${service}...`);
    if (service === 'hermes' && action === 'start') {
      setIsStartingHermes(true);
    }
    if (service === 'hermes' && action === 'stop') {
      // Optimistic update — flip immediately so the UI doesn't lag
      setServicesRunning(prev => ({ ...prev, hermes: false }));
      setHermesConfirmedAlive(false);
    }
    try {
      const res = await fetch('/api/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service, action, options })
      });
      const data = await res.json();
      if (data.success) {
        showStatus(data.message, 'success');
        addLog(`Service action triggered: ${action} ${service}.`);
        if (service === 'hermes' && action === 'stop') {
          // Verify with a real HEAD request that it actually went down
          setCheckingHermesLiveness(true);
          const alive = await checkHermesLiveness();
          setHermesConfirmedAlive(alive);
          setServicesRunning(prev => ({ ...prev, hermes: alive }));
          setCheckingHermesLiveness(false);
        } else {
          setTimeout(fetchData, 2000);
        }
      } else {
        showStatus(`Failed to toggle service: ${data.error}`, 'error');
        if (service === 'hermes' && action === 'start') {
          setIsStartingHermes(false);
        }
        if (service === 'hermes' && action === 'stop') {
          // Rollback optimistic update on failure
          setServicesRunning(prev => ({ ...prev, hermes: true }));
        }
      }
    } catch (e: any) {
      showStatus('Network error toggling daemon services', 'error');
      if (service === 'hermes' && action === 'start') {
        setIsStartingHermes(false);
      }
      if (service === 'hermes' && action === 'stop') {
        // Rollback optimistic update on network error
        setServicesRunning(prev => ({ ...prev, hermes: true }));
      }
    }
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

  // Create and Bootstrap Project Action
  const handleCreateAndBootstrapProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    setBootstrapLoading(true);
    addLog(`Creating and bootstrapping new project: ${newProjectName}...`);
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          projectName: newProjectName.trim(),
          projectSpec: newProjectSpec.trim(),
          projectArchType: newProjectArchType,
          techStackDev: newProjectTechDev.trim(),
          techStackProd: newProjectTechProd.trim()
        })
      });
      const data = await res.json();
      if (data.success) {
        showStatus(data.message, 'success');
        addLog(`Successfully bootstrapped '${newProjectName}'. active project set.`);

        // Save details for kickoff dialog
        setLastBootstrappedProject({
          name: newProjectName.trim(),
          spec: newProjectSpec.trim(),
          archType: newProjectArchType,
          techDev: newProjectTechDev.trim(),
          techProd: newProjectTechProd.trim()
        });

        // Reset form inputs
        setNewProjectName('');
        setNewProjectSpec('');
        setNewProjectArchType('Standalone SPA');
        setNewProjectTechDev('');
        setNewProjectTechProd('');

        setShowBootstrapModal(false);
        setShowKickoffInstructions(true);

        // Reload project files data
        fetchData();
      } else {
        showStatus(`Failed to create project: ${data.error}`, 'error');
        addLog(`Error creating project: ${data.error}`);
      }
    } catch (error: any) {
      showStatus('Network error creating project', 'error');
      addLog(`Network error creating project: ${error.message}`);
    } finally {
      setBootstrapLoading(false);
    }
  };

  // Kickoff advisory chat planning discussion
  const handleKickoffAdvisoryChat = async () => {
    if (!lastBootstrappedProject) return;

    setSelectedAdvisorId('marcus'); // Default to Marcus (Ideas Man)

    // Construct pre-crafted humanlike kickoff prompt complying with formatting constraints
    const kickoffPrompt = `I have successfully bootstrapped a new project: "${lastBootstrappedProject.name}".
I need the advisory team to begin planning this project.
Here is the project specification:
${lastBootstrappedProject.spec || 'Not specified'}

Architecture type preference:
${lastBootstrappedProject.archType || 'Not specified'}

Development tech stack preference:
${lastBootstrappedProject.techDev || 'Not specified'}

Production tech stack preference:
${lastBootstrappedProject.techProd || 'Not specified'}

Please begin the initial advisory discussion, outline our features scope, and details of how we should structure this workspace.`;

    setShowKickoffInstructions(false);
    setActiveTab('overview'); // Chat is in overview dashboard

    // Update local chat feed optimistically
    const userMsg = { sender: 'You', text: kickoffPrompt, time: 'Just now' };
    setChatHistory(prev => [...prev, userMsg]);
    setChatHistory(prev => [...prev, { sender: 'Marcus (Ideas Man)', text: 'Thinking (Querying Antigravity OAuth)...', time: 'Just now' }]);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          advisorId: 'marcus',
          message: kickoffPrompt,
          activeProject: lastBootstrappedProject.name
        })
      });
      const data = await res.json();
      if (data.success) {
        setChatHistory(prev => {
          const nextHistory = [...prev];
          const idx = nextHistory.findIndex(m => m.sender === 'Marcus (Ideas Man)' && m.text.includes('Thinking'));
          if (idx !== -1) {
            nextHistory[idx] = {
              sender: 'Marcus (Ideas Man)',
              text: data.response,
              time: `Synced via ${data.source}`
            };
          }
          return nextHistory;
        });
      }
    } catch (e: any) {
      showStatus('Failed to send kickoff chat to advisory team', 'error');
    }
  };

  // Persona Interactive Panel
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg = { sender: 'You', text: chatInput, time: 'Just now' };
    setChatHistory(prev => [...prev, userMsg]);
    const prompt = chatInput;
    setChatInput('');

    const activeAdvisor = advisors.find(a => a.id === selectedAdvisorId);
    if (!activeAdvisor) return;

    // Loader bubble to show Antigravity is thinking
    setChatHistory(prev => [...prev, { sender: activeAdvisor.name, text: 'Thinking (Querying Antigravity OAuth)...', time: 'Just now' }]);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          advisorId: selectedAdvisorId,
          message: prompt,
          activeProject: activeProject
        })
      });
      const data = await res.json();
      if (data.success) {
        // Replace thinking message with real response
        setChatHistory(prev => {
          const nextHistory = [...prev];
          const idx = nextHistory.findIndex(m => m.sender === activeAdvisor.name && m.text.includes('Thinking'));
          if (idx !== -1) {
            nextHistory[idx] = {
              sender: activeAdvisor.name,
              text: data.response,
              time: `Synced via ${data.source}`
            };
          }
          return nextHistory;
        });
        addLog(`Response compiled by ${activeAdvisor.name} via ${data.source}.`);
      }
    } catch (err: any) {
      setChatHistory(prev => {
        const nextHistory = [...prev];
        const idx = nextHistory.findIndex(m => m.sender === activeAdvisor.name && m.text.includes('Thinking'));
        if (idx !== -1) {
          nextHistory[idx] = {
            sender: activeAdvisor.name,
            text: 'System connection error. Please make sure your start-dashboard.sh process is active.',
            time: 'Failed'
          };
        }
        return nextHistory;
      });
    }
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

        {/* AGENTS SECTION */}
        {(clis.hermes?.installed || clis.openclaw?.installed) && (
          <>
            <div className="pt-2 border-t border-zinc-800/80 px-4 pb-1">
              <span className="text-[9px] font-bold text-zinc-500 tracking-wider uppercase font-mono">Agents</span>
            </div>
            <div className="px-4 space-y-2 pb-4">
              {clis.hermes?.installed && (
                <button
                  onClick={() => { setActiveTab('overview'); setActiveAgentTab(activeAgentTab === 'hermes' ? null : 'hermes'); }}
                  className={`flex items-center justify-center w-full py-2.5 rounded-lg border text-sm font-bold font-mono tracking-wider transition-all cursor-pointer ${activeAgentTab === 'hermes'
                      ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 shadow-md shadow-amber-500/5'
                      : 'bg-zinc-900/50 text-zinc-400 border-zinc-800 hover:text-amber-400 hover:border-amber-500/30'
                    }`}
                >
                  HERMES-AGENT
                </button>
              )}
              {clis.openclaw?.installed && (
                <button
                  onClick={() => { setActiveTab('overview'); setActiveAgentTab(activeAgentTab === 'openclaw' ? null : 'openclaw'); }}
                  className={`flex items-center justify-center w-full py-2.5 rounded-lg border text-sm font-bold font-mono tracking-wider transition-all cursor-pointer ${activeAgentTab === 'openclaw'
                      ? 'bg-rose-500/20 text-rose-400 border-rose-500/40 shadow-md shadow-rose-500/5'
                      : 'bg-zinc-900/50 text-zinc-400 border-zinc-800 hover:text-rose-400 hover:border-rose-500/30'
                    }`}
                >
                  OPENCLAW
                </button>
              )}
            </div>
          </>
        )}

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
      <main className={`flex-1 flex flex-col h-screen ${activeAgentTab === 'hermes' ? 'overflow-hidden' : 'overflow-y-auto'}`}>
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
          <div className={`mx-8 mt-6 p-4 rounded-lg flex items-center gap-3 border ${statusMessage.type === 'success' ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-400' :
              statusMessage.type === 'error' ? 'bg-rose-950/30 border-rose-500/30 text-rose-400' :
                'bg-zinc-900/80 border-zinc-700 text-zinc-300'
            }`}>
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm font-medium">{statusMessage.text}</span>
          </div>
        )}

        <div className={`flex-1 ${activeAgentTab === 'hermes' ? 'p-6 flex flex-col overflow-hidden h-[calc(100vh-70px)]' : 'p-8 space-y-8'}`}>
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            activeAgentTab === 'hermes' ? (
              <div className="flex-grow flex flex-col rounded-xl border border-zinc-800 bg-zinc-950 overflow-hidden shadow-2xl">
                {/* Mock Browser Title/Tab Bar */}
                <div className="flex items-center justify-between bg-zinc-950 px-4 py-2 border-b border-zinc-900 select-none">
                  {/* Tabs */}
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 border border-zinc-800/80 rounded-t-lg text-xs font-medium text-zinc-200">
                      <Cpu className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                      <span>Hermes Agent - Dashboard</span>
                      <button
                        onClick={() => setActiveAgentTab(null)}
                        className="ml-2 hover:bg-zinc-800 p-0.5 rounded-full text-zinc-500 hover:text-zinc-300 transition-colors"
                        title="Close tab"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Window Controls */}
                  <div className="flex items-center gap-2.5">
                    <button className="text-zinc-600 hover:text-zinc-400 transition-colors" title="Minimise">
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <button className="text-zinc-600 hover:text-zinc-400 transition-colors" title="Maximise">
                      <Square className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => setActiveAgentTab(null)}
                      className="text-zinc-600 hover:text-rose-500 transition-colors"
                      title="Close window"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Mock Browser Bar */}
                <div className="flex items-center gap-3 bg-zinc-900 px-4 py-2 border-b border-zinc-800 select-none">
                  {/* Browser Controls */}
                  <div className="flex items-center gap-2">
                    <button
                      className="p-1 hover:bg-zinc-800/50 rounded text-zinc-600 cursor-not-allowed transition-colors"
                      title="Back"
                      disabled
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                    <button
                      className="p-1 hover:bg-zinc-800/50 rounded text-zinc-600 cursor-not-allowed transition-colors"
                      title="Forward"
                      disabled
                    >
                      <ArrowRight className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setIframeKey(k => k + 1)}
                      className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-zinc-200 transition-colors"
                      title="Reload page"
                    >
                      <RotateCw className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Address Bar URL Box */}
                  <div className="flex-grow flex items-center gap-2 bg-zinc-950 border border-zinc-800 rounded-md px-3 py-1 text-xs text-zinc-400">
                    <Lock className={`w-3.5 h-3.5 ${hermesConfirmedAlive ? 'text-emerald-500' : 'text-zinc-600'}`} />
                    <span className="text-zinc-300 font-mono">
                      {hermesConfirmedAlive ? `http://${hermesHost}:${hermesPort}/env` : `http://${hermesHost}:${hermesPort}/configure`}
                    </span>
                    {checkingHermesLiveness && (
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse ml-auto" title="Checking liveness..." />
                    )}
                  </div>

                  {servicesRunning.hermes && (
                    <button
                      onClick={() => handleToggleService('hermes', 'stop')}
                      className="flex items-center gap-1.5 px-3 py-1 bg-red-950/20 border border-red-500/30 hover:bg-red-950/40 text-red-400 hover:text-red-300 rounded text-[10px] font-bold font-mono uppercase tracking-wider transition-all cursor-pointer select-none"
                      title="Stop dashboard service"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                      Stop Service
                    </button>
                  )}

                  {!hermesConfirmedAlive && !isStartingHermes && (
                    <button
                      onClick={() => handleToggleService('hermes', 'start')}
                      className="flex items-center gap-1.5 px-3 py-1 bg-emerald-950/20 border border-emerald-500/30 hover:bg-emerald-950/40 text-emerald-400 hover:text-emerald-300 rounded text-[10px] font-bold font-mono uppercase tracking-wider transition-all cursor-pointer select-none"
                      title="Start dashboard service"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Start Service
                    </button>
                  )}
                </div>

                {/* Mock Browser Body */}
                {hermesConfirmedAlive ? (
                  <iframe
                    key={iframeKey}
                    src={`http://${hermesHost}:${hermesPort}/env`}
                    className="w-full flex-grow bg-zinc-950 border-none"
                    title="Hermes Agent Live Dashboard"
                  />
                ) : (
                  <div className="flex-grow flex items-center justify-center bg-zinc-950 p-6 overflow-y-auto">
                    <div className="w-full max-w-md bg-zinc-900/60 backdrop-blur-md border border-zinc-800 rounded-xl p-8 shadow-2xl relative overflow-hidden">
                      {/* Ambient background glows */}
                      <div className="absolute -top-10 -left-10 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
                      <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

                      {isStartingHermes ? (
                        <div className="flex flex-col items-center justify-center py-12 space-y-6">
                          <div className="relative">
                            <div className="w-16 h-16 rounded-full border-4 border-amber-500/20 border-t-amber-500 animate-spin" />
                            <Cpu className="w-6 h-6 text-amber-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                          </div>
                          <div className="text-center space-y-2">
                            <h4 className="text-sm font-bold text-zinc-200 uppercase tracking-wider font-mono">
                              Initialising Hermes Dashboard
                            </h4>
                            <p className="text-[11px] text-zinc-500 font-mono">
                              Starting service daemon on {hermesHost}:{hermesPort}...
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-6">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-amber-950/30 border border-amber-500/30 rounded-lg text-amber-500">
                              <Cpu className="w-6 h-6 animate-pulse" />
                            </div>
                            <div>
                              <h4 className="text-sm font-bold text-zinc-100 uppercase tracking-wider font-mono">
                                Hermes Dashboard Setup
                              </h4>
                              <p className="text-[11px] text-zinc-500 font-mono">
                                Configure and launch the background web dashboard
                              </p>
                            </div>
                          </div>

                          <hr className="border-zinc-800/80" />

                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-1.5">
                                <label className="text-[10px] text-zinc-400 font-semibold font-mono uppercase tracking-wider block">
                                  Network Host
                                </label>
                                <input
                                  type="text"
                                  value={hermesHost}
                                  onChange={e => setHermesHost(e.target.value)}
                                  placeholder="127.0.0.1"
                                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-amber-500/50 rounded-lg px-3 py-2 text-xs text-white focus:outline-none transition-all font-mono"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-[10px] text-zinc-400 font-semibold font-mono uppercase tracking-wider block">
                                  Port Number
                                </label>
                                <input
                                  type="number"
                                  value={hermesPort}
                                  onChange={e => setHermesPort(e.target.value)}
                                  placeholder="9119"
                                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-amber-500/50 rounded-lg px-3 py-2 text-xs text-white focus:outline-none transition-all font-mono"
                                />
                              </div>
                            </div>

                            <div className="space-y-2 pt-2">
                              <label className="text-[10px] text-zinc-400 font-semibold font-mono uppercase tracking-wider block">
                                Startup Options
                              </label>

                              <div className="space-y-2">
                                <label className="flex items-start gap-2.5 p-2.5 bg-zinc-950/40 border border-zinc-800/80 rounded-lg hover:border-zinc-700/80 transition-all cursor-pointer select-none">
                                  <input
                                    type="checkbox"
                                    checked={hermesSkipBuild}
                                    onChange={e => setHermesSkipBuild(e.target.checked)}
                                    className="mt-0.5 rounded border-zinc-800 text-amber-500 focus:ring-amber-500 focus:ring-offset-zinc-900 bg-zinc-950"
                                  />
                                  <div>
                                    <span className="text-[11px] font-medium text-zinc-200 block leading-tight font-mono">
                                      Skip Build Step
                                    </span>
                                    <span className="text-[9px] text-zinc-500 block font-mono mt-0.5">
                                      Recommended for faster boot. Serves the pre-built web interface directly.
                                    </span>
                                  </div>
                                </label>

                                <label className="flex items-start gap-2.5 p-2.5 bg-zinc-950/40 border border-zinc-800/80 rounded-lg hover:border-zinc-700/80 transition-all cursor-pointer select-none">
                                  <input
                                    type="checkbox"
                                    checked={hermesTui}
                                    onChange={e => setHermesTui(e.target.checked)}
                                    className="mt-0.5 rounded border-zinc-800 text-amber-500 focus:ring-amber-500 focus:ring-offset-zinc-900 bg-zinc-950"
                                  />
                                  <div>
                                    <span className="text-[11px] font-medium text-zinc-200 block leading-tight font-mono">
                                      Enable Chat (TUI) Tab
                                    </span>
                                    <span className="text-[9px] text-zinc-500 block font-mono mt-0.5">
                                      Embeds the interactive hermes terminal chat view within the dashboard.
                                    </span>
                                  </div>
                                </label>

                                <label className="flex items-start gap-2.5 p-2.5 bg-zinc-950/40 border border-zinc-800/80 rounded-lg hover:border-zinc-700/80 transition-all cursor-pointer select-none">
                                  <input
                                    type="checkbox"
                                    checked={hermesInsecure}
                                    onChange={e => setHermesInsecure(e.target.checked)}
                                    className="mt-0.5 rounded border-zinc-800 text-amber-500 focus:ring-amber-500 focus:ring-offset-zinc-900 bg-zinc-950"
                                  />
                                  <div>
                                    <span className="text-[11px] font-medium text-zinc-200 block leading-tight font-mono">
                                      Insecure Network Mode
                                    </span>
                                    <span className="text-[9px] text-zinc-500/80 block font-mono mt-0.5 text-amber-500/80">
                                      Allows binding to non-localhost addresses (exposes keys to the local network).
                                    </span>
                                  </div>
                                </label>
                              </div>
                            </div>
                          </div>

                          <div className="pt-2">
                            <button
                              onClick={() => handleToggleService('hermes', 'start', {
                                port: parseInt(hermesPort) || 9119,
                                host: hermesHost || '127.0.0.1',
                                tui: hermesTui,
                                skipBuild: hermesSkipBuild,
                                insecure: hermesInsecure
                              })}
                              className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs uppercase tracking-wider rounded-lg transition-all shadow-lg hover:shadow-amber-500/10 font-mono active:scale-[0.98] cursor-pointer"
                            >
                              🚀 Launch Dashboard Service
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-8">
                {/* AGENT BACKGROUND SERVICE CONTROL CARD */}
                {activeAgentTab && (
                  <div className="bg-zinc-900 border border-rose-500/30 p-6 rounded-xl space-y-4 shadow-xl transition-all">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <Cpu className="w-6 h-6 animate-pulse text-rose-400" />
                        <div>
                          <h3 className="text-base font-bold uppercase tracking-wider font-mono">
                            OpenClaw Agent Service Core
                          </h3>
                          <p className="text-xs text-zinc-500 font-mono">WSL background daemon system status</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-mono font-bold px-3 py-1 rounded-full border ${servicesRunning[activeAgentTab]
                            ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-400'
                            : 'bg-zinc-950 border-zinc-800 text-zinc-500'
                          }`}>
                          <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${servicesRunning[activeAgentTab] ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-600'
                            }`} />
                          {servicesRunning[activeAgentTab] ? 'Active Daemon Running' : 'Inactive Service'}
                        </span>
                      </div>
                    </div>

                    <div className="bg-zinc-950 p-4 rounded-lg border border-zinc-800 text-xs text-zinc-300 leading-relaxed font-mono">
                      <p>
                        The OpenClaw daemon routes remote, secure API calls to local visual and code-review suites, utilising your WSL framework and bridging remote tasks to your local code tree.
                      </p>
                    </div>

                    <div className="flex gap-3">
                      {!servicesRunning[activeAgentTab] ? (
                        <button
                          onClick={() => handleToggleService(activeAgentTab, 'start')}
                          className="px-6 py-2 bg-rose-400 hover:bg-rose-300 text-xs font-bold font-mono uppercase tracking-wider rounded-lg text-zinc-950 transition-all cursor-pointer"
                        >
                          🚀 Start Service
                        </button>
                      ) : (
                        <button
                          onClick={() => handleToggleService(activeAgentTab, 'stop')}
                          className="px-6 py-2 bg-zinc-800 hover:bg-zinc-700 text-xs font-bold font-mono uppercase tracking-wider rounded-lg text-white transition-all cursor-pointer border border-zinc-700"
                        >
                          🛑 Stop Service
                        </button>
                      )}
                      <button
                        onClick={() => setActiveAgentTab(null)}
                        className="px-4 py-2 bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 text-xs font-bold font-mono uppercase tracking-wider rounded-lg text-zinc-400 transition-all cursor-pointer"
                      >
                        Hide Panel
                      </button>
                    </div>
                  </div>
                )}

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
                    <p className="text-xs text-zinc-500 font-mono">Budget: ${costs?.monthlyBudget.toFixed(2)}</p>
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
                          onClick={handleToggleAddAdvisorForm}
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
                          <button type="button" onClick={() => setShowAddAdvisorForm(false)} className="text-zinc-600 hover:text-zinc-400 font-bold">×</button>
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
                            type="text" required value={newAdvisorRole}
                            onChange={e => setNewAdvisorRole(e.target.value)}
                            onBlur={() => handleSuggestSpecialties(newAdvisorRole)}
                            placeholder="e.g. Print on Demand Advisor (Blur to fetch AI ideas)"
                            className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-xs text-white focus:outline-none"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] text-zinc-500 font-semibold font-mono">Specialty Specialties</label>
                          <input
                            type="text" value={newAdvisorSpecialty} onChange={e => setNewAdvisorSpecialty(e.target.value)}
                            placeholder="Suggested specialties (loaded from AI)"
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
                          className={`flex items-start gap-3 w-full p-3 rounded-lg border text-left transition-all ${selectedAdvisorId === advisor.id
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
            )
          )}

          {/* TAB 2: PROJECTS SECTION */}
          {activeTab === 'projects' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* Projects List Panel */}
                <div className="xl:col-span-2 space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-base font-semibold">Workspace Projects (/home/ubuntu/projects/antigravity)</h3>
                    <button
                      onClick={() => setShowBootstrapModal(true)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold rounded-lg text-white transition-all font-mono flex items-center gap-1.5 shadow-lg shadow-emerald-600/10"
                    >
                      <PlusCircle className="w-4 h-4" /> Bootstrap Project
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    {projects.map((proj) => (
                      <div
                        key={proj.name}
                        className={`bg-zinc-900 border rounded-xl p-6 flex flex-col md:flex-row justify-between md:items-center gap-6 transition-all ${activeProject === proj.name ? 'border-emerald-500 bg-emerald-950/5' : 'border-zinc-800 hover:border-zinc-700'
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

                          {/* Hermes Configuration Status & Bootstrapping */}
                          <div className="flex items-center gap-2 mt-1 text-xs font-mono">
                            <span className="text-zinc-500">Hermes:</span>
                            {proj.hasAgentsMd && proj.hasHermesPlans && proj.hasHermesSkills && proj.hasCursorrules ? (
                              <span className="text-emerald-400 flex items-center gap-1 bg-emerald-950/20 px-2 py-0.5 rounded border border-emerald-500/20 text-[10px] font-bold">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Configured
                              </span>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className="text-amber-500 flex items-center gap-1 bg-amber-950/20 px-2 py-0.5 rounded border border-amber-500/20 text-[10px] font-bold">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Unmapped
                                </span>
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleBootstrapHermes(proj.name); }}
                                  className="text-[10px] text-emerald-400 hover:text-emerald-300 hover:underline font-bold"
                                >
                                  ⚡ Bootstrap Hermes
                                </button>
                              </div>
                            )}
                          </div>

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
                              <span className="text-[8px] text-zinc-500 font-mono uppercase font-mono">.cursorrules</span>
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
                          <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-semibold border ${cli.installed ? 'bg-emerald-950/20 border-emerald-500/20 text-emerald-400' : 'bg-rose-950/20 border-rose-500/20 text-rose-400'
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

              {/* CLI DETAILED SETTINGS SUB-PANEL */}
              <div className="border-t border-zinc-800 pt-8 space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-semibold flex items-center gap-2">
                      <Settings className="w-4 h-4 text-emerald-400" /> Detailed CLI Settings
                    </h3>
                    <p className="text-xs text-zinc-400 mt-1">Live configuration from config.yaml and project package.json files</p>
                  </div>
                  <button
                    onClick={fetchCliSettings}
                    disabled={cliSettingsLoading}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold rounded-lg text-white disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${cliSettingsLoading ? 'animate-spin' : ''}`} /> Refresh
                  </button>
                </div>

                {!cliSettings ? (
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center text-zinc-500 text-sm">
                    <RefreshCw className="w-6 h-6 mx-auto animate-spin text-emerald-500 mb-2" />
                    <p>Loading configuration files...</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* HERMES CONFIG SECTION */}
                    <div>
                      <h4 className="text-sm font-semibold text-emerald-400 mb-3 flex items-center gap-2">
                        <Terminal className="w-4 h-4" /> Hermes Agent Configuration
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                          <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Model</span>
                          <p className="text-sm text-zinc-200 font-mono mt-1">{cliSettings.hermes.model}</p>
                          <p className="text-[10px] text-zinc-500 font-mono">{cliSettings.hermes.provider}</p>
                        </div>
                        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                          <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Personality</span>
                          <p className="text-sm text-zinc-200 font-mono mt-1 capitalize">{cliSettings.hermes.personality}</p>
                          <p className="text-[10px] text-zinc-500 font-mono">Reasoning: {cliSettings.hermes.reasoning}</p>
                        </div>
                        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                          <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Max Turns</span>
                          <p className="text-sm text-zinc-200 font-mono mt-1">{cliSettings.hermes.maxTurns}</p>
                          <p className="text-[10px] text-zinc-500 font-mono">Terminal: {cliSettings.hermes.terminalBackend}</p>
                        </div>
                        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                          <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Security</span>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`w-2 h-2 rounded-full ${cliSettings.hermes.secretRedaction ? 'bg-emerald-500' : 'bg-zinc-600'}`} />
                            <p className="text-sm text-zinc-200 font-mono">Secret Redaction</p>
                          </div>
                          <p className="text-[10px] text-zinc-500 font-mono mt-1">Approvals: {cliSettings.hermes.approvals}</p>
                        </div>
                        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                          <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Memory & Compression</span>
                          <div className="space-y-1 mt-1">
                            <div className="flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full ${cliSettings.hermes.memoryEnabled ? 'bg-emerald-500' : 'bg-zinc-600'}`} />
                              <p className="text-xs text-zinc-300 font-mono">Memory</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full ${cliSettings.hermes.compressionEnabled ? 'bg-emerald-500' : 'bg-zinc-600'}`} />
                              <p className="text-xs text-zinc-300 font-mono">Compression</p>
                            </div>
                          </div>
                        </div>
                        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                          <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Voice & Speech</span>
                          <p className="text-sm text-zinc-200 font-mono mt-1">STT: {cliSettings.hermes.sttProvider}</p>
                          <p className="text-[10px] text-zinc-500 font-mono">TTS: {cliSettings.hermes.ttsProvider}</p>
                        </div>
                        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                          <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Delegation</span>
                          <p className="text-sm text-zinc-200 font-mono mt-1">{cliSettings.hermes.delegation.maxConcurrent} concurrent</p>
                          <p className="text-[10px] text-zinc-500 font-mono">Depth: {cliSettings.hermes.delegation.maxDepth}</p>
                        </div>
                        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                          <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Messaging</span>
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {cliSettings.hermes.messagingPlatforms.length > 0 ? (
                              cliSettings.hermes.messagingPlatforms.map(p => (
                                <span key={p} className="bg-emerald-950/30 border border-emerald-500/20 text-emerald-400 text-[10px] px-2 py-0.5 rounded-full font-semibold font-mono">{p}</span>
                              ))
                            ) : (
                              <span className="text-xs text-zinc-500">None configured</span>
                            )}
                          </div>
                        </div>
                        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                          <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Active Toolsets</span>
                          <p className="text-sm text-zinc-200 font-mono mt-1">{cliSettings.hermes.toolsets.length} enabled</p>
                          <div className="flex flex-wrap gap-1 mt-1.5 max-h-16 overflow-y-auto">
                            {cliSettings.hermes.toolsets.slice(0, 8).map(t => (
                              <span key={t} className="bg-zinc-800 text-zinc-400 text-[9px] px-1.5 py-0.5 rounded font-mono">{t}</span>
                            ))}
                            {cliSettings.hermes.toolsets.length > 8 && (
                              <span className="text-[9px] text-zinc-500 font-mono">+{cliSettings.hermes.toolsets.length - 8} more</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* GOOGLE GEMINI INTEGRATION SECTION */}
                    <div>
                      <h4 className="text-sm font-semibold text-emerald-400 mb-3 flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4" /> Google Gemini Integration
                      </h4>
                      <div className="bg-zinc-900/60 backdrop-blur-md border border-zinc-800 rounded-xl p-6 shadow-xl relative overflow-hidden">
                        {/* Ambient background glows */}
                        <div className="absolute -top-10 -left-10 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
                        <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <div className={`w-2.5 h-2.5 rounded-full ${cliSettings.oauth?.is_connected ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-600'}`} />
                              <span className="text-sm font-bold text-zinc-200">
                                {cliSettings.oauth?.is_connected ? 'Connected to Google Account' : 'Google Account Not Connected'}
                              </span>
                            </div>
                            {cliSettings.oauth?.is_connected ? (
                              <div className="space-y-1">
                                <p className="text-xs text-zinc-400">
                                  Authenticated as: <strong className="text-zinc-200 font-mono">{cliSettings.oauth.email}</strong>
                                </p>
                                <p className="text-[11px] text-zinc-500 font-mono">
                                  GCP Project ID: <strong className="text-emerald-400">{cliSettings.oauth.project_id || 'Not Set'}</strong>
                                </p>
                              </div>
                            ) : (
                              <p className="text-xs text-zinc-400 max-w-xl leading-relaxed">
                                Connect and authorise your Google Account to utilise your Gemini OAuth plan. This helps avoid API rate limits by routeing queries through your personal billing setup. You will need a Google Cloud Project ID to route these queries, which you can create or retrieve from the{' '}
                                <a
                                  href="https://console.cloud.google.com"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-emerald-400 hover:underline"
                                >
                                  Google Cloud Console
                                </a>.
                              </p>
                            )}
                          </div>

                          <div className="flex flex-wrap gap-3">
                            {cliSettings.oauth?.is_connected ? (
                              <button
                                onClick={handleDisconnect}
                                disabled={oauthLoading}
                                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 hover:text-red-400 border border-zinc-700 hover:border-red-500/30 text-zinc-300 text-xs font-semibold rounded-lg transition-all active:scale-[0.98]"
                              >
                                Disconnect Account
                              </button>
                            ) : (
                              <button
                                onClick={handleGenerateAuthUrl}
                                disabled={oauthLoading}
                                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-zinc-100 text-xs font-bold uppercase tracking-wider rounded-lg shadow-lg hover:shadow-emerald-500/10 transition-all active:scale-[0.98]"
                              >
                                {oauthLoading ? 'Generating...' : 'Connect Google Account'}
                              </button>
                            )}
                          </div>
                        </div>

                        {cliSettings.oauth?.is_connected && (
                          <div className="mt-6 pt-6 border-t border-zinc-800/80 relative z-10">
                            <form onSubmit={handleUpdateProject} className="max-w-md space-y-3">
                              <label className="text-[10px] text-zinc-400 font-semibold font-mono uppercase tracking-wider block">
                                Google Cloud Project ID
                              </label>
                              <p className="text-[11px] text-zinc-400 leading-relaxed">
                                Google Cloud requires a Project ID to route Gemini API queries. You can find your existing Project ID or create a new project free of charge in the{' '}
                                <a
                                  href="https://console.cloud.google.com"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-emerald-400 hover:underline"
                                >
                                  Google Cloud Console
                                </a>.
                              </p>
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={customProjectId}
                                  onChange={e => setCustomProjectId(e.target.value)}
                                  placeholder="e.g. my-gemini-project-123"
                                  disabled={oauthLoading}
                                  className="flex-1 bg-zinc-950 border border-zinc-800 focus:border-emerald-500/50 rounded-lg px-3 py-2 text-xs text-white focus:outline-none transition-all font-mono"
                                />
                                <button
                                  type="submit"
                                  disabled={oauthLoading}
                                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-zinc-100 text-xs font-bold rounded-lg transition-all active:scale-[0.98]"
                                >
                                  Update Project
                                </button>
                              </div>
                              <p className="text-[10px] text-zinc-500 font-mono">
                                Updates target project settings across both google_oauth.json and local environment files.
                              </p>
                            </form>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* PROJECT CLI SCRIPTS SECTION */}
                    <div>
                      <h4 className="text-sm font-semibold text-emerald-400 mb-3 flex items-center gap-2">
                        <FolderOpen className="w-4 h-4" /> Project npm Scripts
                      </h4>
                      <div className="space-y-3">
                        {cliSettings.projects.map((proj) => (
                          <div key={proj.project} className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                            <div className="bg-zinc-950 px-4 py-3 flex items-center justify-between border-b border-zinc-800">
                              <div className="flex items-center gap-2">
                                <Folder className="w-4 h-4 text-zinc-500" />
                                <h5 className="text-sm font-semibold text-zinc-200">{proj.project}</h5>
                              </div>
                              <div className="flex items-center gap-2">
                                {proj.engine && (
                                  <span className="text-[10px] text-zinc-500 font-mono bg-zinc-900 px-2 py-0.5 rounded">Node {proj.engine}</span>
                                )}
                                <span className="text-[10px] text-zinc-500 font-mono">{Object.keys(proj.scripts).length} scripts</span>
                              </div>
                            </div>
                            <div className="p-4">
                              <div className="space-y-2">
                                {Object.entries(proj.scripts).map(([name, cmd]) => (
                                  <div key={name} className="flex items-start gap-3 group">
                                    <span className="bg-emerald-950/30 border border-emerald-500/20 text-emerald-400 text-[10px] px-2 py-0.5 rounded font-bold font-mono w-16 text-center flex-shrink-0 mt-0.5">npm run</span>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm text-zinc-100 font-mono font-medium">{name}</p>
                                      <p className="text-xs text-zinc-500 font-mono truncate mt-0.5">{cmd}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
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
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${mem.installed ? 'bg-emerald-950/20 border-emerald-500/20 text-emerald-400' : 'bg-rose-950/20 border-rose-500/20 text-rose-400'
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

              {/* VECTORS SPATIAL CANVAS VISUALIZER */}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* Latent Space Canvas Panel */}
                <div className="xl:col-span-2 bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-base font-semibold flex items-center gap-2">
                        <Layers className="w-5 h-5 text-emerald-500" /> Latent Vector Spatial Canvas
                      </h3>
                      <p className="text-xs text-zinc-400 mt-0.5">2D dimensional reduction projection (t-SNE) of namespace: <span className="font-mono text-emerald-400">{activeProject}</span></p>
                    </div>

                    <div className="relative">
                      <input
                        type="text"
                        value={memorySearchQuery}
                        onChange={e => handleQueryMemories(e.target.value)}
                        placeholder="Search semantic memory..."
                        className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 w-48 font-mono"
                      />
                    </div>
                  </div>

                  {/* SVG Canvas Map */}
                  <div className="bg-zinc-950 border border-zinc-800 rounded-lg h-96 relative overflow-hidden flex items-center justify-center">
                    {/* Background Radar Grid */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-3/4 h-3/4 rounded-full border border-zinc-800/20 border-dashed animate-pulse" />
                      <div className="w-1/2 h-1/2 rounded-full border border-zinc-800/20 border-dashed" />
                      <div className="w-1/4 h-1/4 rounded-full border border-zinc-800/20 border-dashed" />

                      {/* Grid Axes */}
                      <div className="absolute inset-x-0 h-px bg-zinc-900/60" />
                      <div className="absolute inset-y-0 w-px bg-zinc-900/60" />
                    </div>

                    {memoryDocs.length === 0 ? (
                      <div className="text-center text-zinc-600 text-xs z-10 space-y-2">
                        <AlertCircle className="w-6 h-6 mx-auto text-zinc-700" />
                        <p>No active memory clusters indexed in {activeProject} namespace.</p>
                      </div>
                    ) : (
                      <svg className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing z-10">
                        {/* Define glowing marker filters */}
                        <defs>
                          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                            <feGaussianBlur stdDeviation="3" result="blur" />
                            <feComposite in="SourceGraphic" in2="blur" operator="over" />
                          </filter>
                        </defs>

                        {/* Semantic Connection Links (Edges) */}
                        {memoryDocs.map((doc, idx) => {
                          const nextDoc = memoryDocs[(idx + 1) % memoryDocs.length];
                          if (memoryDocs.length < 2) return null;
                          const x1 = 250 + doc.x * 2.2;
                          const y1 = 180 + doc.y * 1.5;
                          const x2 = 250 + nextDoc.x * 2.2;
                          const y2 = 180 + nextDoc.y * 1.5;
                          return (
                            <line
                              key={`edge-${idx}`}
                              x1={x1} y1={y1} x2={x2} y2={y2}
                              className="stroke-zinc-800/50 stroke-[1.5] stroke-dasharray-[4]"
                              strokeDasharray="4 4"
                            />
                          );
                        })}

                        {/* Memory Nodes */}
                        {memoryDocs.map((doc) => {
                          const svgX = 250 + doc.x * 2.2;
                          const svgY = 180 + doc.y * 1.5;
                          const isSelected = selectedMemoryNode?.id === doc.id;

                          return (
                            <g
                              key={doc.id}
                              transform={`translate(${svgX}, ${svgY})`}
                              className="group cursor-pointer"
                              onClick={() => setSelectedMemoryNode(doc)}
                            >
                              {/* Glowing background ring for selected node */}
                              {isSelected && (
                                <circle
                                  r="16"
                                  className="fill-emerald-500/10 stroke-emerald-500/40 stroke-2 animate-ping"
                                />
                              )}
                              <circle
                                r={isSelected ? "8" : "6"}
                                className={`stroke-[2.5] transition-all ${isSelected
                                    ? 'fill-emerald-400 stroke-emerald-500'
                                    : 'fill-zinc-900 stroke-zinc-700 hover:fill-emerald-600/30 hover:stroke-emerald-500'
                                  }`}
                              />

                              {/* Category tooltip label */}
                              <text
                                y="-12"
                                textAnchor="middle"
                                className="fill-zinc-500 text-[8px] font-bold font-mono opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none uppercase"
                              >
                                {doc.category}
                              </text>
                            </g>
                          );
                        })}
                      </svg>
                    )}
                  </div>
                </div>

                {/* Deep Inspector Panel */}
                <div className="space-y-6">
                  <h3 className="text-base font-semibold">Deep Memory Inspector</h3>

                  {selectedMemoryNode ? (
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-5">
                      <div className="space-y-1">
                        <div className="flex justify-between items-start">
                          <span className="bg-emerald-950/40 border border-emerald-500/20 text-emerald-400 text-[9px] px-2.5 py-0.5 rounded font-bold font-mono uppercase">
                            {selectedMemoryNode.category}
                          </span>
                          <span className="text-[10px] text-zinc-500 font-mono">{selectedMemoryNode.timestamp}</span>
                        </div>
                        <h4 className="font-bold text-zinc-100 text-sm mt-1">{selectedMemoryNode.title}</h4>
                      </div>

                      <div className="bg-zinc-950 p-4 rounded-lg border border-zinc-800 text-xs text-zinc-300 leading-relaxed font-mono">
                        {selectedMemoryNode.content}
                      </div>

                      {/* Token Details */}
                      <div className="flex justify-between items-center text-xs font-mono border-b border-zinc-800/60 pb-3">
                        <span className="text-zinc-500">Vector Token Size:</span>
                        <span className="text-zinc-300 font-bold bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800">{selectedMemoryNode.tokens} Tokens</span>
                      </div>

                      {/* Simulated 1536-Dimension Vector Float Sequence */}
                      <div className="space-y-2 font-mono text-[10px]">
                        <span className="text-zinc-500 block uppercase font-bold text-[9px]">1536-Dimensional Float Coordinates:</span>
                        <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800 text-zinc-400 break-all leading-normal text-[10px]">
                          [
                          {(() => {
                            const hash = selectedMemoryNode.id.charCodeAt(5) || 55;
                            const coords = [];
                            for (let i = 0; i < 8; i++) {
                              coords.push(((Math.sin(hash + i) * 0.15)).toFixed(4));
                            }
                            return coords.join(', ');
                          })()}
                          , ... 1528 more dimensions truncated]
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center text-zinc-500 text-sm">
                      <AlertCircle className="w-8 h-8 mx-auto text-zinc-700 mb-2" />
                      Select a latent vector node from the t-SNE spatial canvas to query its context embeddings.
                    </div>
                  )}

                  {/* Inject New Memory Card */}
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
                    <div>
                      <h4 className="text-sm font-semibold text-zinc-100 flex items-center gap-1.5">
                        <PlusCircle className="w-4 h-4 text-emerald-400" /> Inject Custom Memory
                      </h4>
                      <p className="text-[10px] text-zinc-500 font-mono mt-0.5">Write a direct, semantic fact to namespace: <span className="text-emerald-500 font-bold">{activeProject}</span></p>
                    </div>

                    <form onSubmit={handleInsertMemory} className="space-y-3 font-mono text-xs">
                      <div className="space-y-1">
                        <label className="text-[10px] text-zinc-500 font-semibold uppercase">Memory Title</label>
                        <input
                          type="text" required value={newMemTitle} onChange={e => setNewMemTitle(e.target.value)}
                          placeholder="e.g. Shipping rates config"
                          className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-zinc-500 font-semibold uppercase">Category</label>
                        <input
                          type="text" required value={newMemCategory} onChange={e => setNewMemCategory(e.target.value)}
                          placeholder="e.g. Supplier Specs"
                          className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-zinc-500 font-semibold uppercase">Memory Context Content</label>
                        <textarea
                          rows={3} required value={newMemContent} onChange={e => setNewMemContent(e.target.value)}
                          placeholder="Type factual specifications, variables, or keys to embed permanently..."
                          className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 resize-none"
                        />
                      </div>
                      <button type="submit" className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-500 text-xs font-bold rounded text-white font-mono flex items-center justify-center gap-1.5">
                        <PlusCircle className="w-4 h-4" /> Inject Memory
                      </button>
                    </form>
                  </div>
                </div>
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
                          className={`h-full rounded-full transition-all duration-500 ${(costs.monthlySpent / costs.monthlyBudget) > 0.8 ? 'bg-rose-500' : 'bg-emerald-500'
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

      {/* GOOGLE OAUTH AUTHORISATION DIALOG */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-zinc-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden relative">
            <div className="absolute -top-10 -left-10 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/40 relative z-10">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-500" />
                <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-wider font-mono">
                  Google Gemini Authorisation
                </h3>
              </div>
              <button
                onClick={() => { setShowAuthModal(false); setPastedCode(''); }}
                className="text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 relative z-10">
              <div className="space-y-2 text-xs text-zinc-400 leading-relaxed">
                <p>
                  To complete connection, click the link below to open Google's consent screen. Sign in, grant permissions, and copy the redirected URL or code from the browser's address bar.
                </p>
                <div className="pt-2">
                  <a
                    href={oauthAuthUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-950/30 border border-emerald-500/30 hover:bg-emerald-950/50 text-emerald-400 hover:text-emerald-300 rounded-lg text-xs font-bold font-mono transition-all"
                  >
                    Open Google Consent Page <ArrowUpRight className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              <hr className="border-zinc-800/80" />

              <form onSubmit={handleExchangeCode} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-zinc-400 font-semibold font-mono uppercase tracking-wider block">
                    Authorisation Code or Callback URL
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={pastedCode}
                    onChange={e => setPastedCode(e.target.value)}
                    placeholder="Paste the redirect URL (starting with http://localhost:8085/) or the code value..."
                    className="w-full bg-zinc-950 border border-zinc-800 focus:border-emerald-500/50 rounded-lg px-3 py-2 text-xs text-white focus:outline-none transition-all font-mono resize-none"
                  />
                  <p className="text-[10px] text-zinc-500 font-mono">
                    Paste the entire URL or the code parameter to verify.
                  </p>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => { setShowAuthModal(false); setPastedCode(''); }}
                    className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold rounded-lg transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={oauthLoading || !pastedCode.trim()}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-zinc-100 text-xs font-bold uppercase tracking-wider rounded-lg transition-all disabled:opacity-50 active:scale-[0.98]"
                  >
                    {oauthLoading ? 'Verifying...' : 'Complete Connection'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* BOOTSTRAP NEW PROJECT DIALOG */}
      {showBootstrapModal && (
        <div className="fixed inset-0 bg-zinc-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden relative">
            <div className="absolute -top-10 -left-10 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/40 relative z-10">
              <div className="flex items-center gap-2">
                <Code2 className="w-5 h-5 text-emerald-500" />
                <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-wider font-mono">
                  Bootstrap New Project
                </h3>
              </div>
              <button
                onClick={() => setShowBootstrapModal(false)}
                className="text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAndBootstrapProject} className="p-6 space-y-4 relative z-10">
              <div className="space-y-1.5">
                <label className="text-[10px] text-zinc-400 font-semibold font-mono uppercase tracking-wider block">
                  Project Name
                </label>
                <input
                  type="text"
                  required
                  value={newProjectName}
                  onChange={e => setNewProjectName(e.target.value)}
                  placeholder="e.g. print-shop"
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-emerald-500/50 rounded-lg px-3 py-2 text-xs text-white focus:outline-none transition-all font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-zinc-400 font-semibold font-mono uppercase tracking-wider block">
                  Web App Architecture Type
                </label>
                <select
                  value={newProjectArchType}
                  onChange={e => setNewProjectArchType(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-emerald-500/50 rounded-lg px-3 py-2 text-xs text-white focus:outline-none transition-all font-mono"
                >
                  <option value="Standalone SPA">Standalone SPA (Client-rendered, browser-only, no backend HTML rendering)</option>
                  <option value="API-backed SPA">API-backed SPA (Client-rendered, separate server API layer)</option>
                  <option value="Pre-rendered Static Site (SSG)">Pre-rendered Static Site (SSG - Build time generated flat files)</option>
                  <option value="Hybrid / Incremental (ISR)">Hybrid / Incremental (ISR - Build time generated w/on-demand revalidation)</option>
                  <option value="">-------------------------</option>
                  <option value="Multi-Page App (MPA)">Multi-Page App (MPA - Server-rendered traditional multipage, no JS framework)</option>

                  <option value="Edge-Rendered">Edge-Rendered (Server-rendered per request close to the user at edge CDN nodes)</option>
                  <option value="Server Components">Server Components (Server + Client component-level dynamic split)</option>
                  <option value="Islands Architecture">Islands Architecture (Build-time static HTML with selective component hydration)</option>
                  <option value="Progressive Web App (PWA)">Progressive Web App (PWA - Delivery layer adding offline and installation capabilities)</option>
                  <option value="Micro-frontend">Micro-frontend (Independently deployable composeable microfrontends)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-zinc-400 font-semibold font-mono uppercase tracking-wider block">
                  Non-technical Project Specification
                </label>
                <textarea
                  rows={4}
                  required
                  value={newProjectSpec}
                  onChange={e => setNewProjectSpec(e.target.value)}
                  placeholder="Describe the product requirements, features scope, and business goals in plain English..."
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-emerald-500/50 rounded-lg px-3 py-2 text-xs text-white focus:outline-none transition-all font-mono resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-zinc-400 font-semibold font-mono uppercase tracking-wider block">
                    Tech Stack (Development)
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={newProjectTechDev}
                    onChange={e => setNewProjectTechDev(e.target.value)}
                    placeholder="e.g. Next.js, SQLite, Tailwind, local storage"
                    className="w-full bg-zinc-950 border border-zinc-800 focus:border-emerald-500/50 rounded-lg px-3 py-2 text-xs text-white focus:outline-none transition-all font-mono resize-none"
                  />
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    <span className="text-[8px] text-zinc-500 font-mono self-center">Presets:</span>
                    <button
                      type="button"
                      onClick={() => setNewProjectTechDev("Node JS with Express, React Frontend, Vite, tailwind and javascript, PostGres")}
                      className="text-[9px] bg-zinc-950 hover:bg-zinc-800 text-zinc-400 hover:text-emerald-400 px-2 py-0.5 rounded border border-zinc-800 font-mono transition-all"
                    >
                      Node, React Vite w/Docker
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewProjectTechDev("Next.js, SQLite, Tailwind CSS, TypeScript")}
                      className="text-[9px] bg-zinc-950 hover:bg-zinc-800 text-zinc-400 hover:text-emerald-400 px-2 py-0.5 rounded border border-zinc-800 font-mono transition-all"
                    >
                      Next.js & SQLite
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] text-zinc-400 font-semibold font-mono uppercase tracking-wider block">
                    Tech Stack (Production)
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={newProjectTechProd}
                    onChange={e => setNewProjectTechProd(e.target.value)}
                    placeholder="e.g. Next.js, PostgreSQL, Supabase, Vercel"
                    className="w-full bg-zinc-950 border border-zinc-800 focus:border-emerald-500/50 rounded-lg px-3 py-2 text-xs text-white focus:outline-none transition-all font-mono resize-none"
                  />
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    <span className="text-[8px] text-zinc-500 font-mono self-center">Presets:</span>
                    <button
                      type="button"
                      onClick={() => setNewProjectTechProd("Use GIT actions to deploy to VPS.")}
                      className="text-[9px] bg-zinc-950 hover:bg-zinc-800 text-zinc-400 hover:text-emerald-400 px-2 py-0.5 rounded border border-zinc-800 font-mono transition-all"
                    >
                      VPS
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewProjectTechProd("Vercel hosting for frontend, Supabase for database")}
                      className="text-[9px] bg-zinc-950 hover:bg-zinc-800 text-zinc-400 hover:text-emerald-400 px-2 py-0.5 rounded border border-zinc-800 font-mono transition-all"
                    >
                      Vercel & Supabase
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowBootstrapModal(false)}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold rounded-lg transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={bootstrapLoading || !newProjectName.trim()}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-zinc-100 text-xs font-bold uppercase tracking-wider rounded-lg transition-all disabled:opacity-50 active:scale-[0.98]"
                >
                  {bootstrapLoading ? 'Bootstrapping...' : 'Create & Bootstrap'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* KICKOFF INSTRUCTIONS DIALOG */}
      {showKickoffInstructions && lastBootstrappedProject && (
        <div className="fixed inset-0 bg-zinc-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden relative">
            <div className="absolute -top-10 -left-10 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/40 relative z-10">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-500" />
                <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-wider font-mono">
                  Advisory Kickoff: {lastBootstrappedProject.name}
                </h3>
              </div>
              <button
                onClick={() => setShowKickoffInstructions(false)}
                className="text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 relative z-10 max-h-[80vh] overflow-y-auto">
              <div className="bg-emerald-950/20 border border-emerald-500/20 rounded-lg p-4 space-y-2">
                <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider font-mono">Project Successfully Initialised</h4>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  Your new project folder <strong>/home/ubuntu/projects/antigravity/{lastBootstrappedProject.name}</strong> has been created with Hermes agents configuration (<code className="bg-zinc-950 px-1 py-0.5 rounded text-[10px]">AGENTS.md</code>, <code className="bg-zinc-950 px-1 py-0.5 rounded text-[10px]">.cursorrules</code>, and symlinked central skills). A <code className="bg-zinc-950 px-1 py-0.5 rounded text-[10px]">README.md</code> has also been pre-filled with the technical specifications.
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider font-mono">Advisory Team Guidelines</h4>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  The active workspace target has been locked to <strong>{lastBootstrappedProject.name}</strong>. You can now start consulting the OS Advisory Board:
                </p>
                <ul className="text-xs text-zinc-400 space-y-2.5 pl-4 list-disc">
                  <li><strong>Marcus (Ideas Man)</strong> is best suited for refining product scope, feature validation, and user stories.</li>
                  <li><strong>Leo (The Architect)</strong> will help map out project folders, monorepo structures, and dependencies.</li>
                  <li><strong>Maya (The Designer)</strong> will draft Tailwind design patterns, styling tokens, and mockups.</li>
                  <li><strong>Silas (Systems Integrator)</strong> will construct WSL hooks, background run scripts, and system integrations.</li>
                </ul>
              </div>

              <hr className="border-zinc-800" />

              <div className="space-y-3">
                <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider font-mono">Kickoff Discussion Prompt</h4>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Start the advisory planning by triggering a discussion. This pre-crafted message will be sent to Marcus to start drafting the product plan:
                </p>

                <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-[10px] text-zinc-400 font-mono whitespace-pre-wrap max-h-36 overflow-y-auto">
                  {`I have successfully bootstrapped a new project: "${lastBootstrappedProject.name}".
I need the advisory team to begin planning this project.
Here is the project specification:
${lastBootstrappedProject.spec || 'Not specified'}

Architecture type preference:
${lastBootstrappedProject.archType || 'Not specified'}

Development tech stack preference:
${lastBootstrappedProject.techDev || 'Not specified'}

Production tech stack preference:
${lastBootstrappedProject.techProd || 'Not specified'}

Please begin the initial advisory discussion, outline our features scope, and details of how we should structure this workspace.`}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowKickoffInstructions(false)}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold rounded-lg transition-all font-mono"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleKickoffAdvisoryChat}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-zinc-100 text-xs font-bold uppercase tracking-wider rounded-lg transition-all active:scale-[0.98] font-mono flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" /> Start Advisory Discussion
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
