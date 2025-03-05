const express = require("express");
const app = express();
const port = 3000;

// Global variable to store the current message
let currentMessage = "Hello World";

// Middleware to parse JSON requests
app.use(express.json());

// Enable CORS for all routes
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});

// Endpoint to get the current message (for ESP8266)
app.get("/api/current-message", (req, res) => {
  console.log(`GET /api/current-message - Returning: "${currentMessage}"`);
  res.json({ message: currentMessage });
});

// Endpoint to set a new message
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

// Simple test endpoint
app.get("/api/test", (req, res) => {
  console.log("GET /api/test");
  res.json({ status: "ok", message: "API is working" });
});

// Simple HTML interface
app.get("/", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>ESP8266 Control</title>
      <style>
        body { font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; }
        .container { background: #f5f5f5; padding: 20px; border-radius: 8px; }
        input, button { padding: 8px; margin: 10px 0; }
        input { width: 80%; }
        button { background: #0066ff; color: white; border: none; cursor: pointer; }
        .current { font-family: monospace; background: #333; color: #0f0; padding: 10px; border-radius: 4px; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>ESP8266 LED Matrix Control</h1>
        <p>Current message: <span class="current" id="currentMessage">${currentMessage}</span></p>
        <div>
          <input type="text" id="messageInput" placeholder="Enter a message">
          <button onclick="sendMessage()">Send to Display</button>
        </div>
      </div>

      <script>
        function sendMessage() {
          const message = document.getElementById('messageInput').value;
          if (!message) return;

          fetch('/api/set-message', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message })
          })
          .then(response => response.json())
          .then(data => {
            if (data.success) {
              document.getElementById('currentMessage').innerText = message;
              document.getElementById('messageInput').value = '';
            }
          })
          .catch(error => console.error('Error:', error));
        }
      </script>
    </body>
    </html>
  `);
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
