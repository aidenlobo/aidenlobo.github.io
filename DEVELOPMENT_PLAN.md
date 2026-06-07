# DEVELOPMENT PLAN: Graduation Party Game

## Project Overview
We are building a real-time, interactive party game (a mashup of Jeopardy, Family Feud, and Kahoot) for a graduation party. 
**Deadline:** 1 week. 
**Development Methodology:** Iterative, feature-driven vertical slices. Do not attempt to build the entire application at once.

## Tech Stack & Deployment Constraints
* **Framework:** Next.js (App Router)
* **Styling:** Tailwind CSS
* **Database:** Firebase Realtime Database (Client-side SDK only)
* **Hosting:** GitHub Pages (Static Export)
* **CRITICAL CONSTRAINT:** Because this will be hosted on GitHub Pages, the Next.js app MUST be statically exported (`output: 'export'` in `next.config.js`). **Do not use Next.js Server Actions, Server-Side Rendering (SSR), or API routes.** All database interactions must happen client-side using the Firebase Realtime Database SDK.

## Routing Architecture
1. `app/page.tsx` (Main Board): Displayed on a large TV. Listens to Firebase and displays the Kahoot-style lobby, the Jeopardy grid, or the active question. Read-only view (mostly).
2. `app/join/page.tsx` (Mobile Registration): A public web form for guests to scan via QR code. Allows them to input their Team Name, Captain Name, and up to 5 team members. Writes to the `teams` node.
3. `app/admin/page.tsx` (Control Panel): Mobile-friendly command center for the game host. Has UI to approve teams, change game state, open questions, and award points. Writes to all Firebase nodes.

## Firebase Realtime Database Schema
All state is managed synchronously via this exact JSON structure:

## Firebase Realtime Database Schema
All state is managed synchronously via this exact JSON structure:

```json
{
  "gameState": {
    "status": "lobby", 
    "currentQuestionId": null
  },
  "teams": {
    "team_123": {
      "name": "The Graduates",
      "captain": "John",
      "members": ["John", "Sarah", "Mike"],
      "score": 0
    }
  },
  "questions": {
    "q_1": {
      "category": "College Memories",
      "points": 100,
      "type": "jeopardy",
      "questionText": "The name of the street he lived on sophomore year.",
      "answerText": "What is Elm Street?",
      "isAnswered": false
    }
  }
}