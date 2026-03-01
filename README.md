# Simple Surf

An AI-powered conversational web browser designed to make the internet accessible and easy to navigate for elderly users through voice or text interactions.

## The Problem

As of 2025, there are over 1.1 billion people aged 60 or older worldwide, a number that is projected to grow to 1.4 billion by 2030 and 2.1 billion by 2050 according to the United Nations. While the internet has become essential for everyday activities such as health management, banking, government services, and communication, older adults consistently report significant barriers to online engagement. Studies show that up to 40% of seniors have difficulty completing basic web tasks due to small interfaces, unpredictable navigation patterns, complex forms, and overwhelming visual design. For many, this leads to frustration, decreased digital independence, and reliance on family members or caregivers for simple tasks like renewing prescriptions, scheduling appointments, or accessing benefits online.

## The Solution

Simple Surf addresses this challenge by transforming the web into a conversational experience, allowing elderly users to interact through voice or text with an AI agent that browses and acts on their behalf. By abstracting away confusing layouts and offering guided, senior-friendly interactions, Simple Surf empowers older adults to confidently use essential digital services, improving autonomy, dignity, and quality of life for a rapidly growing global population.

## Features

- **Conversational Interface**: Interact with websites using natural language through voice or text
- **AI-Powered Browsing**: An intelligent agent navigates websites and performs tasks on behalf of the user
- **Senior-Friendly Design**: Large, clear interface optimized for elderly users
- **Guided Interactions**: Step-by-step assistance for complex web tasks
- **Accessibility First**: Built from the ground up with accessibility in mind

## Tech Stack

This project is built with the [T3 Stack](https://create.t3.gg/):

- [Next.js](https://nextjs.org) - React framework
- [NextAuth.js](https://next-auth.js.org) - Authentication
- [Prisma](https://prisma.io) - Database ORM
- [Tailwind CSS](https://tailwindcss.com) - Styling
- [tRPC](https://trpc.io) - Type-safe API

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- PostgreSQL database

### Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/simple-surf.git
cd simple-surf
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
```bash
cp .env.example .env
```

4. Update the `.env` file with your database credentials and other required values

5. Run database migrations
```bash
npx prisma migrate dev
```

6. Start the development server
```bash
npm run dev
```

7. Open [http://localhost:3000](http://localhost:3000) in your browser

## Deployment

Follow the T3 Stack deployment guides for:
- [Vercel](https://create.t3.gg/en/deployment/vercel)
- [Netlify](https://create.t3.gg/en/deployment/netlify)
- [Docker](https://create.t3.gg/en/deployment/docker)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
