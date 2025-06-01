# PrecisionPrep Timer Tracker PWA

A Progressive Web App (PWA) built with React, Vite, Supabase, and CSS to track your PrecisionPrep question-solving speed and accuracy manually. This app allows users to time themselves, evaluate performance (fast/slow & correct/incorrect), and view detailed personal statistics.

## Features

- ✅ User authentication with email/password via Supabase
- ✅ Timer with preferred time and speed logic
- ✅ Session data stored in Supabase
- ✅ Dashboard with stats and graphs
- ✅ App installable as a PWA
- ✅ Dark/Light theme toggle
- ✅ CSV export feature
- ✅ Responsive layout on all screen sizes

## Setup Instructions

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Supabase account

### Installation

1. Clone this repository
2. Install dependencies:
   ```
   npm install
   ```
3. Create a Supabase project and set up the following:
   - Authentication with email/password
   - Create a `sessions` table with the following columns:
     - id (uuid, primary key)
     - user_id (uuid, references auth.users.id)
     - time_taken (int)
     - was_correct (boolean)
     - auto_evaluated (boolean)
     - preferred_time (int)
     - speed (text)
     - created_at (timestamp)
   - Set up RLS policies:
     - Allow session creation for authenticated users
     - Users can manage their own sessions

4. Create a `.env` file in the root directory with your Supabase credentials:
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

5. Start the development server:
   ```
   npm run dev
   ```

6. Build for production:
   ```
   npm run build
   ```

## Usage

1. Sign up or log in to your account
2. On the Timer page:
   - Set your preferred time (e.g., 1:30 minutes)
   - Start the timer when you begin solving a question
   - Stop the timer when you finish
   - The app will mark your speed as "fast" or "slow" based on your target time
   - Select whether your answer was correct or incorrect
3. On the Dashboard:
   - View your total sessions, accuracy percentage, and average time
   - Analyze your performance with bar and line charts
   - Export your data as CSV if needed

## Project Structure

```
src/
├── components/
│   ├── Timer.jsx
│   ├── DashboardStats.jsx
│   └── Navbar.jsx
├── pages/
│   ├── Login.jsx
│   ├── Signup.jsx
│   ├── Dashboard.jsx
│   └── TimerPage.jsx
├── supabase/
│   └── client.js
├── App.jsx
├── index.css
└── main.jsx
```

## License

MIT
