# ChatWebX

ChatWebX is a modern, real-time chat platform built with Next.js, Supabase, and Google Gemini AI. It combines seamless real-time communication with advanced AI capabilities like intelligent message suggestions and image generation.

## 🚀 Features

- **Real-time Messaging:** Instant message delivery and updates powered by Supabase Realtime.
- **AI-Powered Suggestions:** Get smart, context-aware message replies using Google's Gemini Pro model.
- **AI Image Generation:** Generate images directly within the chat interface using Gemini 2.0 Flash.
- **Robust Authentication:** Secure user sign-up, login, and password management via Supabase Auth.
- **Responsive UI:** A polished, mobile-friendly interface built with Tailwind CSS v4 and Radix UI primitives.
- **User Profiles:** Manage user identity and settings.
- **Persistent Chat History:** Seamless access to previous conversations stored in Supabase.

## 🛠️ Tech Stack

- **Framework:** [Next.js 15 (App Router)](https://nextjs.org/)
- **Language:** [TypeScript](https://www.typescriptlang.org/)
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/)
- **Database & Auth:** [Supabase](https://supabase.com/)
- **AI Integration:** [Google Gemini API](https://ai.google.dev/)
- **Components:** [Radix UI](https://www.radix-ui.com/) & [Lucide React Icons](https://lucide.dev/)
- **State Management:** React Hooks & Supabase Client

## 🏁 Getting Started

### Prerequisites

- Node.js (v20 or later)
- A Supabase account and project
- A Google AI (Gemini) API key

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/chatwebx.git
   cd chatwebx
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   Create a `.env.local` file in the root directory and add the following:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   GEMINI_API_KEY=your_gemini_api_key
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser to see the results.

## 📂 Project Structure

- `app/`: Next.js App Router pages and API routes.
- `components/`: Reusable UI components (Chat interface, Auth forms, etc.).
- `hooks/`: Custom React hooks for data fetching and real-time logic.
- `lib/`: Shared utilities and Supabase client configuration.
- `public/`: Static assets.

## 📄 License

This project is licensed under the MIT License.
