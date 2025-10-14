# Coin Trading

A cryptocurrency trading application built with Next.js, TypeScript, Tailwind CSS, and Supabase.

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: Supabase
- **Deployment**: Vercel (Serverless)

## Getting Started

### Prerequisites

- Node.js 18+ installed
- A Supabase account and project

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env.local` file based on `.env.local.example`:
   ```bash
   cp .env.local.example .env.local
   ```

4. Add your Supabase credentials to `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

### Development

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Building for Production

```bash
npm run build
npm start
```

## Deployment

This project is configured for deployment on Vercel. Simply connect your repository to Vercel and it will automatically deploy.

Make sure to add your environment variables in the Vercel dashboard:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Project Structure

```
src/
├── app/              # Next.js app router pages
│   ├── layout.tsx    # Root layout
│   ├── page.tsx      # Home page
│   └── globals.css   # Global styles
├── components/       # React components
├── lib/              # Utility functions and configurations
│   └── supabase.ts   # Supabase client
└── types/            # TypeScript type definitions
```

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)


# 유용한 Terminal 명령어
for port in 3000 3001 3002 4000 5000 5173 8000 8080 8081 9000; do
  lsof -ti:$port | xargs kill -9 2>/dev/null
done
