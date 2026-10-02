const mqtt = require("mqtt");

const brokerUrl = "mqtt://localhost:1883";
const topic = "taxis/vehicle/VT001/telemetry";

const telemetry = {
	vehicleId: "VT001",
	timestamp: new Date().toISOString(),
	latitude: 51.5074,
	longitude: -0.1278,
	speed: 32.5,
	batteryLevel: 87,
	temperature: 24.6,
	status: "available"
};

const client = mqtt.connect(brokerUrl);

client.on("connect", () => {
	console.log("Connected to MQTT broker");

	client.publish(topic, JSON.stringify(telemetry), { qos: 0 }, (error) => {
		if (error) {
			console.error("Publish failed:", error.message);
			client.end();
			process.exitCode = 1;
			return;
		}

		console.log(`Published message to: ${topic}`);
		console.log(JSON.stringify(telemetry, null, 2));
		client.end();
	});
});

client.on("error", (error) => {
	console.error("MQTT connection error:", error.message);
	client.end();
	process.exitCode = 1;
});
