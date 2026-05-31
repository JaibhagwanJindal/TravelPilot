# TravelPilot ✈️

TravelPilot is an AI-powered travel planning application that curates highly personalized, weather-aware, and geographically optimized itineraries instantly. 

Built with a modern stack focusing on clean architecture, performance, accessibility, and robust security, it is designed to be production-ready and scalable.

## 🚀 Features

### Core Planning Engine
- **Generative AI Integration**: Powered by Google's Gemini 2.5 Flash for lightning-fast, structured itinerary generation.
- **Strict Validation**: All user inputs and AI outputs are rigorously typed and validated using Zod schemas.

### Dynamic Experience Engine
- **Weather Integration**: Fetches real-time weather from OpenWeatherMap for your destination, providing alerts and context.
- **Constraints Engine**: Allows users to specify strict requirements (e.g., Vegetarian, Wheelchair Accessible, Indoor Only) which the AI strictly follows.
- **Budget Tracking**: Compares your Planned Budget against the Estimated Cost of generated activities, maintaining a running total of your Remaining Budget.
- **Route Optimization**: The AI logically orders activities by geographic proximity to minimize transit time.
- **Replan Day**: Users can dynamically regenerate a single day of their trip based on new circumstances (e.g., unexpected rain or budget changes) without losing the rest of the itinerary.

### Enterprise Grade Polish
- **Security**: In-memory API Rate Limiting, environment variable validation (`env.ts`), and global error boundaries.
- **Performance**: Lazy loaded heavy components (`next/dynamic`), `Suspense` boundaries, and React Memoization.
- **Accessibility**: Built with `shadcn/ui`, fully keyboard navigable, and semantic HTML structure.
- **Export**: Native Web Share API integration and PDF exports (via `html2canvas` & `jspdf`).
- **Testing**: Vitest and React Testing Library configured for unit and component testing.

## 🛠️ Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Components**: [shadcn/ui](https://ui.shadcn.com/)
- **AI**: [@google/generative-ai](https://ai.google.dev/)
- **Validation**: [Zod](https://zod.dev/) & [React Hook Form](https://react-hook-form.com/)
- **Testing**: [Vitest](https://vitest.dev/)

## ⚙️ Environment Setup

To run TravelPilot locally, create a `.env.local` file in the root directory and add the following keys:

```env
# Required for AI Generation
GEMINI_API_KEY=your_gemini_api_key

# Required for Weather Integration
OPENWEATHER_API_KEY=your_openweathermap_api_key

# (Optional) Database Integration for future expansion
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 💻 Running Locally

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the development server:
   ```bash
   npm run dev
   ```
3. Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🧪 Testing

Run the test suite using Vitest:
```bash
npm run test
```

## ☁️ Deployment Guide (Vercel)

TravelPilot is perfectly configured for zero-config deployment on Vercel.

1. Push your code to a GitHub repository.
2. Log into [Vercel](https://vercel.com/) and click **Add New > Project**.
3. Import your GitHub repository.
4. In the **Environment Variables** section, add your `GEMINI_API_KEY` and `OPENWEATHER_API_KEY`.
5. Click **Deploy**. Vercel will automatically detect the Next.js framework and build the application.
