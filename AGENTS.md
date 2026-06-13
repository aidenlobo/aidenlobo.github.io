# PROJECT SPECIFIC RULES: VERCEL HYBRID DEPLOYMENT (FIREBASE + SERVER ACTIONS)

You are writing code for a Next.js App Router application deployed on Vercel as a hybrid app.

Strictly adhere to the following rules to prevent deployment failure:

## 1. Hybrid Client/Server Architecture
* All real-time game state must be synced via the Firebase Realtime Database client SDK. Every component interacting with Firebase must begin with the `"use client";` directive.
* Next.js Server Actions (`"use server"`) are required for Spotify Web API integration. Do not move this logic to the client.
* Server-only modules must import the `server-only` package.

## 2. UI and State Management Rules
* The main board (`app/page.tsx`) must be fully responsive and strictly fit a standard TV screen without any scrolling (use `h-screen`, `w-screen`, and flex/grid).
* The Admin panel must have absolute authority to mutate any Firebase node at any time (override scores, change game status, undo questions).
* Music playback is strictly triggered by Admin panel commands writing to `gameState.spotifyState`.

## 3. App Router & Firebase Best Practices
* Use `app/page.tsx` and `app/layout.tsx`. Use `useRouter` from `next/navigation`.
* Only use the standard Firebase web client SDK (`firebase/app`, `firebase/database`). Do not use `firebase-admin`.

## 4. Clean Code Standards
* Write clean, strict TypeScript. Define interfaces for all Firebase data objects.
* Break complex UI into smaller components within `src/components/`.