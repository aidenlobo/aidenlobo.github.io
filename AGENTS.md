<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes. APIs, conventions, and file structure may all differ from your training data.
# PROJECT SPECIFIC RULES: VERCEL HYBRID DEPLOYMENT (FIREBASE + SERVER ACTIONS)

You are writing code for a Next.js App Router application deployed on Vercel as a hybrid app (server runtime enabled — this is NOT a static export).

Strictly adhere to the following rules to prevent deployment failure:

## 1. Hybrid Client/Server Architecture
* All real-time game state (lobby, board, teams, questions) must be synced via the Firebase Realtime Database client SDK. Every component, hook, or file interacting with Firebase this way must begin with the `"use client";` directive at the very top.
* Next.js Server Actions (`"use server"`) are the required mechanism for any code that needs secret credentials or calls third-party APIs (e.g., the Spotify Web API). Do not move this logic to the client.
* Server-only modules (e.g., `src/lib/spotify.ts`) must import the `server-only` package at the top of the file to guarantee they can never be bundled into client code.

## 2. App Router Best Practices
* Use `app/page.tsx` and `app/layout.tsx`. Do not use the `pages/` directory.
* Use `useRouter` from `next/navigation` (not `next/router`).
* Use the `<Link>` component from `next/link` for navigation.

## 3. Firebase Client SDK Only
* Only use the standard Firebase web client SDK (`firebase/app`, `firebase/database`).
* Do not import anything from `firebase-admin`.

## 4. Styling
* Use Tailwind CSS for all styling.
* Keep mobile responsiveness in mind using standard Tailwind break prefixes (`sm:`, `md:`, `lg:`).

## 5. Clean Code Standards
* Write clean, strict TypeScript. Define interfaces for all Firebase data objects.
* Do not leave debug statements in finished components.
* Do not write massive monolithic files. Break complex UI into smaller components within a `src/components/` directory.
<!-- END:nextjs-agent-rules -->
