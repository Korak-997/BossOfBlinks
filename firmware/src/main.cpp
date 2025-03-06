#include <Arduino.h>
#include <MD_Parola.h>
#include <MD_MAX72xx.h>
#include <SPI.h>
#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <ArduinoJson.h>
#include <FS.h>
#include "font.h"

// Define the hardware type and pins based on the actual hardware connections
#define HARDWARE_TYPE MD_MAX72XX::FC16_HW
#define MAX_DEVICES 4
#define CLK_PIN D6  // Clock
#define DATA_PIN D8 // Data In (DIN)
#define CS_PIN D7   // Chip Select

// Maximum number of WiFi networks we'll store
#define MAX_NETWORKS 5
#define CONFIG_FILE "/config.json"

// Create the matrix display object
MD_Parola P = MD_Parola(HARDWARE_TYPE, DATA_PIN, CLK_PIN, CS_PIN, MAX_DEVICES);

// Structure for storing WiFi configurations
struct WifiConfig {
  char ssid[32];
  char password[64];
  bool enabled;
};

// Structure for storing server configuration
struct ServerConfig {
  char serverIP[40];
  int serverPort;
};

// Global variables
WifiConfig wifiNetworks[MAX_NETWORKS];
ServerConfig serverConfig;
String currentMessage = "Hello World";
bool isConfigured = false;
unsigned long lastCheckTime = 0;
unsigned long lastStatusUpdateTime = 0;
const unsigned long checkInterval = 5000;         // Check every 5 seconds
const unsigned long statusUpdateInterval = 30000; // Status update every 30 seconds

// Function prototypes
void connectToWifi();
void parseCommand(String command);
void addWifiNetwork(const char* ssid, const char* password, bool remember);
void checkForNewMessages();
void sendStatusUpdate();
bool saveConfig();
bool loadConfig();
void waitForSerialConfig();
void checkSerialCommands();
String replaceEmojis(String message);

// Setup function
void setup() {
  // Initialize serial communication
  Serial.begin(115200);
  Serial.println("\nBossOfBlinks Controller Starting");

  // Initialize the LED display
  P.begin();
  P.setFont(fontSubs);
  P.setIntensity(5);  // Increased brightness (0-15)
  P.setSpeed(40);     // Faster scrolling for better readability
  P.setPause(1000);   // Pause at the end of message
  P.setTextAlignment(PA_CENTER);
  P.displayClear();

  // Display a starting message
  P.print("Starting...");

  // Initialize the filesystem
  if (!SPIFFS.begin()) {
    Serial.println("Failed to mount file system");
    P.print("FS Error");
    delay(2000);
  }

  // Load saved configurations
  loadConfig();

  if (isConfigured) {
    connectToWifi();
  } else {
    // If not configured, wait for serial configuration
    currentMessage = "Connect USB";
    P.print("USB Setup");
    waitForSerialConfig();
  }
}

// Main loop
void loop() {
  // Update the display with current message on animation completion
  if (P.displayAnimate()) {
    P.displayText(currentMessage.c_str(), PA_CENTER, 40, 1000, PA_SCROLL_LEFT, PA_SCROLL_LEFT);
    P.displayReset();
  }

  // Check for serial commands
  checkSerialCommands();

  // Check for new messages if connected to WiFi
  if (WiFi.status() == WL_CONNECTED) {
    unsigned long currentTime = millis();

    // Check for new messages periodically
    if (currentTime - lastCheckTime > checkInterval) {
      checkForNewMessages();
      lastCheckTime = currentTime;
    }

    // Send status updates periodically
    if (currentTime - lastStatusUpdateTime > statusUpdateInterval) {
      sendStatusUpdate();
      lastStatusUpdateTime = currentTime;
    }
  } else {
    // If WiFi is disconnected, try to reconnect occasionally
    if (millis() - lastCheckTime > 30000) { // Every 30 seconds
      connectToWifi();
      lastCheckTime = millis();
    }
  }
}

// Replace emoji Unicode characters with displayable alternatives
String replaceEmojis(String message) {
  // Common emoji replacements using characters from your custom font
  message.replace("😀", ":)");    // Use happy smiley from fontSubs
  message.replace("👋", "~");     // Wave as tilde
  message.replace("❤️", "\x03");  // Heart character (index 3 in your font)
  message.replace("👍", "(Y)");   // Thumbs up
  message.replace("🚀", "/^\\");  // Rocket representation
  message.replace("🎉", "!!");    // Party popper
  message.replace("⭐", "*");     // Star
  message.replace("🔥", "><>");   // Fire representation
  message.replace("🎵", "\x0E");  // Music note (index 14 in your font)
  message.replace("📱", "[o]");   // Phone representation
  message.replace("💻", "[_]");   // Computer representation
  message.replace("🔴", "\x07");  // Bullet point (index 7 in your font)
  message.replace("🟢", "()");    // Green circle

  return message;
}

// Wait for serial configuration
void waitForSerialConfig() {
  Serial.println("Waiting for USB configuration...");

  while (!isConfigured) {
    if (Serial.available()) {
      String command = Serial.readStringUntil('\n');
      parseCommand(command);
    }

    // Update the display occasionally
    P.print("USB Setup");
    delay(10);
  }
}

// Parse commands received via serial
void parseCommand(String command) {
  // Parse JSON commands from serial
  DynamicJsonDocument doc(1024);
  DeserializationError error = deserializeJson(doc, command);

  if (!error) {
    if (doc.containsKey("add_wifi")) {
      // Add a new WiFi network
      JsonObject wifi = doc["add_wifi"];
      String ssid = wifi["ssid"].as<String>();
      String password = wifi["password"].as<String>();
      bool remember = wifi["remember"] | false;

      addWifiNetwork(ssid.c_str(), password.c_str(), remember);
      Serial.println("WiFi network added: " + ssid);
    }
    else if (doc.containsKey("set_server")) {
      // Set server configuration
      JsonObject server = doc["set_server"];
      String ip = server["ip"].as<String>();
      int port = server["port"].as<int>();

      strncpy(serverConfig.serverIP, ip.c_str(), sizeof(serverConfig.serverIP));
      serverConfig.serverPort = port;

      if (saveConfig()) {
        Serial.println("Server configuration saved");
        isConfigured = true;
      } else {
        Serial.println("Failed to save server configuration");
      }
    }
    else if (doc.containsKey("message")) {
      // Set a new message
      String message = doc["message"].as<String>();
      currentMessage = replaceEmojis(message);  // Process emojis
      P.print(currentMessage);
      Serial.println("New message set: " + message);
    }
    else if (doc.containsKey("brightness")) {
      // Set display brightness
      int brightness = doc["brightness"].as<int>();
      brightness = constrain(brightness, 0, 15);  // Ensure value is within range
      P.setIntensity(brightness);
      Serial.println("Brightness set to: " + String(brightness));
    }
    else if (doc.containsKey("speed")) {
      // Set scroll speed
      int speed = doc["speed"].as<int>();
      speed = constrain(speed, 10, 100);  // Ensure value is within range
      P.setSpeed(speed);
      Serial.println("Speed set to: " + String(speed));
    }
    else if (doc.containsKey("restart")) {
      // Restart the device
      Serial.println("Restarting device...");
      ESP.restart();
    }
    else if (doc.containsKey("reset")) {
      // Factory reset
      Serial.println("Performing factory reset...");
      SPIFFS.remove(CONFIG_FILE);
      ESP.restart();
    }
  } else {
    Serial.println("Error parsing command: " + String(error.c_str()));
  }
}

// Add a WiFi network to the configuration
void addWifiNetwork(const char* ssid, const char* password, bool remember) {
  // Find an empty slot or replace existing network with same SSID
  int slot = -1;
  for (int i = 0; i < MAX_NETWORKS; i++) {
    if (!wifiNetworks[i].enabled || strcmp(wifiNetworks[i].ssid, ssid) == 0) {
      slot = i;
      break;
    }
  }

  // If no slot found, use the first one (overwrite)
  if (slot == -1) slot = 0;

  // Save the network config
  strncpy(wifiNetworks[slot].ssid, ssid, sizeof(wifiNetworks[slot].ssid));
  strncpy(wifiNetworks[slot].password, password, sizeof(wifiNetworks[slot].password));
  wifiNetworks[slot].enabled = true;

  if (remember) {
    saveConfig();
  }

  // Try to connect to this network
  WiFi.begin(ssid, password);
}

// Connect to any available WiFi network
void connectToWifi() {
  P.print("WiFi...");

  Serial.println("Trying to connect to WiFi...");

  // Try each enabled network until one connects
  for (int i = 0; i < MAX_NETWORKS; i++) {
    if (wifiNetworks[i].enabled) {
      Serial.print("Trying network: ");
      Serial.println(wifiNetworks[i].ssid);

      WiFi.begin(wifiNetworks[i].ssid, wifiNetworks[i].password);

      // Wait up to 10 seconds for connection
      int attempts = 20;
      while (WiFi.status() != WL_CONNECTED && attempts > 0) {
        delay(500);
        Serial.print(".");
        attempts--;
      }

      if (WiFi.status() == WL_CONNECTED) {
        Serial.println("\nWiFi connected!");
        Serial.print("IP address: ");
        Serial.println(WiFi.localIP());

        P.print("Connected");
        delay(1000);

        // Send initial status update
        sendStatusUpdate();
        return;
      }

      Serial.println("\nFailed to connect to this network");
    }
  }

  // If we get here, we couldn't connect to any network
  Serial.println("Failed to connect to any WiFi network");
  P.print("WiFi Failed");
  delay(1000);
}

// Check for serial commands
void checkSerialCommands() {
  if (Serial.available()) {
    String command = Serial.readStringUntil('\n');
    parseCommand(command);
  }
}

// Send status update to server
void sendStatusUpdate() {
  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
  WiFiClient client;

  String url = "http://" + String(serverConfig.serverIP) + ":" +
               String(serverConfig.serverPort) + "/api/device-status";

  http.begin(client, url);
  http.addHeader("Content-Type", "application/json");

  // Prepare JSON payload
  DynamicJsonDocument doc(1024);
  doc["ssid"] = WiFi.SSID();
  doc["ip"] = WiFi.localIP().toString();
  doc["rssi"] = WiFi.RSSI();  // Signal strength

  String payload;
  serializeJson(doc, payload);

  int httpCode = http.POST(payload);

  if (httpCode == 200) {
    Serial.println("Status update sent successfully");
  } else {
    Serial.println("Status update failed with code: " + String(httpCode));
  }

  http.end();
}

// Check for new messages from the server
void checkForNewMessages() {
  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
  WiFiClient client;

  String url = "http://" + String(serverConfig.serverIP) + ":" +
               String(serverConfig.serverPort) + "/api/current-message?device=esp8266";

  http.begin(client, url);
  int httpCode = http.GET();

  if (httpCode == 200) {
    String payload = http.getString();
    DynamicJsonDocument doc(1024);
    DeserializationError error = deserializeJson(doc, payload);

    if (!error) {
      // Update message if new one available
      if (doc.containsKey("message")) {
        String newMessage = doc["message"].as<String>();

        // Process emojis before comparing or displaying
        String processedMessage = replaceEmojis(newMessage);

        if (processedMessage != currentMessage) {
          currentMessage = processedMessage;
          P.displayReset();  // Reset the display to show the new message immediately
          Serial.println("New message received: " + newMessage);
        }
      }

      // Handle brightness settings if provided
      if (doc.containsKey("brightness")) {
        int brightness = doc["brightness"].as<int>();
        brightness = constrain(brightness, 0, 15);
        P.setIntensity(brightness);
      }

      // Handle scroll speed if provided
      if (doc.containsKey("speed")) {
        int speed = doc["speed"].as<int>();
        speed = constrain(speed, 10, 100);
        P.setSpeed(speed);
      }

      // Handle WiFi configuration updates
      if (doc.containsKey("wifi")) {
        JsonObject wifi = doc["wifi"];
        String ssid = wifi["ssid"].as<String>();
        String password = wifi["password"].as<String>();
        bool remember = wifi["remember"] | false;

        addWifiNetwork(ssid.c_str(), password.c_str(), remember);
      }
    } else {
      Serial.println("Error parsing JSON response");
    }
  } else {
    Serial.println("HTTP request failed with code: " + String(httpCode));
  }

  http.end();
}

// Save configuration to SPIFFS
bool saveConfig() {
  File configFile = SPIFFS.open(CONFIG_FILE, "w");
  if (!configFile) {
    Serial.println("Failed to open config file for writing");
    return false;
  }

  DynamicJsonDocument doc(1024);

  // Save WiFi networks
  JsonArray networks = doc.createNestedArray("networks");
  for (int i = 0; i < MAX_NETWORKS; i++) {
    if (wifiNetworks[i].enabled) {
      JsonObject network = networks.createNestedObject();
      network["ssid"] = wifiNetworks[i].ssid;
      network["password"] = wifiNetworks[i].password;
    }
  }

  // Save server config
  JsonObject server = doc.createNestedObject("server");
  server["ip"] = serverConfig.serverIP;
  server["port"] = serverConfig.serverPort;

  if (serializeJson(doc, configFile) == 0) {
    Serial.println("Failed to write to config file");
    return false;
  }

  configFile.close();
  return true;
}

// Load configuration from SPIFFS
bool loadConfig() {
  if (!SPIFFS.exists(CONFIG_FILE)) {
    Serial.println("Config file not found");
    return false;
  }

  File configFile = SPIFFS.open(CONFIG_FILE, "r");
  if (!configFile) {
    Serial.println("Failed to open config file");
    return false;
  }

  size_t size = configFile.size();
  std::unique_ptr<char[]> buf(new char[size]);
  configFile.readBytes(buf.get(), size);

  DynamicJsonDocument doc(1024);
  DeserializationError error = deserializeJson(doc, buf.get());

  if (error) {
    Serial.println("Failed to parse config file");
    return false;
  }

  // Clear existing networks
  for (int i = 0; i < MAX_NETWORKS; i++) {
    wifiNetworks[i].enabled = false;
  }

  // Load WiFi networks
  JsonArray networks = doc["networks"];
  int i = 0;
  for (JsonObject network : networks) {
    if (i < MAX_NETWORKS) {
      const char* ssid = network["ssid"];
      const char* password = network["password"];

      strncpy(wifiNetworks[i].ssid, ssid, sizeof(wifiNetworks[i].ssid));
      strncpy(wifiNetworks[i].password, password, sizeof(wifiNetworks[i].password));
      wifiNetworks[i].enabled = true;
      i++;
    }
  }

  // Load server config
  JsonObject server = doc["server"];
  const char* ip = server["ip"];
  strncpy(serverConfig.serverIP, ip, sizeof(serverConfig.serverIP));
  serverConfig.serverPort = server["port"];

  configFile.close();
  isConfigured = true;

  Serial.println("Configuration loaded successfully");
  return true;
}
