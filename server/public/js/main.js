// DOM Elements
const messageForm = document.getElementById("messageForm");
const messageInput = document.getElementById("messageInput");
const preview = document.getElementById("preview");
const notification = document.getElementById("notification");
const notificationText = document.getElementById("notificationText");
const templatesGrid = document.getElementById("templatesGrid");
const addTemplateBtn = document.getElementById("addTemplateBtn");
const refreshStatusBtn = document.getElementById("refreshStatusBtn");

// Status elements
const connectionStatus = document.getElementById("connectionStatus");
const wifiName = document.getElementById("wifiName");
const ipAddress = document.getElementById("ipAddress");
const currentDisplayMessage = document.getElementById("currentDisplayMessage");
const lastSeen = document.getElementById("lastSeen");

// Initialize the page
document.addEventListener("DOMContentLoaded", () => {
  loadTemplates();
  updateDeviceStatus();

  // Set up polling for device status every 10 seconds
  setInterval(updateDeviceStatus, 10000);
});

// Preview message as user types
messageInput.addEventListener("input", () => {
  preview.textContent = messageInput.value || "Enter your message";
});

// Handle form submission to send message to display
messageForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const message = messageInput.value.trim();
  if (!message) {
    showNotification("Please enter a message", "error");
    return;
  }

  try {
    const response = await fetch("/api/set-message", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message }),
    });

    const data = await response.json();

    if (data.success) {
      showNotification("Message sent successfully!");
      updateDeviceStatus(); // Update status to show new message
    } else {
      showNotification(data.error || "Failed to send message", "error");
    }
  } catch (error) {
    console.error("Error sending message:", error);
    showNotification("Network error, please try again", "error");
  }
});

// Handle emoji button clicks
document.querySelectorAll(".emoji-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const emoji = btn.getAttribute("data-emoji");
    messageInput.value += emoji;
    preview.textContent = messageInput.value;
  });
});

// Add template button handler
addTemplateBtn.addEventListener("click", async () => {
  const template = messageInput.value.trim();
  if (!template) {
    showNotification("Please enter a message to save as template", "error");
    return;
  }

  try {
    const response = await fetch("/api/templates", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ template }),
    });

    const data = await response.json();

    if (data.success) {
      showNotification("Template saved!");
      loadTemplates();
    } else {
      showNotification(data.error || "Failed to save template", "error");
    }
  } catch (error) {
    console.error("Error saving template:", error);
    showNotification("Network error, please try again", "error");
  }
});

// Refresh status button handler
refreshStatusBtn.addEventListener("click", () => {
  refreshStatusBtn.disabled = true;
  refreshStatusBtn.innerHTML =
    '<i class="fas fa-spinner fa-spin"></i> Refreshing...';

  updateDeviceStatus().finally(() => {
    setTimeout(() => {
      refreshStatusBtn.disabled = false;
      refreshStatusBtn.innerHTML =
        '<i class="fas fa-sync-alt"></i> Refresh Status';
    }, 1000);
  });
});

// Load message templates
async function loadTemplates() {
  try {
    const response = await fetch("/api/templates");
    const templates = await response.json();

    templatesGrid.innerHTML = "";

    templates.forEach((template) => {
      const templateElement = document.createElement("div");
      templateElement.className = "template-item";
      templateElement.textContent = template;
      templateElement.addEventListener("click", () => {
        messageInput.value = template;
        preview.textContent = template;
      });

      templatesGrid.appendChild(templateElement);
    });
  } catch (error) {
    console.error("Error loading templates:", error);
    showNotification("Failed to load templates", "error");
  }
}

// Update device status
async function updateDeviceStatus() {
  try {
    const response = await fetch("/api/status");
    const status = await response.json();

    // Update connection status
    if (status.connected) {
      connectionStatus.className = "status-value connected";
      connectionStatus.innerHTML =
        '<i class="fas fa-check-circle"></i> Connected';
    } else {
      connectionStatus.className = "status-value disconnected";
      connectionStatus.innerHTML =
        '<i class="fas fa-times-circle"></i> Disconnected';
    }

    // Update WiFi name
    wifiName.textContent = status.wifiName || "Unknown";

    // Update IP address
    ipAddress.textContent = status.ipAddress || "Unknown";

    // Update current message
    currentDisplayMessage.textContent = status.currentMessage || "None";

    // Update last seen time
    if (status.lastSeen) {
      const lastSeenDate = new Date(status.lastSeen);
      const now = new Date();
      const diffMs = now - lastSeenDate;
      const diffSecs = Math.floor(diffMs / 1000);

      if (diffSecs < 60) {
        lastSeen.textContent = `${diffSecs} seconds ago`;
      } else if (diffSecs < 3600) {
        const mins = Math.floor(diffSecs / 60);
        lastSeen.textContent = `${mins} minute${mins !== 1 ? "s" : ""} ago`;
      } else {
        lastSeen.textContent = lastSeenDate.toLocaleTimeString();
      }
    } else {
      lastSeen.textContent = "Never";
    }

    return status;
  } catch (error) {
    console.error("Error updating device status:", error);
    // Show offline status on error
    connectionStatus.className = "status-value disconnected";
    connectionStatus.innerHTML =
      '<i class="fas fa-times-circle"></i> Server Error';
    return null;
  }
}

// Show notification
function showNotification(message, type = "success") {
  notificationText.textContent = message;
  notification.className = `notification ${type}`;
  notification.style.display = "flex";

  setTimeout(() => {
    notification.style.opacity = "1";
  }, 10);

  setTimeout(() => {
    notification.style.opacity = "0";

    setTimeout(() => {
      notification.style.display = "none";
    }, 300);
  }, 3000);
}
