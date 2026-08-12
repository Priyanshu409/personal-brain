/*
 * Local dev talks directly to the local backend. Deployed builds
 * go through an ngrok static domain tunneling to the locally-running
 * backend (no hosted backend yet, since it depends on local Ollama).
 * A static domain stays fixed across tunnel restarts, so unlike the
 * old Cloudflare quick tunnel this shouldn't need updating here.
 * Can be overridden at runtime via localStorage("apiBaseUrlOverride")
 * without a redeploy, in case the tunnel ever does change.
 */
// const NGROK_STATIC_URL = "https://muck-recall-statute.ngrok-free.dev";
// const isLocalHost = ["localhost", "127.0.0.1"].includes(window.location.hostname);
// const API_BASE_URL =
//   localStorage.getItem("apiBaseUrlOverride") ||
//   (isLocalHost ? "http://localhost:3000" : NGROK_STATIC_URL);

const RENDER_API_URL = "https://personal-brain-api.onrender.com";

const isLocalHost = ["localhost", "127.0.0.1"].includes(
  window.location.hostname
);

const API_BASE_URL =
  localStorage.getItem("apiBaseUrlOverride") ||
  (isLocalHost ? "http://localhost:3000" : RENDER_API_URL);

// Core UI Elements
const chat = document.getElementById("chat");
const input = document.getElementById("questionInput");
const sendButton = document.getElementById("sendButton");
const newChatButton = document.getElementById("newChatButton");

// Sync & Connection Elements
const syncButton = document.getElementById("syncButton");
const syncBtnText = document.getElementById("syncBtnText");
const syncStatusIndicator = document.getElementById("syncStatusIndicator");
const connectGoogleBtn = document.getElementById("connectGoogleBtn");

const backendStatusDot = document.getElementById("backendStatusDot");
const backendStatusTitle = document.getElementById("backendStatusTitle");
const backendStatusDesc = document.getElementById("backendStatusDesc");
const mobileConnectionDot = document.getElementById("mobileConnectionDot");
const headerConnectionDot = document.getElementById("headerConnectionDot");
const connectionLabel = document.getElementById("connectionLabel");

// Query Mode Elements
const modeChat = document.getElementById("modeChat");
const modeSearch = document.getElementById("modeSearch");
const currentModeTitle = document.getElementById("currentModeTitle");
const currentModeDesc = document.getElementById("currentModeDesc");

// Navigation & Toast Elements
const sidebarToggle = document.getElementById("sidebarToggle");
const sidebar = document.getElementById("sidebar");
const sidebarOverlay = document.getElementById("sidebarOverlay");
const recentQuestionsList = document.getElementById("recentQuestionsList");
const toastContainer = document.getElementById("toastContainer");

// App State
let currentMode = "chat"; // 'chat' or 'search'
let isSyncing = false;
let isMobileSidebarOpen = false;
let queryHistory = [];

/* ==========================================
   TOAST NOTIFICATION ENGINE
   ========================================== */
function showToast(message, type = "info") {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  
  let emoji = "ℹ️";
  if (type === "success") emoji = "✅";
  if (type === "error") emoji = "❌";
  
  const icon = document.createElement("span");
  icon.textContent = emoji;
  const text = document.createElement("span");
  text.textContent = message;
  toast.append(icon, text);
  toastContainer.appendChild(toast);
  
  // Remove toast after animation completes
  setTimeout(() => {
    toast.remove();
  }, 3500);
}

/* ==========================================
   BACKEND HEALTH & CONNECTION
   ========================================== */
async function checkBackendStatus() {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    if (response.ok) {
      setConnectionState(true);
    } else {
      setConnectionState(false);
    }
  } catch (error) {
    setConnectionState(false);
  }
}

function setConnectionState(isOnline) {
  const dots = [backendStatusDot, mobileConnectionDot, headerConnectionDot];
  
  if (isOnline) {
    dots.forEach(dot => {
      if (dot) {
        dot.className = "status-dot online";
        if (dot.classList.contains("connection-dot")) {
          dot.className = "connection-dot online";
        }
      }
    });
    backendStatusTitle.textContent = "Brain Online";
    backendStatusDesc.textContent = "Connected to local API";
    connectionLabel.textContent = "Local API";
  } else {
    dots.forEach(dot => {
      if (dot) {
        dot.className = "status-dot offline";
        if (dot.classList.contains("connection-dot")) {
          dot.className = "connection-dot offline";
        }
      }
    });
    backendStatusTitle.textContent = "Brain Offline";
    backendStatusDesc.textContent = "Cannot reach local API";
    connectionLabel.textContent = "Offline";
  }
}

/* ==========================================
   SYNC ENGINE (Manual & Polling)
   ========================================== */
async function checkSyncStatus() {
  try {
    const response = await fetch(`${API_BASE_URL}/brain/sync/status`);
    if (!response.ok) return;
    
    const data = await response.json();
    const syncIcon = syncButton.querySelector(".icon");
    
    if (data.running) {
      isSyncing = true;
      syncButton.disabled = true;
      syncIcon.classList.add("active");
      syncBtnText.textContent = "Syncing Brain...";
      syncStatusIndicator.classList.remove("hidden");
      
      backendStatusDot.className = "status-dot syncing";
      backendStatusDot.title = "Syncing data in background";
    } else {
      // If we transitions from syncing to idle, show toast success
      if (isSyncing) {
        showToast("Personal Brain sync completed!", "success");
      }
      isSyncing = false;
      syncButton.disabled = false;
      syncIcon.classList.remove("active");
      syncBtnText.textContent = "Sync Connected Tools";
      syncStatusIndicator.classList.add("hidden");
      
      backendStatusDot.className = "status-dot online";
      backendStatusDot.title = "Online and ready";
    }
  } catch (error) {
    console.error("Failed to query sync status:", error);
  }
}

async function triggerSync() {
  if (isSyncing) return;
  
  const syncIcon = syncButton.querySelector(".icon");
  syncButton.disabled = true;
  syncIcon.classList.add("active");
  
  try {
    const response = await fetch(`${API_BASE_URL}/brain/sync`, {
      method: "POST"
    });
    
    if (!response.ok) {
      throw new Error("Failed to start synchronization");
    }
    
    showToast("Synchronization started in background...", "success");
    await checkSyncStatus();
  } catch (error) {
    showToast(error.message || "Failed to start sync", "error");
    syncButton.disabled = false;
    syncIcon.classList.remove("active");
  }
}

/* ==========================================
   PERSISTENT SEARCH HISTORY
   ========================================= */
function loadHistory() {
  try {
    const saved = localStorage.getItem("pb_history");
    if (saved) {
      queryHistory = JSON.parse(saved);
    }
  } catch (e) {
    queryHistory = [];
  }
  renderHistory();
}

function saveToHistory(question) {
  question = question.trim();
  if (!question) return;
  
  // Filter out duplicates
  queryHistory = queryHistory.filter(q => q.toLowerCase() !== question.toLowerCase());
  
  // Insert at top
  queryHistory.unshift(question);
  
  // Limit to 6 items
  if (queryHistory.length > 6) {
    queryHistory.pop();
  }
  
  try {
    localStorage.setItem("pb_history", JSON.stringify(queryHistory));
  } catch (e) {}
  
  renderHistory();
}

function renderHistory() {
  if (!recentQuestionsList) return;
  recentQuestionsList.innerHTML = "";
  
  if (queryHistory.length === 0) {
    recentQuestionsList.innerHTML = `<div class="no-history">No queries yet</div>`;
    return;
  }
  
  queryHistory.forEach(q => {
    const item = document.createElement("button");
    item.className = "recent-item";
    item.title = q;
    item.textContent = q;
    item.addEventListener("click", () => {
      // Re-trigger question
      if (isMobileSidebarOpen) {
        closeMobileSidebar();
      }
      input.value = q;
      askBrain(q);
    });
    recentQuestionsList.appendChild(item);
  });
}

/* ==========================================
   QUERY MODE SELECTION
   ========================================== */
function toggleMode(mode) {
  currentMode = mode;
  
  if (mode === "chat") {
    modeChat.classList.add("active");
    modeSearch.classList.remove("active");
    currentModeTitle.textContent = "Ask your Personal Brain";
    currentModeDesc.textContent = "Search your Gmail and Google Drive using natural language.";
    input.placeholder = "Ask your Personal Brain...";
  } else {
    modeChat.classList.remove("active");
    modeSearch.classList.add("active");
    currentModeTitle.textContent = "Direct Semantic Search";
    currentModeDesc.textContent = "Retrieve raw documents matched semantically from your connected indexes.";
    input.placeholder = "Search documents for words, keywords, names...";
  }
  input.focus();
}

/* ==========================================
   INPUT SUBMIT & CONVERSATION LOGIC
   ========================================== */
/*
 * The backend has no timeout on /brain/ask and
 * /brain/search — local CPU-only LLM inference on
 * multi-source answers has been observed taking up
 * to ~3 minutes. Give it real headroom rather than
 * aborting a request that's still legitimately working.
 */
const ASK_TIMEOUT_MS = 8 * 60 * 1000;

async function askBrain(question) {
  question = question.trim();
  if (!question) return;

  addUserMessage(question);
  input.value = "";
  resizeInput();
  removeWelcome();

  const loadingMessage = addLoadingMessage(currentMode);
  sendButton.disabled = true;

  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    ASK_TIMEOUT_MS
  );

  try {
    if (currentMode === "chat") {
      // AI Chat mode
      const url = `${API_BASE_URL}/brain/ask?q=${encodeURIComponent(question)}`;
      const response = await fetch(url, { signal: controller.signal });

      if (!response.ok) {
        throw new Error(await getErrorMessage(response));
      }

      const data = await response.json();
      loadingMessage.remove();

      addAssistantMessage(data.answer, data.sources ?? []);
      saveToHistory(question);
    } else {
      // Direct Search mode
      const url = `${API_BASE_URL}/brain/search?q=${encodeURIComponent(question)}`;
      const response = await fetch(url, { signal: controller.signal });

      if (!response.ok) {
        throw new Error(await getErrorMessage(response));
      }

      const data = await response.json();
      loadingMessage.remove();

      // The search response returns { query, result: { query, count, results: [...] } }
      const results = (data.result && data.result.results) ? data.result.results : (data.results ?? []);
      addSearchResultsMessage(results, question);
      saveToHistory(question);
    }
  } catch (error) {
    loadingMessage.remove();
    const message = error.name === "AbortError"
      ? "The brain is taking much longer than usual (local model inference may be under heavy load). Please try again in a moment."
      : (error.message || "Something went wrong. Please check connection.");
    addErrorMessage(message);
    showToast(message, "error");
  } finally {
    clearTimeout(timeoutId);
    sendButton.disabled = false;
    input.focus();
  }
}

async function getErrorMessage(response) {
  try {
    const errorData = await response.json();
    return errorData.error || "Failed to fetch response from Brain API";
  } catch (e) {
    return `Server returned error (${response.status})`;
  }
}

/* ==========================================
   DOM MANIPULATION (MESSAGES & CARD RENDERING)
   ========================================== */
function addUserMessage(text) {
  const wrapper = document.createElement("div");
  wrapper.className = "message-wrapper user";
  
  const avatar = document.createElement("div");
  avatar.className = "avatar";
  avatar.textContent = "👤";
  
  const container = document.createElement("div");
  container.className = "message-container";
  
  const content = document.createElement("div");
  content.className = "message-content";
  content.textContent = text;
  
  container.appendChild(content);
  wrapper.appendChild(avatar);
  wrapper.appendChild(container);
  
  chat.appendChild(wrapper);
  scrollToBottom();
}

function addAssistantMessage(answer, sources) {
  const wrapper = document.createElement("div");
  wrapper.className = "message-wrapper assistant";
  
  const avatar = document.createElement("div");
  avatar.className = "avatar";
  avatar.textContent = "🧠";
  
  const container = document.createElement("div");
  container.className = "message-container";
  
  const content = document.createElement("div");
  content.className = "message-content";
  content.innerHTML = formatAnswer(answer);
  
  if (Array.isArray(sources) && sources.length > 0) {
    addSources(content, sources);
  }
  
  container.appendChild(content);
  wrapper.appendChild(avatar);
  wrapper.appendChild(container);
  
  chat.appendChild(wrapper);
  
  // Attach Copy Code click listeners in formatting wrapper
  attachCopyCodeListeners(content);
  
  scrollToBottom();
}

function addSearchResultsMessage(results, question) {
  const wrapper = document.createElement("div");
  wrapper.className = "message-wrapper assistant";
  
  const avatar = document.createElement("div");
  avatar.className = "avatar";
  avatar.textContent = "🧠";
  
  const container = document.createElement("div");
  container.className = "message-container";
  
  const content = document.createElement("div");
  content.className = "message-content";
  
  let html = `<div><strong>Semantic Search Results for:</strong> <em>"${escapeHtml(question)}"</em></div>`;
  
  if (!Array.isArray(results) || results.length === 0) {
    html += `<div style="margin-top: 12px; color: var(--text-secondary); font-style: italic;">No relevant documents matched this query. Try synchronizing or editing documents.</div>`;
  } else {
    html += `<div class="search-results-container">`;
    results.forEach(result => {
      const scorePercent = Math.round(Number(result.score) * 100);
      const badgeClass = result.source === "gmail" ? "gmail" : (result.source === "drive" ? "drive" : (result.source === "slack" ? "slack" : "unknown"));
      const title = result.title || "Untitled File";
      const snippet = escapeHtml(result.content || "").substring(0, 320) + "...";
      
      html += `
        <div class="search-result-card">
          <div class="search-result-header">
            <span class="search-result-title">${escapeHtml(title)}</span>
            <div class="source-score-container">
              <span class="source-type-pill ${badgeClass}">${result.source}</span>
              <span class="source-score-badge">${scorePercent}% Match</span>
            </div>
          </div>
          <div class="search-result-snippet">${snippet}</div>
        </div>
      `;
    });
    html += `</div>`;
  }
  
  content.innerHTML = html;
  container.appendChild(content);
  wrapper.appendChild(avatar);
  wrapper.appendChild(container);
  
  chat.appendChild(wrapper);
  scrollToBottom();
}

function addSources(container, sources) {
  const sourcesContainer = document.createElement("div");
  sourcesContainer.className = "sources";
  
  const title = document.createElement("div");
  title.className = "sources-title";
  title.textContent = "Retrieved Sources";
  sourcesContainer.appendChild(title);
  
  sources.forEach(source => {
    const card = document.createElement("div");
    card.className = "source-card";
    
    const details = document.createElement("div");
    details.className = "source-details";
    
    const name = document.createElement("div");
    name.className = "source-name";
    name.textContent = source.title ?? "Untitled Document";
    
    const meta = document.createElement("div");
    meta.className = "source-meta";
    
    const typeClass = source.source === "gmail" ? "gmail" : (source.source === "drive" ? "drive" : (source.source === "slack" ? "slack" : "unknown"));
    const sourceLabel = source.source ? source.source.toUpperCase() : "UNKNOWN";
    
    meta.innerHTML = `<span class="source-type-pill ${typeClass}">${sourceLabel}</span>`;
    
    details.appendChild(name);
    details.appendChild(meta);
    
    const scoreContainer = document.createElement("div");
    scoreContainer.className = "source-score-container";
    
    const scoreVal = Number(source.score);
    const scorePercent = Math.round(scoreVal * 100);
    
    scoreContainer.innerHTML = `<span class="source-score-badge">${scorePercent}% Match</span>`;
    
    card.appendChild(details);
    card.appendChild(scoreContainer);
    
    sourcesContainer.appendChild(card);
  });
  
  container.appendChild(sourcesContainer);
}

const LOADING_STAGES = [
  { afterSeconds: 0, chat: "Brain is analyzing files...", search: "Searching your documents..." },
  { afterSeconds: 8, chat: "Still thinking — reasoning across sources...", search: "Still searching — this can take a moment..." },
  { afterSeconds: 20, chat: "Generating your answer with the local model (can take a while on CPU)...", search: "Ranking matches..." },
  { afterSeconds: 45, chat: "Still working — local inference is slower without a GPU, hang tight...", search: "Still working — hang tight..." },
  { afterSeconds: 90, chat: "Still generating — cross-source answers can take a couple minutes on CPU...", search: "Still working — hang tight..." },
  { afterSeconds: 150, chat: "Almost there — this is an unusually long one, thanks for your patience...", search: "Still working — hang tight..." },
];

function addLoadingMessage(mode = "chat") {
  const wrapper = document.createElement("div");
  wrapper.className = "message-wrapper assistant";

  const avatar = document.createElement("div");
  avatar.className = "avatar";
  avatar.textContent = "🧠";

  const container = document.createElement("div");
  container.className = "message-container";

  const content = document.createElement("div");
  content.className = "message-content";
  content.innerHTML = `
    <div class="loading">
      <div class="pulse-loader">
        <div class="pulse-bubble pulse-bubble-1"></div>
        <div class="pulse-bubble pulse-bubble-2"></div>
        <div class="pulse-bubble pulse-bubble-3"></div>
      </div>
      <span class="loading-text">${LOADING_STAGES[0][mode]}</span>
      <span class="loading-elapsed">0s</span>
    </div>
  `;

  container.appendChild(content);
  wrapper.appendChild(avatar);
  wrapper.appendChild(container);

  chat.appendChild(wrapper);
  scrollToBottom();

  const startedAt = Date.now();
  const textEl = content.querySelector(".loading-text");
  const elapsedEl = content.querySelector(".loading-elapsed");

  const intervalId = setInterval(() => {
    const elapsedSeconds = Math.floor((Date.now() - startedAt) / 1000);

    if (elapsedEl) {
      elapsedEl.textContent = `${elapsedSeconds}s`;
    }

    if (textEl) {
      const stage = [...LOADING_STAGES]
        .reverse()
        .find(s => elapsedSeconds >= s.afterSeconds);

      if (stage) {
        textEl.textContent = stage[mode] ?? stage.chat;
      }
    }
  }, 1000);

  // Stop updating once the message is removed from the chat
  const originalRemove = wrapper.remove.bind(wrapper);
  wrapper.remove = () => {
    clearInterval(intervalId);
    originalRemove();
  };

  return wrapper;
}

function addErrorMessage(error) {
  const wrapper = document.createElement("div");
  wrapper.className = "message-wrapper assistant";
  
  const avatar = document.createElement("div");
  avatar.className = "avatar";
  avatar.textContent = "🧠";
  
  const container = document.createElement("div");
  container.className = "message-container";
  
  const content = document.createElement("div");
  content.className = "message-content";
  
  const errorBox = document.createElement("div");
  errorBox.className = "error-box";
  errorBox.innerHTML = `
    <span class="error-icon">⚠️</span>
    <span><strong>Query Failed:</strong> ${escapeHtml(error)}</span>
  `;
  
  content.appendChild(errorBox);
  container.appendChild(content);
  wrapper.appendChild(avatar);
  wrapper.appendChild(container);
  
  chat.appendChild(wrapper);
  scrollToBottom();
}

/* ==========================================
   MARKDOWN CONVERSATIONAL PARSER
   ========================================== */
function formatAnswer(text) {
  let escaped = escapeHtml(text);
  
  // Replace code blocks: ```lang\ncode``` or ```code```
  const codeBlockRegex = /```(?:[a-zA-Z0-9]+)?\n([\s\S]*?)```/g;
  escaped = escaped.replace(codeBlockRegex, (match, code) => {
    const uniqueId = 'code_' + Math.random().toString(36).substr(2, 9);
    const cleanCode = code.trim();
    return `
      <div class="code-block-container">
        <div class="code-block-header">
          <span>Code Output</span>
          <button class="copy-code-btn" data-code-id="${uniqueId}">Copy</button>
        </div>
        <pre><code id="${uniqueId}">${cleanCode}</code></pre>
      </div>
    `;
  });

  // Inline code: `code`
  escaped = escaped.replace(/`([^`\n]+)`/g, '<span class="inline-code">$1</span>');

  // Bold text: **bold**
  escaped = escaped.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

  const lines = escaped.split("\n");
  let html = "";
  let inOrderedList = false;
  let inUnorderedList = false;

  for (const line of lines) {
    // Avoid double processing lists or paragraph tags around code blocks
    if (line.includes('<div class="code-block') || 
        line.includes('<div class="code-block-header') ||
        line.includes('<pre><code') || 
        line.includes('</pre></div>') ||
        line.includes('</code></pre>') ||
        line.includes('<span>Code Output') ||
        line.includes('<button class="copy-code')) {
      html += line + "\n";
      continue;
    }

    // Numbered List: 1. Item
    const orderedMatch = line.match(/^\s*(\d+)\.\s+(.*)$/);
    // Bullet List: - Item or * Item
    const unorderedMatch = line.match(/^\s*[-\*]\s+(.*)$/);

    if (orderedMatch) {
      if (inUnorderedList) {
        html += "</ul>";
        inUnorderedList = false;
      }
      if (!inOrderedList) {
        html += '<ol class="answer-list">';
        inOrderedList = true;
      }
      html += `<li>${orderedMatch[2]}</li>`;
    } else if (unorderedMatch) {
      if (inOrderedList) {
        html += "</ol>";
        inOrderedList = false;
      }
      if (!inUnorderedList) {
        html += '<ul class="answer-list">';
        inUnorderedList = true;
      }
      html += `<li>${unorderedMatch[1]}</li>`;
    } else {
      if (inOrderedList) {
        html += "</ol>";
        inOrderedList = false;
      }
      if (inUnorderedList) {
        html += "</ul>";
        inUnorderedList = false;
      }

      if (line.trim()) {
        html += `<p>${line}</p>`;
      }
    }
  }

  if (inOrderedList) html += "</ol>";
  if (inUnorderedList) html += "</ul>";

  return html;
}

function attachCopyCodeListeners(container) {
  const copyBtns = container.querySelectorAll(".copy-code-btn");
  copyBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      const codeId = btn.dataset.codeId;
      const codeElement = document.getElementById(codeId);
      if (codeElement) {
        const text = codeElement.textContent;
        navigator.clipboard.writeText(text).then(() => {
          btn.textContent = "Copied!";
          showToast("Code copied to clipboard", "success");
          setTimeout(() => {
            btn.textContent = "Copy";
          }, 2000);
        }).catch(() => {
          showToast("Failed to copy code", "error");
        });
      }
    });
  });
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/* ==========================================
   HELPERS & CHAT RESET
   ========================================== */
function removeWelcome() {
  const welcome = document.getElementById("welcome");
  if (welcome) {
    welcome.remove();
  }
}

function newChat() {
  chat.innerHTML = `
    <div id="welcome" class="welcome">
      <div class="welcome-glow"></div>
      <div class="welcome-icon">🧠</div>
      <h2>What would you like to know?</h2>
      <p>
        Retrieve, correlate and reason over information stored in your Gmail inbox and Google Drive.
      </p>

      <div class="examples">
        <button class="example" data-question="What companies are hiring in Noida?">
          💼 What companies are hiring in Noida?
        </button>
        <button class="example" data-question="What jobs are related to backend development?">
          💻 What jobs are related to backend development?
        </button>
        <button class="example" data-question="Help me prepare for a Java backend interview">
          ☕ Help me prepare for a Java backend interview
        </button>
      </div>
    </div>
  `;

  attachExampleListeners();
  input.value = "";
  resizeInput();
  input.focus();
}

function resizeInput() {
  input.style.height = "auto";
  input.style.height = `${Math.min(input.scrollHeight, 160)}px`;
}

function scrollToBottom() {
  chat.scrollTop = chat.scrollHeight;
}

function attachExampleListeners() {
  document.querySelectorAll(".example").forEach(button => {
    button.addEventListener("click", () => {
      const question = button.dataset.question;
      if (question) {
        askBrain(question);
      }
    });
  });
}

/* ==========================================
   MOBILE INTERFACE DRAWER
   ========================================= */
function openMobileSidebar() {
  isMobileSidebarOpen = true;
  sidebar.classList.add("open");
  sidebarOverlay.classList.add("open");
}

function closeMobileSidebar() {
  isMobileSidebarOpen = false;
  sidebar.classList.remove("open");
  sidebarOverlay.classList.remove("open");
}

/* ==========================================
   EVENT LISTENERS INITIALIZATION
   ========================================== */

// Question Submission
sendButton.addEventListener("click", () => {
  askBrain(input.value);
});

input.addEventListener("keydown", event => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    askBrain(input.value);
  }
});

input.addEventListener("input", resizeInput);

// Reset Conversation
newChatButton.addEventListener("click", newChat);

// Sync Tools Button
syncButton.addEventListener("click", triggerSync);

// Query Mode Selector Tabs
modeChat.addEventListener("click", () => toggleMode("chat"));
modeSearch.addEventListener("click", () => toggleMode("search"));

// Mobile Sidebar Drawer
sidebarToggle.addEventListener("click", () => {
  if (isMobileSidebarOpen) {
    closeMobileSidebar();
  } else {
    openMobileSidebar();
  }
});
sidebarOverlay.addEventListener("click", closeMobileSidebar);

/* ==========================================
   INITIAL STARTUP & POLLING
   ========================================== */
attachExampleListeners();
loadHistory();
checkBackendStatus();

// Polling intervals
checkSyncStatus(); // Check immediate status on startup
setInterval(checkBackendStatus, 10000); // Check health every 10 seconds
setInterval(checkSyncStatus, 5000); // Check background sync every 5 seconds

input.focus();
