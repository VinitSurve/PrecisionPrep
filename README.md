# 🎯 PrecisionPrep  
*A Smart PWA to Supercharge Exam Prep*

**PrecisionPrep** is a **Progressive Web App** built to help entrance exam aspirants **track, analyze, and optimize** their study routines. With intelligent insights, real-time performance tracking, and responsive design, PrecisionPrep transforms preparation into precision.

---

## 🚀 Core Features

### 🔐 1. User Authentication
- Sign up / Login with Supabase Auth  
- Secure password storage  
- Session persistence across devices

### 🧭 2. Onboarding Flow
- Smooth setup for first-time users  
- Select entrance exam (e.g. NIMCET, MHT-CET MCA)  
- Configure theme (🌙 Dark / ☀️ Light / 🖥️ System)  
- Auto-subject setup based on selected exam

### ⏱️ 3. Smart Subject Timer
- Track study time per subject  
- Target time for each question  
- Record accuracy & speed metrics  
- ⚡ Fast/Slow visual feedback  
- 🎯 Real-time comparison against target

### 📊 4. Dashboard Analytics
- Study session summary  
- Interactive visual charts  
- Time trends and productivity overview  
- 📤 Export progress as JSON/CSV *(planned)*

### 📈 5. Deep Subject Analytics
- Pie charts for time spent per subject  
- Breakdown by session frequency  
- Accuracy vs speed performance graphs  
- Hover/tap for in-depth insights  
- 📊 Recharts for dynamic data viz

### ⚙️ 6. Personalized Settings
- Entrance exam reconfiguration  
- Theme toggle (🌗 Light / Dark / System sync)  
- Manage default/custom subjects  
  - ➕ Add / ❌ Delete  
  - ✅ Activate / 🚫 Deactivate  
- Sign-out & account control

### 🧩 7. PWA Capabilities
- ✅ Offline-ready  
- 📲 Installable across devices  
- 🧠 Memory caching & persistent sessions  
- 🔔 Push notifications *(planned)*

### 💎 8. Enhanced UX/UI
- Responsive mobile-first layout  
- Smooth navigation flow  
- ⛑️ Friendly error handling & feedback  
- 🔄 Tab visibility detection for auto-refresh  
- Clean layout powered by Vite + Custom CSS Themes

---

## 🛠️ Tech Stack

| Tech              | Role                         |
|-------------------|------------------------------|
| ⚛️ React.js       | UI and routing               |
| 🌐 Supabase       | Backend, Auth, PostgreSQL     |
| 📦 Vite           | Build tool & bundler         |
| 📈 Recharts       | Data visualizations          |
| 🧠 React Context  | Global state management      |
| 🎨 CSS Variables  | Theming                      |
| 🌍 vite-plugin-pwa| PWA integration              |

---

## 🗄️ Database Schema

| Table              | Purpose                                |
|--------------------|----------------------------------------|
| `user_preferences` | Theme + exam settings per user         |
| `subjects`         | Track all subjects (default/custom)    |
| `exam_subjects`    | Standard subjects mapped to exams      |
| `sessions`         | Stores study sessions and metrics      |

---

## 🚧 Future Enhancements

- 👥 Collaborative study groups  
- ⏳ Spaced repetition support  
- 📚 Question bank integration  
- 📈 AI-driven performance predictions  
- 📅 Custom study schedules  
- 📱 Native mobile versions *(Flutter/Firebase)*
