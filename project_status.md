# 4.2D Project Status Update

## IoT-Based Driverless Taxi System for a Smart City

**Student:** [Your full name]  
**Student ID:** [Your student ID]  
**Unit:** Software Architecture and Scalability  
**Assessment:** 4.2D Project Status Update  
**Date:** 27 September 2026  

---

## 1. Introduction

My project is an IoT-based driverless taxi system for a smart city. The purpose of the project is to simulate a fleet of driverless taxis sending sensor information to a backend system. The system is simulated in software, so I am not building or controlling a real self-driving vehicle.

The simulated taxi data includes the vehicle ID, timestamp, GPS location, speed, battery level, temperature and current status. The main technologies I plan to use are Node.js, MQTT, Node-RED, microservices and AWS. These technologies are suitable for this project because MQTT is designed for lightweight IoT communication, Node.js can simulate many vehicles, Node-RED can process messages visually, and cloud services can support future scalability.

I started the practical implementation later than I originally intended. Because of this, I changed my first milestone to focus on a small but working demonstration. My current goal is to prove the basic communication path before adding the larger fleet, alerting, booking, analytics and cloud features.

The current communication path is:

```text
Node.js taxi simulator -> Mosquitto MQTT broker -> Node-RED -> Debug output
```

This status update explains what I have completed, what I researched, the blockers I experienced, my revised timeline and the work that remains.

---

## 2. Project Research and Design Decisions

Before implementing the prototype, I researched the main technologies and how they could fit into the system.

### 2.1 MQTT research

I researched MQTT as the communication protocol between the simulated taxis and the backend. MQTT uses a publisher, a broker and subscribers. In my design, the taxi simulator is the publisher, Mosquitto is the local broker, and Node-RED is a subscriber.

MQTT is useful for this project because messages are small and the publisher does not need to know the exact application that will process the data. This should make it easier to add monitoring, alerting and analytics services later.

For the first prototype, I selected this topic:

```text
taxis/vehicle/VT001/telemetry
```

The topic includes the taxi ID and the type of data being sent. Later, I can use a wildcard topic such as the following to receive messages from all vehicles:

```text
taxis/vehicle/+/telemetry
```

### 2.2 Node.js research

I selected Node.js for the taxi simulator because it is lightweight and has a suitable MQTT library called `mqtt`. It also makes it possible to create several simulated taxis later without needing physical hardware.

The first version only publishes one message. This keeps the first test simple and makes it easier to identify whether a problem is caused by the simulator, the broker or Node-RED.

### 2.3 Node-RED research

I researched Node-RED as a visual tool for receiving and processing IoT messages. My initial flow contains three nodes:

```text
MQTT In -> JSON -> Debug
```

The MQTT In node subscribes to the taxi topic. The JSON node converts the received text into a JSON object. The Debug node displays the fields so that I can confirm the message has been received and parsed correctly.

### 2.4 AWS and local development research

I researched possible AWS services for a later version of the system. AWS IoT Core could provide a managed MQTT endpoint. AWS Lambda could process events, DynamoDB or Timestream could store telemetry, and CloudWatch could be used for monitoring.

I decided to begin locally with Mosquitto instead of deploying to AWS immediately. This reduces the setup complexity and avoids unexpected cloud costs while I am still testing the basic application. AWS remains part of my planned architecture rather than a completed implementation at this stage.

### 2.5 Planned microservices

The planned application contains the following services:

- **Vehicle Monitoring Service:** receives and checks live taxi telemetry.
- **Alert Service:** detects conditions such as low battery, high temperature or excessive speed.
- **Booking Service:** handles simulated passenger booking requests.
- **Analytics Service:** calculates information such as taxi usage, journeys and battery trends.

These services are planned rather than completed. My current prototype is focused on the shared telemetry communication that these services will eventually use.

---

## 3. Work Completed So Far

### 3.1 Created the Node.js project

I created the project in the `DriverlessTaxiSystem` folder and initialised the Node.js application. I added an npm project configuration and installed the MQTT.js dependency.

The project currently contains:

- `index.js`
- `package.json`
- `package-lock.json`
- `node-red-flow.json`
- `node_modules/`

The project can be started using:

```bash
npm start
```

### 3.2 Created a one-taxi simulator

I created `index.js` to simulate one taxi with the ID `VT001`. The simulator connects to the local MQTT broker and publishes one JSON message.

The message contains the required fields:

```json
{
  "vehicleId": "VT001",
  "timestamp": "2026-09-27T00:54:53.748Z",
  "latitude": 51.5074,
  "longitude": -0.1278,
  "speed": 32.5,
  "batteryLevel": 87,
  "temperature": 24.6,
  "status": "available"
}
```

The timestamp is generated automatically, so it changes each time the simulator runs.

### 3.3 Installed MQTT.js

I installed the MQTT.js package using npm. This allowed the Node.js program to connect to the broker and publish the telemetry message.

During the initial setup, I encountered a JavaScript/runtime error while testing `index.js`. I checked the MQTT dependency and the connection settings, corrected the problem and ran the simulator again. After fixing it, the script started successfully and published the telemetry message to the broker.

### 3.4 Installed and started Mosquitto

I installed Mosquitto locally on my Mac using Homebrew. The Homebrew background service initially failed to start because of a macOS launch service error. I worked around this by starting Mosquitto directly as a daemon.

The broker is configured to use:

```text
Host: localhost
Port: 1883
```

This gave me a local MQTT environment for development and testing.

### 3.5 Successfully tested the simulator

The simulator successfully connected to Mosquitto and published the taxi message. The terminal output was:

```text
Connected to MQTT broker
Published message to: taxis/vehicle/VT001/telemetry
```

This confirms that the Node.js application can communicate with the local MQTT broker.

**[Insert Screenshot 1 here: Terminal showing `npm start` and the successful publish message.]**

### 3.6 Created the Node-RED flow

I created an importable Node-RED flow in `node-red-flow.json`. The intended flow is:

```text
Taxi telemetry -> Parse JSON -> Vehicle telemetry
```

The MQTT broker settings in the flow are:

```text
Broker: localhost
Port: 1883
Topic: taxis/vehicle/VT001/telemetry
```

I also validated that the flow file is valid JSON and that the broker is configured as `localhost:1883`.

**[Insert Screenshot 2 here: Node-RED canvas showing MQTT In, JSON and Debug nodes.]**

### 3.7 Node-RED blocker identified

When I tested the Node-RED flow, the Debug panel displayed the following message:

```text
27/09/2026, 11:04:36 [node: JSON] msg : string[16]
"No url specified"
```

The same message was also displayed at 11:03:10. This showed that Node-RED was not processing the taxi JSON payload as expected. The message looks like an HTTP-request configuration error rather than a problem with the taxi JSON itself.

I checked the flow configuration and corrected the broker value from `mqtt://localhost` to the Node-RED format `localhost`, with port `1883` configured separately. I also set the MQTT input to pass UTF-8 text to the JSON parser.

The likely cause is that the active Node-RED canvas still contains an older or incorrectly configured node, possibly an HTTP Request node that has been labelled `JSON`. The clean flow should contain only these three nodes:

```text
MQTT In -> JSON -> Debug
```

The Node.js simulator and MQTT broker are working independently, but Node-RED still needs to be redeployed with the corrected flow and checked again.

**[Insert Screenshot 3 here: Node-RED Debug panel showing the `No url specified` blocker.]**

---

## 4. Current Status

| Project area | Status | My current position |
|---|---|---|
| Project folder and npm setup | Completed | The Node.js project has been created. |
| MQTT.js dependency | Completed | MQTT.js is installed and available. |
| One taxi simulator | Completed | `VT001` publishes one telemetry message. |
| JSON telemetry format | Completed | All planned initial fields are included. |
| Mosquitto broker | Completed | Local broker is installed and runs on port 1883. |
| Node.js to MQTT test | Completed | The simulator successfully published a message. |
| Node-RED flow file | Mostly completed | The importable flow has been created and corrected. |
| Node-RED debug output | Blocked | The `No url specified` message still needs to be resolved in the active flow. |
| Continuous taxi publishing | Not started | Planned after the first message path is stable. |
| Multiple taxi simulation | Not started | Planned after continuous publishing. |
| Alert service | Not started | Planned. |
| Booking service | Not started | Planned. |
| Analytics service | Not started | Planned. |
| Database storage | Not started | Planned. |
| AWS deployment | Not started | Research and design only at this stage. |
| Scalability testing | Not started | Planned after the fleet simulator is available. |
| Final documentation | In progress | This status update is the first major document draft. |

Overall, I have completed the first part of the prototype. The main achievement is that a simulated taxi can publish structured telemetry to an MQTT broker. The main incomplete part is confirming the same message in Node-RED.

---

## 5. Challenges and Blockers

### 5.1 Starting late

I started the practical project work later than planned. This has reduced the time available for implementing all four microservices and deploying to AWS. I have responded by reducing the first milestone to the smallest working demo and by using a local broker before attempting cloud deployment.

### 5.2 Local MQTT service setup

Installing the tools took longer than expected because Mosquitto's Homebrew service did not start normally. The service returned a macOS launch error. I was able to start Mosquitto directly as a daemon, which allowed the MQTT test to work.

### 5.3 Understanding configuration differences

Node.js MQTT.js uses a URL such as:

```text
mqtt://localhost:1883
```

Node-RED uses separate broker and port settings:

```text
Broker: localhost
Port: 1883
```

Mixing these formats caused confusion while configuring the flow. I corrected the saved flow file, but I still need to make sure the corrected version is the one deployed in the Node-RED editor.

### 5.4 Node-RED `No url specified` blocker

The exact current blocker is:

```text
[node: JSON] msg : string[16]
"No url specified"
```

This error is appearing at the node labelled `JSON`. Based on the message, I believe the active flow contains an incorrectly configured HTTP Request node or an old node that is not the standard Node-RED JSON node. The intended flow does not need an HTTP Request node.

My next troubleshooting steps are to remove the old nodes, import the corrected `node-red-flow.json` file, configure the broker as `localhost` with port `1883`, deploy the flow and run `npm start` again.

### 5.5 AWS complexity and cost

I have not deployed to AWS yet because cloud MQTT certificates, permissions and billing controls add complexity at this early stage. I believe it is more responsible to prove the local application first. I will either deploy selected components to AWS later or document the AWS architecture clearly if the available time does not allow a safe deployment.

---

## 6. Revised Timeline and Remaining Work

Because I started late, I have revised the timeline to focus on working features in small stages.

| Period | Revised task | Expected result |
|---|---|---|
| 27-29 September 2026 | Resolve the Node-RED flow and capture evidence | MQTT message visible in Node-RED Debug. |
| 30 September-4 October | Change the simulator to publish continuously | One taxi sends telemetry at regular intervals. |
| 5-9 October | Add several simulated taxis | Multiple vehicle IDs publish to MQTT. |
| 10-14 October | Add Node-RED alert rules | Low battery and high temperature alerts. |
| 15-19 October | Add telemetry storage | Historical taxi data is saved. |
| 20-24 October | Create the Booking Service | A basic simulated booking can be created. |
| 25-29 October | Create the Analytics Service | Taxi usage and performance data is summarised. |
| 30 October-3 November | Run scalability tests | Results are collected for increasing taxi numbers. |
| 4-7 November | Investigate AWS deployment | Selected services are deployed or documented. |
| 8-12 November | Complete testing and final report | Final evidence, architecture diagrams and discussion. |

The revised order is important because the later services depend on a reliable telemetry flow. I will not try to implement the booking, analytics and cloud parts before the MQTT and Node-RED foundation is stable.

### Remaining technical tasks

1. Remove or replace the incorrectly configured Node-RED node causing `No url specified`.
2. Confirm the MQTT In node uses the topic `taxis/vehicle/VT001/telemetry`.
3. Capture the successful Node-RED Debug output.
4. Change the simulator from one message to continuous publishing.
5. Add random but controlled changes to speed, location, battery and temperature.
6. Add multiple taxi IDs and subscribe with an MQTT wildcard.
7. Add low-battery, high-temperature and offline-vehicle alerts.
8. Add a simple storage solution for historical telemetry.
9. Build the Booking and Analytics microservices.
10. Test performance with 1, 5, 10 and 50 simulated taxis.
11. Compare local deployment with the planned AWS architecture.
12. Complete the final report and presentation evidence.

---

## 7. Evidence Appendix

### Evidence A: Project files

**[Insert Screenshot A1 here]**

This screenshot should show the `DriverlessTaxiSystem` folder containing `index.js`, `package.json` and `node-red-flow.json`.

### Evidence B: Installed dependency

**[Insert Screenshot A2 here]**

This screenshot should show the npm installation or the project terminal confirming that MQTT.js is installed.

### Evidence C: Mosquitto broker

**[Insert Screenshot A3 here]**

This screenshot should show Mosquitto running locally on port `1883`.

### Evidence D: Successful taxi publish

**[Insert Screenshot A4 here]**

This screenshot should show:

```text
Connected to MQTT broker
Published message to: taxis/vehicle/VT001/telemetry
```

### Evidence E: Node-RED flow

**[Insert Screenshot A5 here]**

This screenshot should show the corrected flow:

```text
MQTT In -> JSON -> Debug
```

### Evidence F: Node-RED blocker

**[Insert Screenshot A6 here]**

This screenshot should show the exact error received on 27/09/2026:

```text
"No url specified"
```

### Evidence G: Successful Node-RED output

**[Insert Screenshot A7 here]**

This screenshot will be added after the blocker is resolved. It should show the parsed fields including `vehicleId`, `latitude`, `speed`, `batteryLevel`, `temperature` and `status`.

---

## 8. Conclusion

My project is currently at the early prototype stage. I have created the Node.js project, installed MQTT.js, installed Mosquitto, created a one-taxi simulator and successfully published a structured JSON telemetry message to a local MQTT broker.

I have also created the first Node-RED flow. The main blocker is the `No url specified` message appearing in the Node-RED Debug panel. I have identified this as a Node-RED flow or node configuration problem rather than a problem with the Node.js simulator. The corrected flow uses an MQTT In node, a standard JSON node and a Debug node, with the broker configured as `localhost` and port `1883`.

I am behind my original schedule because I started late and needed time to understand the different tools. However, I now have a working foundation and a clearer implementation order. My immediate priority is to resolve the Node-RED blocker and capture evidence of the complete message path. After that, I will expand the prototype into a small fleet and add alerting, storage, microservices, scalability testing and, if practical, AWS deployment.

The current result is limited, but it is a genuine working first step. It demonstrates that the project can generate simulated vehicle data and send it through an IoT communication protocol. The revised timeline gives me a realistic plan for catching up while keeping the scope connected to the original project goal.
