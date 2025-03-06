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

// Display settings elements (we'll add these to the HTML)
let brightnessSlider, speedSlider;

// Initialize the page
document.addEventListener("DOMContentLoaded", () => {
  loadTemplates();
  updateDeviceStatus();
  setupDisplayControls();

  // Set up polling for device status every 10 seconds
  setInterval(updateDeviceStatus, 10000);
});

// Setup display controls
function setupDisplayControls() {
  // Check if the display settings section exists
  const settingsContainer = document.getElementById("displaySettingsContainer");
  if (!settingsContainer) {
    console.log("Creating display settings controls");
    createDisplaySettingsControls();
  } else {
    // Get references to existing controls
    brightnessSlider = document.getElementById("brightnessSlider");
    speedSlider = document.getElementById("speedSlider");

    // Add event listeners
    if (brightnessSlider) {
      brightnessSlider.addEventListener("change", updateDisplaySettings);
    }
    if (speedSlider) {
      speedSlider.addEventListener("change", updateDisplaySettings);
    }
  }
}

// Create display settings controls if they don't exist
function createDisplaySettingsControls() {
  // Create the settings card and add it to the grid
  const gridContainer = document.querySelector(".grid");
  if (!gridContainer) return;

  const settingsCard = document.createElement("div");
  settingsCard.className = "card";
  settingsCard.id = "displaySettingsContainer";
  settingsCard.innerHTML = `
    <h2 class="card-title">
      <i class="fas fa-sliders-h"></i>
      Display Settings
    </h2>
    <div class="settings-content">
      <div class="setting-item">
        <label for="brightnessSlider">Brightness</label>
        <div class="slider-container">
          <i class="fas fa-sun fa-sm"></i>
          <input type="range" id="brightnessSlider" min="0" max="15" value="5" class="slider">
          <i class="fas fa-sun fa-lg"></i>
        </div>
        <span id="brightnessValue">5</span>
      </div>
      <div class="setting-item">
        <label for="speedSlider">Scroll Speed</label>
        <div class="slider-container">
          <i class="fas fa-running fa-sm"></i>
          <input type="range" id="speedSlider" min="10" max="100" value="40" class="slider">
          <i class="fas fa-running fa-lg"></i>
        </div>
        <span id="speedValue">40</span>
      </div>
      <button id="applySettingsBtn" class="apply-btn">
        <i class="fas fa-check-circle"></i>
        Apply Settings
      </button>
    </div>
  `;

  // Insert after first or second card
  if (gridContainer.children.length > 1) {
    gridContainer.insertBefore(settingsCard, gridContainer.children[2]);
  } else {
    gridContainer.appendChild(settingsCard);
  }

  // Get references to the new elements
  brightnessSlider = document.getElementById("brightnessSlider");
  speedSlider = document.getElementById("speedSlider");
  const brightnessValue = document.getElementById("brightnessValue");
  const speedValue = document.getElementById("speedValue");
  const applySettingsBtn = document.getElementById("applySettingsBtn");

  // Add event listeners for sliders
  brightnessSlider.addEventListener("input", () => {
    brightnessValue.textContent = brightnessSlider.value;
  });

  speedSlider.addEventListener("input", () => {
    speedValue.textContent = speedSlider.value;
  });

  // Apply settings button
  applySettingsBtn.addEventListener("click", updateDisplaySettings);

  // Add CSS for the new controls
  addDisplaySettingsStyles();
}

// Add CSS for display settings
function addDisplaySettingsStyles() {
  const styleEl = document.createElement("style");
  styleEl.textContent = `
    .setting-item {
      margin-bottom: 1.5rem;
    }

    .setting-item label {
      display: block;
      margin-bottom: 0.5rem;
      color: var(--gray);
    }

    .slider-container {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 0.5rem;
    }

    .slider {
      flex: 1;
      height: 6px;
      background: var(--gray-dark);
      border-radius: 3px;
      appearance: none;
      outline: none;
    }

    .slider::-webkit-slider-thumb {
      appearance: none;
      width: 18px;
      height: 18px;
      background: var(--primary);
      border-radius: 50%;
      cursor: pointer;
      transition: all 0.2s;
    }

    .slider::-webkit-slider-thumb:hover {
      background: var(--primary-light);
      transform: scale(1.2);
      box-shadow: 0 0 10px var(--primary);
    }

    .apply-btn {
      width: 100%;
      background-color: var(--primary);
      color: white;
      border: none;
      border-radius: 8px;
      padding: 0.9rem 1.25rem;
      font-weight: 500;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
      transition: all 0.2s;
      margin-top: 1rem;
      box-shadow: 0 4px 8px rgba(0, 179, 255, 0.2);
    }

    .apply-btn:hover {
      background-color: var(--primary-dark);
      transform: translateY(-2px);
      box-shadow: 0 6px 12px rgba(0, 179, 255, 0.3);
    }

    .apply-btn:active {
      transform: translateY(1px);
    }
  `;

  document.head.appendChild(styleEl);
}

// Update display settings
async function updateDisplaySettings() {
  try {
    const brightness = parseInt(brightnessSlider.value);
    const speed = parseInt(speedSlider.value);

    const response = await fetch("/api/display-settings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        brightness,
        speed,
      }),
    });

    const data = await response.json();

    if (data.success) {
      showNotification("Display settings updated!");
    } else {
      showNotification("Failed to update settings", "error");
    }
  } catch (error) {
    console.error("Error updating display settings:", error);
    showNotification("Network error, please try again", "error");
  }
}

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

    // Update display settings if available
    if (status.displaySettings && brightnessSlider && speedSlider) {
      brightnessSlider.value = status.displaySettings.brightness;
      document.getElementById("brightnessValue").textContent =
        status.displaySettings.brightness;

      speedSlider.value = status.displaySettings.speed;
      document.getElementById("speedValue").textContent =
        status.displaySettings.speed;
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
