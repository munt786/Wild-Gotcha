# 🎯 WildGotcha: Mobile Wildlife Species Identification Application

A full-stack, "Gotcha"-style wildlife species identification mobile application that classifies **Mammals**, **Insects**, **Reptiles**, and **Arachnids** directly from camera captures or gallery photos.

Built with **React Native (Expo)**, **FastAPI**, **OpenCV**, **TensorFlow (MobileNetV2)**, and **MongoDB Atlas**.

---

## 📱 Features & Highlights

- **🎯 "Gotcha!" Scanning Experience:** Custom viewfinder with animated radar reticle, crosshairs, and dynamic shutter controls.
- **🔬 Computer Vision Preprocessing Pipeline:** Validates incoming payloads with OpenCV, resizes to canonical 224x224, converts BGR to RGB, and normalizes into `[-1.0, 1.0]`.
- **🧠 Taxonomic Deep Learning Engine:** TensorFlow MobileNetV2 with intelligent biological taxonomy classification:
  - 🦁 **Mammalia** (Golden Amber)
  - 🦋 **Insecta** (Emerald Neon)
  - 🦎 **Reptilia** (Toxic Lime)
  - 🕷️ **Arachnida** (Shadow Purple)
- **📖 WildDex Species Registry:** Tracks discovered species, confidence scores, natural habitats, diet, danger levels, and educational fun facts.
- **⚡ Async Database Pipeline:** MongoDB via Motor driver with automatic graceful in-memory caching fallback.
- **☁️ Cloud & Build Ready:** Configured with `render.yaml` for free backend hosting and `eas.json` for standalone Android `.apk` generation without needing local Android Studio.

---

## 🗂️ Project Architecture

```text
wild-gotcha/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   └── v1/
│   │   │       └── endpoints.py     # /identify, /scans, /stats
│   │   ├── core/
│   │   │   ├── config.py            # Environment & pydantic-settings
│   │   │   └── database.py          # Motor async MongoDB client & indexing
│   │   ├── models/
│   │   │   └── schemas.py           # SpeciesRecord, UserScan, IdentifyResponse
│   │   ├── services/
│   │   │   ├── image_processor.py   # OpenCV validation, resize 224x224, normalize
│   │   │   ├── classifier.py        # TensorFlow MobileNetV2 & taxonomy mapper
│   │   │   └── taxonomy_data.py     # ImageNet synsets to 4 taxonomy classes
│   │   └── main.py                  # FastAPI app entry point & CORS
│   ├── Dockerfile                   # Cloud container with OpenCV system libs
│   ├── requirements.txt             # Python backend dependencies
│   ├── .env.example                 # Sample configuration
│   └── test_api.py                  # Automated smoke test suite
├── mobile/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ScannerView.tsx      # Camera viewfinder with animated reticle
│   │   │   ├── ResultCard.tsx       # Gotcha creature discovery card
│   │   │   ├── DexGrid.tsx          # WildDex collection grid & category filters
│   │   │   └── TaxonomyBadge.tsx    # Vibrant taxonomy badge component
│   │   ├── services/
│   │   │   └── api.ts               # Multipart upload, error & timeout handler
│   │   ├── theme/
│   │   │   └── colors.ts            # Dark mode neon palette
│   │   └── types/
│   │       └── index.ts             # TypeScript interfaces
│   ├── App.tsx                      # Root navigation & state manager
│   ├── app.json                     # Expo & Android package configuration
│   ├── eas.json                     # EAS Build standalone APK profile
│   └── package.json                 # Mobile dependencies
├── render.yaml                      # Render deployment blueprint
└── README.md
```

---

## 🚀 Quick Start Guide (Testing Locally)

### 1. Backend Setup (FastAPI)

#### Prerequisites
Install Python 3.10 or 3.11 (if not already installed, download from [python.org](https://www.python.org/downloads/)).

#### Steps:
```bash
# Navigate to backend
cd backend

# Create and activate virtual environment
python -m venv venv
# On Windows PowerShell:
.\venv\Scripts\Activate.ps1
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install --upgrade pip
pip install -r requirements.txt

# (Optional) Copy .env.example to .env
cp .env.example .env

# Run automated smoke test
python test_api.py

# Start development server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
The API is now running at `http://localhost:8000`. You can inspect the interactive Swagger API documentation at:
👉 **`http://localhost:8000/docs`**

---

### 2. MongoDB Atlas Setup (Free Cloud Database)

You don't need any paid services! MongoDB Atlas offers a 100% free shared cluster (M0):
1. Sign up / log in at [cloud.mongodb.com](https://cloud.mongodb.com/).
2. Create a free **M0 Shared Cluster**.
3. Under **Database Access**, create a user (e.g. `trainer`) with password.
4. Under **Network Access**, add IP `0.0.0.0/0` (allow access from anywhere so Render and your local machine can connect).
5. Click **Connect** -> **Drivers (Python)** -> Copy the connection string:
   ```text
   mongodb+srv://trainer:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
6. Paste this URI into `backend/.env` as `MONGODB_URI`.
*(Note: If MongoDB is not configured or offline, the backend automatically uses an in-memory cache so your testing will never be blocked).*

---

### 3. Mobile App Setup (React Native / Expo)

1. Open a new terminal and navigate to the `mobile` folder:
   ```bash
   cd mobile
   npm install
   ```

2. Start the Expo development server:
   ```bash
   npx expo start
   ```

3. **Testing on your phone:**
   - Install **Expo Go** from Google Play Store or Apple App Store.
   - Scan the QR code displayed in your terminal using the Expo Go app (on Android) or the Camera app (on iOS).
   - Ensure your phone and laptop are on the same Wi-Fi network.
   - In the mobile app header, tap the **API OFFLINE / API LIVE** status badge and enter your laptop's local IP (e.g., `http://192.168.1.15:8000`).

---

## ☁️ Deploying the Backend to Render (Free Tier)

Render allows you to host the FastAPI backend for free connected directly to your GitHub repository:

1. **Push your code to GitHub:**
   ```bash
   git add .
   git commit -m "Scaffold WildGotcha app"
   git remote add origin https://github.com/<your-username>/wild-gotcha.git
   git push -u origin main
   ```

2. **Deploy on Render:**
   - Log into [render.com](https://render.com).
   - Click **New +** -> **Blueprint**.
   - Connect your GitHub repository `wild-gotcha`.
   - Render will automatically detect `render.yaml` and set up the `wildgotcha-api` web service!
   - In Render Dashboard under **Environment**, set:
     - `MONGODB_URI`: `<Your MongoDB Atlas connection string>`
   - Click **Apply**.
   - Your API will be live at `https://wildgotcha-api.onrender.com`!

3. **Update Mobile App:**
   - Inside the mobile app, tap the connection badge in the top right and enter your Render URL (`https://wildgotcha-api.onrender.com`). Now your mobile app can scan wildlife from anywhere in the world!

---

## 📦 Compiling Standalone Android APK (EAS Build)

You can build a standalone installable `.apk` file directly in the cloud using Expo Application Services (EAS)—**no Android Studio or heavy local SDK required!**

### Step-by-Step APK Generation:

1. **Install EAS CLI globally:**
   ```bash
   npm install -g eas-cli
   ```

2. **Log into or register your free Expo account:**
   ```bash
   eas login
   ```

3. **Configure EAS Project (First time only):**
   ```bash
   cd mobile
   eas project:init
   ```

4. **Trigger the standalone APK build:**
   ```bash
   eas build -p android --profile preview
   ```
   > 💡 **Why `--profile preview`?**
   > In `mobile/eas.json`, the `preview` profile is configured with `"buildType": "apk"`. This compiles a direct installable `.apk` file instead of an `.aab` Google Play store bundle!

5. **Download & Install:**
   - Once EAS finishes building (typically 5–10 minutes in the cloud), it will print a direct download URL and QR code in the terminal.
   - Open the link on your Android phone, download `wildgotcha.apk`, and tap to install!

---

## 🧪 API Endpoints Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Server & MongoDB connection status |
| `POST` | `/api/v1/identify` | Multipart upload photo, runs OpenCV & MobileNetV2, saves scan to Dex |
| `GET` | `/api/v1/scans` | Get collection history of all identified creatures |
| `GET` | `/api/v1/stats` | Aggregate breakdown across Mammalia, Insecta, Reptilia, Arachnida |
