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
  res.json({ message: currentMessage });
});

// Get device status
app.get("/api/status", (req, res) => {
  console.log("GET /api/status");
  res.json({
    connected: true,
    wifiName: "Your WiFi",
    ipAddress: "192.168.1.123",
    currentMessage: currentMessage,
    lastSeen: new Date().toISOString(),
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
  console.log(`Test the API at http://localhost:${port}/api/test`);
  console.log(`Your computer's IP is likely one of these:`);

  // Display potential IP addresses for the ESP8266 to connect to
  const { networkInterfaces } = require("os");
  const nets = networkInterfaces();

  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      // Skip internal and non-IPv4 addresses
      if (net.family === "IPv4" && !net.internal) {
        console.log(`- http://${net.address}:${port}`);
      }
    }
  }
});
