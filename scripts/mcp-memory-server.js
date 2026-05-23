#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');

const MEMORIES_FILE = path.join(os.homedir(), '.ai_memories.json');
const ANTIGRAVITY_ROOT = '/home/ubuntu/projects/antigravity';

// Helper to log debug info safely to a file (since stdout is reserved for JSON-RPC!)
const logFile = path.join(os.homedir(), '.hermes/mcp-memory-server.log');
function log(msg) {
  try {
    fs.appendFileSync(logFile, `[${new Date().toISOString()}] ${msg}\n`, 'utf-8');
  } catch (e) {}
}

// Ensure log directory exists
try {
  fs.mkdirSync(path.dirname(logFile), { recursive: true });
} catch (e) {}

log("Starting GravityOS MCP Memory Server...");

// Sync utilities matching GravityOS's Next.js API
function syncMemoriesToProjectFile(namespace, docs) {
  try {
    const projectPath = path.join(ANTIGRAVITY_ROOT, namespace);
    if (!fs.existsSync(projectPath)) return;

    const hermesDir = path.join(projectPath, '.hermes');
    if (!fs.existsSync(hermesDir)) {
      fs.mkdirSync(hermesDir, { recursive: true });
    }

    const memoriesMdPath = path.join(hermesDir, 'memories.md');
    
    let mdContent = `# GravityOS: Vector Memories Namespace (${namespace})\n\n`;
    mdContent += `This file contains local vector embeddings and semantic context memories synchronized from GravityOS.\n`;
    mdContent += `Do NOT modify this file manually—it is automatically updated by the GravityOS Memory Daemon.\n\n`;

    if (docs.length === 0) {
      mdContent += `*No memories indexed for this namespace yet.*\n`;
    } else {
      docs.forEach((doc) => {
        mdContent += `## [${doc.category}] ${doc.title}\n`;
        mdContent += `- **Timestamp**: ${doc.timestamp}\n`;
        mdContent += `- **Token Size**: ${doc.tokens} Tokens\n`;
        mdContent += `- **Semantic Coordinates**: X: ${doc.x}, Y: ${doc.y}\n\n`;
        mdContent += `\`\`\`text\n${doc.content}\n\`\`\`\n\n`;
        mdContent += `---\n\n`;
      });
    }

    fs.writeFileSync(memoriesMdPath, mdContent, 'utf-8');
    log(`Synced namespace '${namespace}' to project memories.md.`);
  } catch (e) {
    log(`Sync error for namespace '${namespace}': ${e.message}`);
  }
}

function loadAllMemories() {
  if (!fs.existsSync(MEMORIES_FILE)) {
    return {};
  }
  try {
    return JSON.parse(fs.readFileSync(MEMORIES_FILE, 'utf-8'));
  } catch (e) {
    log(`Load error: ${e.message}`);
    return {};
  }
}

function saveAllMemories(memories) {
  try {
    fs.writeFileSync(MEMORIES_FILE, JSON.stringify(memories, null, 2));
    log("Saved memories to .ai_memories.json.");
  } catch (e) {
    log(`Save error: ${e.message}`);
  }
}

// JSON-RPC 2.0 stdio stream reader
let buffer = '';
process.stdin.on('data', (chunk) => {
  buffer += chunk.toString();
  let lineEndIndex;
  while ((lineEndIndex = buffer.indexOf('\n')) !== -1) {
    const line = buffer.slice(0, lineEndIndex).trim();
    buffer = buffer.slice(lineEndIndex + 1);
    if (line) {
      handleRequest(line);
    }
  }
});

function sendResponse(id, result, error = null) {
  const response = {
    jsonrpc: "2.0",
    id: id
  };
  if (error) {
    response.error = error;
  } else {
    response.result = result;
  }
  const jsonStr = JSON.stringify(response) + '\n';
  process.stdout.write(jsonStr);
}

function handleRequest(line) {
  try {
    log(`Received request: ${line}`);
    const req = JSON.parse(line);
    
    // Check if it's a notification (has no ID)
    const hasId = req.id !== undefined;

    switch (req.method) {
      case 'initialize':
        sendResponse(req.id, {
          protocolVersion: "2024-11-05",
          capabilities: {
            tools: {}
          },
          serverInfo: {
            name: "gravityos-mcp-memory",
            version: "1.0.0"
          }
        });
        break;

      case 'initialized':
        // No response needed for initialized notification
        log("MCP Initialised successfully.");
        break;

      case 'tools/list':
        sendResponse(req.id, {
          tools: [
            {
              name: "get_memories",
              description: "Retrieve a list of semantic memories. Optionally filter by project namespace.",
              inputSchema: {
                type: "object",
                properties: {
                  namespace: {
                    type: "string",
                    description: "Optional project namespace to filter memories (e.g., 'wicked_prints' or 'hosting')"
                  }
                }
              }
            },
            {
              name: "add_memory",
              description: "Add a new semantic context memory to a project namespace. This updates GravityOS and syncs project markdown files.",
              inputSchema: {
                type: "object",
                properties: {
                  namespace: {
                    type: "string",
                    description: "Target project namespace (e.g. 'wicked_prints' or 'hosting')"
                  },
                  category: {
                    type: "string",
                    description: "Category of the memory (e.g., 'Supplier Specs', 'SEO Copywriting', 'DevOps')"
                  },
                  title: {
                    type: "string",
                    description: "Title of the memory card"
                  },
                  content: {
                    type: "string",
                    description: "The factual context content of the memory document"
                  }
                },
                required: ["namespace", "category", "title", "content"]
              }
            },
            {
              name: "delete_memory",
              description: "Delete a semantic memory card by its ID from a specific namespace.",
              inputSchema: {
                type: "object",
                properties: {
                  namespace: {
                    type: "string",
                    description: "The namespace where the memory resides"
                  },
                  id: {
                    type: "string",
                    description: "The unique memory ID (e.g., 'wp-mem-1')"
                  }
                },
                required: ["namespace", "id"]
              }
            }
          ]
        });
        break;

      case 'tools/call':
        handleToolCall(req.id, req.params.name, req.params.arguments);
        break;

      default:
        if (hasId) {
          sendResponse(req.id, null, {
            code: -32601,
            message: `Method not found: ${req.method}`
          });
        }
    }
  } catch (e) {
    log(`Request handle error: ${e.message}`);
  }
}

function handleToolCall(id, toolName, args) {
  log(`Executing tool call: ${toolName} with args: ${JSON.stringify(args)}`);
  const memories = loadAllMemories();

  switch (toolName) {
    case 'get_memories': {
      const namespace = args.namespace;
      let textOutput = '';
      
      if (namespace) {
        const docs = memories[namespace] || [];
        textOutput = `--- GravityOS Memory Namespace: ${namespace} ---\n`;
        if (docs.length === 0) {
          textOutput += 'No memories indexed in this namespace.\n';
        } else {
          docs.forEach(doc => {
            textOutput += `[${doc.category}] ${doc.title} (${doc.id})\n${doc.content}\n\n`;
          });
        }
      } else {
        textOutput = '--- GravityOS All Memory Namespaces ---\n';
        const keys = Object.keys(memories);
        if (keys.length === 0) {
          textOutput += 'No namespaces initialized.\n';
        } else {
          keys.forEach(k => {
            textOutput += `\nNamespace: ${k}\n`;
            memories[k].forEach(doc => {
              textOutput += `  - [${doc.category}] ${doc.title} (${doc.id})\n`;
            });
          });
        }
      }

      sendResponse(id, {
        content: [
          {
            type: "text",
            text: textOutput
          }
        ]
      });
      break;
    }

    case 'add_memory': {
      const { namespace, category, title, content } = args;
      if (!memories[namespace]) {
        memories[namespace] = [];
      }

      const newId = `${namespace.slice(0, 3)}-mem-${Date.now().toString().slice(-4)}`;
      
      // Compute mock coordinates and token count
      const x = Math.floor(Math.random() * 160) - 80;
      const y = Math.floor(Math.random() * 160) - 80;
      const tokens = Math.ceil(content.split(/\s+/).length * 1.3);

      const newDoc = {
        id: newId,
        category,
        title,
        content,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        tokens,
        x,
        y
      };

      memories[namespace].push(newDoc);
      saveAllMemories(memories);
      syncMemoriesToProjectFile(namespace, memories[namespace]);

      sendResponse(id, {
        content: [
          {
            type: "text",
            text: `✓ Memory successfully registered and indexed!\nID: ${newId}\nNamespace: ${namespace}\nCoordinates: X: ${x}, Y: ${y}\nFile synchronised in local workspace.`
          }
        ]
      });
      break;
    }

    case 'delete_memory': {
      const { namespace, id: docId } = args;
      if (!memories[namespace]) {
        sendResponse(id, null, { code: -32602, message: `Namespace '${namespace}' does not exist.` });
        break;
      }

      const originalLength = memories[namespace].length;
      memories[namespace] = memories[namespace].filter(doc => doc.id !== docId);
      
      if (memories[namespace].length === originalLength) {
        sendResponse(id, null, { code: -32000, message: `Memory ID '${docId}' not found in namespace '${namespace}'.` });
        break;
      }

      saveAllMemories(memories);
      syncMemoriesToProjectFile(namespace, memories[namespace]);

      sendResponse(id, {
        content: [
          {
            type: "text",
            text: `✓ Memory card '${docId}' successfully deleted from namespace '${namespace}'. Local markdown files updated.`
          }
        ]
      });
      break;
    }

    default:
      sendResponse(id, null, { code: -32601, message: `Unknown tool: ${toolName}` });
  }
}
