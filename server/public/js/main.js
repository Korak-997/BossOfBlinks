// Elements
const messageForm = document.getElementById("messageForm");
const messageInput = document.getElementById("messageInput");
const previewEl = document.getElementById("preview");
const emojiBtns = document.querySelectorAll(".emoji-btn");
const refreshStatusBtn = document.getElementById("refreshStatusBtn");
const connectionStatus = document.getElementById("connectionStatus");
const wifiName = document.getElementById("wifiName");
const ipAddress = document.getElementById("ipAddress");
const currentDisplayMessage = document.getElementById("currentDisplayMessage");
const lastSeen = document.getElementById("lastSeen");
const templatesGrid = document.getElementById("templatesGrid");
const addTemplateBtn = document.getElementById("addTemplateBtn");
const notification = document.getElementById("notification");
const notificationText = document.getElementById("notificationText");

// Update preview
function updatePreview() {
  previewEl.textContent = messageInput.value || "Enter your message";
}

// Update status info
async function updateStatus() {
  try {
    const response = await fetch("/api/status");
    if (response.ok) {
      const data = await response.json();

      // Update connection status
      connectionStatus.className = data.connected
        ? "status-value connected"
        : "status-value disconnected";
      connectionStatus.innerHTML = data.connected
        ? '<i class="fas fa-check-circle"></i> Connected'
        : '<i class="fas fa-times-circle"></i> Disconnected';

      // Update other status info
      wifiName.textContent = data.wifiName;
      ipAddress.textContent = data.ipAddress;
      currentDisplayMessage.textContent = data.currentMessage;

      // Format last seen date
      const lastSeenDate = new Date(data.lastSeen);
      const now = new Date();
      const diffMs = now - lastSeenDate;
      const diffMins = Math.floor(diffMs / 60000);

      if (diffMins < 1) {
        lastSeen.textContent = "Just now";
      } else if (diffMins < 60) {
        lastSeen.textContent = `${diffMins} minute${
          diffMins === 1 ? "" : "s"
        } ago`;
      } else {
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) {
          lastSeen.textContent = `${diffHours} hour${
            diffHours === 1 ? "" : "s"
          } ago`;
        } else {
          lastSeen.textContent = lastSeenDate.toLocaleString();
        }
      }
    }
  } catch (error) {
    console.error("Error updating status:", error);
    connectionStatus.className = "status-value disconnected";
    connectionStatus.innerHTML = '<i class="fas fa-times-circle"></i> Error';
  }
}

// Show notification
function showNotification(message, isError = false) {
  notification.className = isError
    ? "notification error show"
    : "notification show";
  notificationText.textContent = message;

  setTimeout(() => {
    notification.className = notification.className.replace("show", "");
  }, 3000);
}

// Send message
async function sendMessage(message) {
  try {
    const response = await fetch("/api/set-message", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message }),
    });

    if (response.ok) {
      currentDisplayMessage.textContent = message;
      showNotification("Message sent successfully!");
    } else {
      const data = await response.json();
      showNotification(data.error || "Failed to send message", true);
    }
  } catch (error) {
    console.error("Error sending message:", error);
    showNotification("Network error. Please try again.", true);
  }
}

// Load templates
async function loadTemplates() {
  try {
    const response = await fetch("/api/templates");
    if (response.ok) {
      const templates = await response.json();
      updateTemplatesGrid(templates);
    }
  } catch (error) {
    console.error("Error loading templates:", error);
  }
}

// Add template
async function addTemplate(template) {
  try {
    const response = await fetch("/api/templates", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ template }),
    });

    if (response.ok) {
      const data = await response.json();
      updateTemplatesGrid(data.templates);
      showNotification("Template added successfully!");
    } else {
      const data = await response.json();
      showNotification(data.error || "Failed to add template", true);
    }
  } catch (error) {
    console.error("Error adding template:", error);
    showNotification("Network error. Please try again.", true);
  }
}

// Update templates grid
function updateTemplatesGrid(templates) {
  templatesGrid.innerHTML = templates
    .map(
      (template) => `
    <div class="template-item" data-template="${template}">
      <div class="template-text">${template}</div>
    </div>
  `
    )
    .join("");

  // Re-attach event listeners
  document.querySelectorAll(".template-item").forEach((item) => {
    item.addEventListener("click", () => {
      messageInput.value = item.dataset.template;
      updatePreview();
    });
  });
}

// Load initial message
async function loadCurrentMessage() {
  try {
    const response = await fetch("/api/current-message");
    if (response.ok) {
      const data = await response.json();
      messageInput.value = data.message;
      updatePreview();
    }
  } catch (error) {
    console.error("Error loading current message:", error);
  }
}

// Event Listeners
messageInput.addEventListener("input", updatePreview);

messageForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const message = messageInput.value.trim();
  if (message) {
    sendMessage(message);
  }
});

emojiBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    messageInput.value += btn.dataset.emoji;
    updatePreview();
  });
});

refreshStatusBtn.addEventListener("click", updateStatus);

addTemplateBtn.addEventListener("click", () => {
  const message = messageInput.value.trim();
  if (message) {
    addTemplate(message);
  }
});

// Initialize
updatePreview();
loadCurrentMessage();
loadTemplates();
updateStatus();

// Periodically update status
setInterval(updateStatus, 30000); // Update every 30 seconds
