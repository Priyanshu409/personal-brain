const API_BASE_URL = "http://localhost:3000";

const chat =
  document.getElementById("chat");

const input =
  document.getElementById("questionInput");

const sendButton =
  document.getElementById("sendButton");

const newChatButton =
  document.getElementById("newChatButton");


/* =========================
   ASK PERSONAL BRAIN
   ========================= */

async function askBrain(question) {
  question = question.trim();

  if (!question) {
    return;
  }

  addUserMessage(question);

  input.value = "";

  resizeInput();

  removeWelcome();

  const loading =
    addLoadingMessage();

  sendButton.disabled = true;

  try {
    const url =
      `${API_BASE_URL}/brain/ask?q=${encodeURIComponent(
        question
      )}`;

    const response =
      await fetch(url);

    if (!response.ok) {
      let message =
        "Failed to get answer";

      try {
        const error =
          await response.json();

        if (error.error) {
          message = error.error;
        }
      } catch {
        // Ignore invalid JSON.
      }

      throw new Error(message);
    }

    const data =
      await response.json();

    loading.remove();

    addAssistantMessage(
      data.answer,
      data.sources ?? []
    );
  } catch (error) {
    loading.remove();

    addErrorMessage(
      error instanceof Error
        ? error.message
        : "Something went wrong"
    );
  } finally {
    sendButton.disabled = false;

    input.focus();
  }
}


/* =========================
   USER MESSAGE
   ========================= */

function addUserMessage(text) {
  const message =
    document.createElement("div");

  message.className =
    "message user";

  const content =
    document.createElement("div");

  content.className =
    "message-content";

  content.textContent = text;

  message.appendChild(content);

  chat.appendChild(message);

  scrollToBottom();
}


/* =========================
   ASSISTANT MESSAGE
   ========================= */

function addAssistantMessage(
  answer,
  sources
) {
  const message =
    document.createElement("div");

  message.className =
    "message assistant";

  const content =
    document.createElement("div");

  content.className =
    "message-content";

  content.innerHTML =
    formatAnswer(answer);

  if (
    Array.isArray(sources) &&
    sources.length > 0
  ) {
    addSources(
      content,
      sources
    );
  }

  message.appendChild(content);

  chat.appendChild(message);

  scrollToBottom();
}


/* =========================
   SOURCES
   ========================= */

function addSources(
  container,
  sources
) {
  const sourcesContainer =
    document.createElement("div");

  sourcesContainer.className =
    "sources";

  const title =
    document.createElement("div");

  title.className =
    "sources-title";

  title.textContent =
    "Sources";

  sourcesContainer.appendChild(
    title
  );

  sources.forEach(
    (source) => {
      const card =
        document.createElement("div");

      card.className =
        "source-card";

      const information =
        document.createElement("div");

      const name =
        document.createElement("div");

      name.className =
        "source-name";

      name.textContent =
        source.title ?? "Untitled";

      const type =
        document.createElement("div");

      type.className =
        "source-type";

      type.textContent =
        source.source ?? "";

      information.appendChild(name);
      information.appendChild(type);

      const score =
        document.createElement("div");

      score.className =
        "source-score";

      const numericScore =
        Number(source.score);

      score.textContent =
        Number.isFinite(numericScore)
          ? numericScore.toFixed(4)
          : "";

      card.appendChild(information);
      card.appendChild(score);

      sourcesContainer.appendChild(card);
    }
  );

  container.appendChild(
    sourcesContainer
  );
}


/* =========================
   LOADING
   ========================= */

function addLoadingMessage() {
  const message =
    document.createElement("div");

  message.className =
    "message assistant";

  message.innerHTML = `
    <div class="message-content">
      <div class="loading">
        <div class="spinner"></div>
        Thinking...
      </div>
    </div>
  `;

  chat.appendChild(message);

  scrollToBottom();

  return message;
}


/* =========================
   ERROR
   ========================= */

function addErrorMessage(error) {
  const message =
    document.createElement("div");

  message.className =
    "message assistant";

  const content =
    document.createElement("div");

  content.className =
    "message-content";

  const errorBox =
    document.createElement("div");

  errorBox.className =
    "error";

  errorBox.textContent = error;

  content.appendChild(errorBox);

  message.appendChild(content);

  chat.appendChild(message);

  scrollToBottom();
}


/* =========================
   FORMAT ANSWER
   ========================= */

function formatAnswer(text) {
  let escaped =
    escapeHtml(text);

  escaped =
    escaped.replace(
      /\*\*(.*?)\*\*/g,
      "<strong>$1</strong>"
    );

  const lines =
    escaped.split("\n");

  let html = "";

  let inList = false;

  for (const line of lines) {
    const match =
      line.match(
        /^\s*(\d+)\.\s+(.*)$/
      );

    if (match) {
      if (!inList) {
        html +=
          '<ol class="answer-list">';

        inList = true;
      }

      html +=
        `<li>${match[2]}</li>`;
    } else {
      if (inList) {
        html += "</ol>";

        inList = false;
      }

      if (line.trim()) {
        html +=
          `<div>${line}</div>`;
      }
    }
  }

  if (inList) {
    html += "</ol>";
  }

  return html;
}


/* =========================
   REMOVE WELCOME SCREEN
   ========================= */

function removeWelcome() {
  const welcome =
    document.getElementById("welcome");

  if (welcome) {
    welcome.remove();
  }
}


/* =========================
   NEW CHAT
   ========================= */

function newChat() {
  chat.innerHTML = `
    <div
      id="welcome"
      class="welcome"
    >

      <div class="welcome-icon">
        🧠
      </div>

      <h2>
        What would you like to know?
      </h2>

      <p>
        Ask questions about information
        stored in your Personal Brain.
      </p>

      <div class="examples">

        <button
          class="example"
          data-question="What companies are hiring in Noida?"
        >
          💼 What companies are hiring in Noida?
        </button>

        <button
          class="example"
          data-question="What jobs are related to backend development?"
        >
          💻 What jobs are related to backend development?
        </button>

        <button
          class="example"
          data-question="Help me prepare for a Java backend interview"
        >
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


/* =========================
   ESCAPE HTML
   ========================= */

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


/* =========================
   TEXTAREA RESIZE
   ========================= */

function resizeInput() {
  input.style.height = "auto";

  input.style.height =
    `${Math.min(
      input.scrollHeight,
      120
    )}px`;
}


/* =========================
   SCROLL
   ========================= */

function scrollToBottom() {
  chat.scrollTop =
    chat.scrollHeight;
}


/* =========================
   EXAMPLE QUESTIONS
   ========================= */

function attachExampleListeners() {
  document
    .querySelectorAll(".example")
    .forEach((button) => {
      button.addEventListener(
        "click",
        () => {
          const question =
            button.dataset.question;

          if (question) {
            askBrain(question);
          }
        }
      );
    });
}


/* =========================
   SEND BUTTON
   ========================= */

sendButton.addEventListener(
  "click",
  () => {
    askBrain(input.value);
  }
);


/* =========================
   KEYBOARD
   ========================= */

input.addEventListener(
  "keydown",
  (event) => {
    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();

      askBrain(input.value);
    }
  }
);


/* =========================
   INPUT RESIZE
   ========================= */

input.addEventListener(
  "input",
  resizeInput
);


/* =========================
   NEW CHAT BUTTON
   ========================= */

newChatButton.addEventListener(
  "click",
  newChat
);


/* =========================
   INITIALIZE
   ========================= */

attachExampleListeners();

input.focus();