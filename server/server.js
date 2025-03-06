const express = require("express");
const path = require("path");
const app = express();
const port = 3000;

// Global variables to store the app state
let currentMessage = "Hello World";
let messageTemplates = [
  "Hello World!",
  "Welcome! 👋",
  "Meeting in progress... 🔴",
  "Be right back! ⏱️",
  "Do not disturb! 🔕",
  "Happy Birthday! 🎂",
];

// Display settings
let displaySettings = {
  brightness: 5, // 0-15 brightness level
  speed: 40, // Scroll speed (lower is faster)
  fontStyle: "default", // For future font options
};

// Device status tracking
let deviceStatus = {
  connected: false,
  lastSeen: null,
  wifiName: "Unknown",
  ipAddress: "Unknown",
  deviceIP: "Unknown",
  signalStrength: 0,
};

// Connection timeout interval (in milliseconds)
const CONNECTION_TIMEOUT = 60000; // 1 minute

// Function to check if device is connected
function isDeviceConnected() {
  if (!deviceStatus.lastSeen) return false;

  const timeSinceLastSeen = Date.now() - deviceStatus.lastSeen;
  return timeSinceLastSeen < CONNECTION_TIMEOUT;
}

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Enable CORS for all routes
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});

// Track device connection for any request from ESP8266
app.use((req, res, next) => {
  // Check for requests from ESP8266 (using a user-agent header or a specific path)
  const isESP8266Request =
    req.path.startsWith("/api/") &&
    (req.get("User-Agent")?.includes("ESP8266") ||
      req.query.device === "esp8266");

  if (isESP8266Request) {
    deviceStatus.lastSeen = Date.now();
    deviceStatus.connected = true;

    // Get device IP address from request
    deviceStatus.deviceIP = req.ip.replace("::ffff:", ""); // Strip IPv6 prefix if present

    console.log(`ESP8266 device connected from ${deviceStatus.deviceIP}`);
  }

  next();
});

// API Routes
// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, "public")));

// This ensures that the index.html file is served when accessing the root URL
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "/public", "index.html"));
});

// Get current message (for ESP8266)
app.get("/api/current-message", (req, res) => {
  console.log(`GET /api/current-message - Returning: "${currentMessage}"`);

  // Also return display settings for the device
  res.json({
    message: currentMessage,
    brightness: displaySettings.brightness,
    speed: displaySettings.speed,
    fontStyle: displaySettings.fontStyle,
  });
});

// Endpoint for ESP8266 to report its status
app.post("/api/device-status", (req, res) => {
  const { ssid, ip, rssi } = req.body;

  if (ssid) deviceStatus.wifiName = ssid;
  if (ip) deviceStatus.deviceIP = ip;
  if (rssi) deviceStatus.signalStrength = rssi;

  deviceStatus.lastSeen = Date.now();
  deviceStatus.connected = true;

  console.log(
    `Device status updated - SSID: ${deviceStatus.wifiName}, IP: ${deviceStatus.deviceIP}, Signal: ${deviceStatus.signalStrength}dBm`
  );
  res.json({ success: true });
});

// Get device status
app.get("/api/status", (req, res) => {
  console.log("GET /api/status");

  // Update connected status based on last seen time
  deviceStatus.connected = isDeviceConnected();

  res.json({
    connected: deviceStatus.connected,
    wifiName: deviceStatus.wifiName,
    ipAddress: deviceStatus.deviceIP,
    currentMessage: currentMessage,
    signalStrength: deviceStatus.signalStrength,
    displaySettings: displaySettings,
    lastSeen: deviceStatus.lastSeen
      ? new Date(deviceStatus.lastSeen).toISOString()
      : null,
  });
});

// Set a new message
app.post("/api/set-message", (req, res) => {
  const { message } = req.body;
  console.log(`POST /api/set-message - Received: "${message}"`);

  if (!message) {
    console.log("Error: Message is required");
    return res.status(400).json({ error: "Message is required" });
  }

  currentMessage = message;
  console.log(`Message updated to: "${currentMessage}"`);
  res.json({ success: true, message });
});

// Update display settings
app.post("/api/display-settings", (req, res) => {
  const { brightness, speed, fontStyle } = req.body;

  if (brightness !== undefined) {
    displaySettings.brightness = Math.min(Math.max(brightness, 0), 15); // Ensure within 0-15 range
  }

  if (speed !== undefined) {
    displaySettings.speed = Math.min(Math.max(speed, 10), 100); // Ensure within range
  }

  if (fontStyle !== undefined) {
    displaySettings.fontStyle = fontStyle;
  }

  console.log("Display settings updated:", displaySettings);
  res.json({ success: true, settings: displaySettings });
});

// Get templates
app.get("/api/templates", (req, res) => {
  res.json(messageTemplates);
});

// Add a template
app.post("/api/templates", (req, res) => {
  const { template } = req.body;
  if (!template || messageTemplates.includes(template)) {
    return res.status(400).json({ error: "Invalid or duplicate template" });
  }

  messageTemplates.push(template);
  res.json({ success: true, templates: messageTemplates });
});

// Start the server
app.listen(port, "0.0.0.0", () => {
  console.log(`Server running at http://0.0.0.0:${port}`);
  console.log(`Test the API at http://localhost:${port}/api/status`);
  console.log(`Your computer's IP is likely one of these:`);

  // Display potential IP addresses for the ESP8266 to connect to
  const { networkInterfaces } = require("os");
  const nets = networkInterfaces();

  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      // Skip internal and non-IPv4 addresses
      if (net.family === "IPv4" && !net.internal) {
        console.log(`- http://${net.address}:${port}`);
        // Set server IP for reference
        deviceStatus.ipAddress = net.address;
      }
    }
  }
});
