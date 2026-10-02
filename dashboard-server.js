const fs = require("fs");
const http = require("http");
const path = require("path");
const mqtt = require("mqtt");

const host = "127.0.0.1";
const port = Number(process.env.PORT || 3000);
const topic = "taxis/vehicle/+/telemetry";
const dashboardPath = path.join(__dirname, "dashboard.html");
const clients = new Set();
let brokerConnected = false;

const mqttClient = mqtt.connect(process.env.MQTT_URL || "mqtt://127.0.0.1:1883", {
	clientId: `fleetpulse-web-${process.pid}`,
	connectTimeout: 5000,
	reconnectPeriod: 2000
});

function sendEvent(event) {
	const message = `data: ${JSON.stringify(event)}\n\n`;
	for (const response of clients) {
		response.write(message);
	}
}

function sendJson(response, statusCode, value) {
	response.writeHead(statusCode, {
		"Content-Type": "application/json; charset=utf-8",
		"Cache-Control": "no-store"
	});
	response.end(JSON.stringify(value));
}

mqttClient.on("connect", () => {
	brokerConnected = true;
	mqttClient.subscribe(topic, { qos: 0 }, (error) => {
		if (error) {
			console.error("MQTT subscribe failed:", error.message);
			return;
		}
		console.log(`MQTT connected; subscribed to ${topic}`);
		sendEvent({ type: "broker", connected: true });
	});
});

mqttClient.on("message", (receivedTopic, payload) => {
	try {
		const telemetry = JSON.parse(payload.toString());
		if (!telemetry.vehicleId || !telemetry.timestamp) {
			return;
		}
		sendEvent({ type: "telemetry", telemetry, topic: receivedTopic });
	} catch (error) {
		console.warn("Ignored invalid MQTT telemetry:", error.message);
	}
});

mqttClient.on("close", () => {
	if (brokerConnected) {
		brokerConnected = false;
		sendEvent({ type: "broker", connected: false });
	}
});

mqttClient.on("error", (error) => {
	console.warn("MQTT connection issue:", error.message);
});

const server = http.createServer((request, response) => {
	const requestUrl = new URL(request.url, `http://${host}:${port}`);

	if (request.method === "GET" && requestUrl.pathname === "/api/health") {
		sendJson(response, 200, { ok: true, brokerConnected });
		return;
	}

	if (request.method === "GET" && requestUrl.pathname === "/events") {
		response.writeHead(200, {
			"Content-Type": "text/event-stream; charset=utf-8",
			"Cache-Control": "no-cache, no-transform",
			Connection: "keep-alive"
		});
		response.write(`data: ${JSON.stringify({ type: "broker", connected: brokerConnected })}\n\n`);
		clients.add(response);
		request.on("close", () => clients.delete(response));
		return;
	}

	if (request.method === "POST" && requestUrl.pathname === "/api/test-publish") {
		if (!mqttClient.connected) {
			sendJson(response, 503, { error: "The local MQTT broker is unavailable." });
			return;
		}

		const telemetry = {
			vehicleId: "VT001",
			timestamp: new Date().toISOString(),
			latitude: 51.48 + Math.random() * 0.06,
			longitude: -0.17 + Math.random() * 0.08,
			speed: Math.round(18 + Math.random() * 28),
			batteryLevel: Math.round(65 + Math.random() * 30),
			temperature: Math.round((20 + Math.random() * 8) * 10) / 10,
			status: "available"
		};

		mqttClient.publish(
			`taxis/vehicle/${telemetry.vehicleId}/telemetry`,
			JSON.stringify(telemetry),
			{ qos: 0 },
			(error) => {
				if (error) {
					sendJson(response, 500, { error: "Could not publish the test telemetry." });
					return;
				}
				sendJson(response, 202, { published: true, telemetry });
			}
		);
		return;
	}

	if (request.method === "GET" && (requestUrl.pathname === "/" || requestUrl.pathname === "/dashboard")) {
		response.writeHead(200, {
			"Content-Type": "text/html; charset=utf-8",
			"Cache-Control": "no-cache"
		});
		fs.createReadStream(dashboardPath).pipe(response);
		return;
	}

	sendJson(response, 404, { error: "Not found" });
});

server.listen(port, host, () => {
	console.log(`FleetPulse dashboard: http://${host}:${port}`);
});

function shutdown() {
	for (const response of clients) {
		response.end();
	}
	mqttClient.end(true);
	server.close(() => process.exit(0));
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);