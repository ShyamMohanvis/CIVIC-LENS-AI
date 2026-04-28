# AI-Powered Urban Intelligence & Smart Road Safety Monitoring System

## 1️⃣ Complete System Overview

Civic Lens AI 2.0 is an integrated smart-city intelligence platform that combines AI-based accident detection, citizen-reported infrastructure issues, real-time geospatial visualization, automated emergency alerts, and predictive trend analytics into a unified urban control-room dashboard.

It simulates how a municipal smart control center would operate.

## 2️⃣ Core Objectives

*   Detect road accidents in real time using Computer Vision.
*   Classify civic issues using image-based AI.
*   Provide real-time city-wide monitoring dashboard.
*   Automatically trigger emergency alerts.
*   Generate trend analysis and AI-based intelligence summaries.
*   Help authorities make data-driven decisions.

## 3️⃣ High-Level System Architecture

```text
                ┌────────────────────────┐
                │   CCTV Camera Feed     │
                │   Citizen Upload       │
                └────────────┬───────────┘
                             ↓
                  Frame Processing (OpenCV)
                             ↓
                   YOLO Object Detection
                             ↓
           Accident / Civic Issue Classification
                             ↓
                     Severity Estimation
                             ↓
                    Geo-Tagging (GPS API)
                             ↓
                        MongoDB Storage
                             ↓
     ┌───────────────┬───────────────┬───────────────┐
     ↓               ↓               ↓               ↓
  SMS Engine     Trend Engine     AI Summary Engine
     ↓               ↓               ↓               ↓
               React Control Dashboard
```

## 4️⃣ Complete Module Breakdown

### 🔹 Module 1 – Accident Detection Engine
*   **Purpose:** Detect real-time vehicle collisions from CCTV footage.
*   **Technologies:** YOLOv8, OpenCV, Python, REST API
*   **Flow:**
    1.  CCTV feed captured.
    2.  Video frames extracted every X milliseconds.
    3.  YOLO detects: Car, Bike, Bus, Person.
    4.  Collision logic applied: Bounding box overlap, Sudden stop detection, High motion change.
    5.  If conditions satisfied → Accident event triggered.
*   **Output:**
```json
{
  "type": "accident",
  "severity": "high",
  "latitude": 26.8123,
  "longitude": 80.8972,
  "timestamp": "2026-02-28T20:30:12"
}
```

### 🔹 Module 2 – Civic Issue Detection Engine
*   **Purpose:** Allow citizens to upload images of civic problems.
*   **Detected Categories:** Pothole, Garbage, Broken streetlight, Water leakage
*   **Flow:** User Upload → AI Model → Classification → Store with Geo-location
*   **Stored fields:** Issue Type, Location, Image URL, Status (Pending / Resolved), Severity Score

### 🔹 Module 3 – Geo-Intelligence Layer
This is the heart of Civic Lens AI 2.0.

*   **Features:**
    1.  **Interactive Map:** Accident markers (red flashing), Civic issue markers (color coded), Cluster grouping, Heatmap view
    2.  **Layer Toggle System:** Accident Layer, Pothole Layer, Garbage Layer, Risk Heatmap, Trend Overlay

### 🔹 Module 4 – SMS Alert System
*   **Purpose:** Reduce emergency response time.
*   **Trigger Logic:** If accident severity = HIGH → Send SMS to emergency contact.
*   **Message Format:**
```text
🚨 Emergency Alert
Major accident detected at Alambagh Crossing.
Time: 8:42 PM
Coordinates: 26.8123, 80.8972
```
*   **SMS APIs:** Twilio, Fast2SMS, MSG91
*   **Logging:** All alerts logged in database.

### 🔹 Module 5 – Trend Analysis Engine
This converts raw data into intelligence.

*   **What It Tracks:** Daily accident count, Weekly accident trend, Ward-wise issue density, Night vs Day incidents, Complaint resolution rate
*   **Formula Example:** `Trend % = (Today - 7DayAvg) / 7DayAvg × 100`
*   **Output Example:**
    *   Accidents increased by 22%
    *   Potholes decreased by 12%
    *   Ward 12 is emerging hotspot
*   **Displayed using:** Line charts, Bar charts, Risk arrows

### 🔹 Module 6 – AI City Summary Generator
*   **Purpose:** Generate daily municipal intelligence brief.
*   **Input:** Total accidents, Risk zones, Trend percentage, Complaint stats
*   **Output Example:**
> “In the last 24 hours, the city recorded 14 accidents, showing a 25% increase compared to last week. Alambagh and Hazratganj remain high-risk zones. Infrastructure complaints remain stable.”
*   **Implementation:** Can be a Rule-based template or LLM-generated (Ollama/OpenAI)

### 🔹 Module 7 – Urban Risk Score Engine
Predictive intelligence layer.

*   **Example Formula:**
    `Urban Risk Score = (Accidents × 0.4) + (Infrastructure Complaints × 0.3) + (Night Incidents × 0.2) + (Weather Impact × 0.1)`
*   **Score Range:**
    *   0–30 → Low
    *   31–60 → Medium
    *   61–100 → High
*   **Display:** Displayed as circular gauge.

## 5️⃣ Database Structure (MongoDB)

*   **Accidents Collection:** `_id`, `severity`, `location`, `timestamp`, `status`
*   **CivicIssues Collection:** `_id`, `category`, `imageUrl`, `location`, `severity`, `status`
*   **Alerts Collection:** `accidentId`, `smsStatus`, `sentAt`
*   **DailyStats Collection:** `date`, `accidentCount`, `complaintCount`, `riskScore`

## 6️⃣ Tech Stack Summary

*   **Frontend:** React, MapLibre / Google Maps, Chart.js / Recharts, WebSocket
*   **Backend:** Node.js, Express, MongoDB
*   **AI:** YOLOv8, OpenCV, Python FastAPI service
*   **Deployment:** Render / AWS / Railway

## 7️⃣ Complete End-to-End Flow (Simulation)

1.  Accident occurs.
2.  CCTV feed captures collision.
3.  YOLO detects abnormal vehicle overlap.
4.  Severity classified as HIGH.
5.  Backend receives event.
6.  SMS alert triggered.
7.  Marker appears on map.
8.  Risk score recalculated.
9.  Trend updated.
10. AI summary regenerated.
11. Entire process automated.

## 8️⃣ Why Civic Lens AI 2.0 Is Advanced
It combines Computer Vision, Real-Time Systems, Geospatial Analytics, Alert Automation, Predictive Modeling, AI Text Generation, and Full-Stack Engineering into one integrated system.
