# DEVELOPMENT PLAN: Graduation Party Game

## Project Overview
We are building a real-time, interactive party game (a mashup of Jeopardy, Family Feud, and Kahoot) for a graduation party. 
**Deadline:** Tonight.
**Development Methodology:** Iterative, feature-driven vertical slices. 

## Tech Stack & Deployment Constraints
* **Framework:** Next.js (App Router)
* **Styling:** Tailwind CSS (Strict focus on TV-optimized 100vh/100vw scaling)
* **Database:** Firebase Realtime Database (Client-side SDK for real-time state sync)
* **Hosting:** Vercel (hybrid deployment, server runtime enabled)
* **ARCHITECTURE:** Hybrid Next.js application. Real-time game state is synced client-side via Firebase Realtime Database SDK. Next.js Server Actions (`"use server"`) are used exclusively for secure server-side execution of the Spotify Web API integration. Server-only modules must use the `server-only` package.

## Phased Feature Rollout
* **Phase 1:** Board UI TV Scaling, Persistent Scores, Logo Update (`/images/uh-logo.jpg`), and Admin Supremacy (manual point overrides, undo question, dynamic point buttons).
* **Phase 2:** Manual Spotify Controls (Play, Pause, Restart from timestamp) and "Finish the Lyric" auto-stop logic.
* **Phase 3:** Final Jeopardy Flow (Admin wager tracking, Captain mobile answer input, lock answers state).
* **Phase 4:** Podium Leaderboard display and final database seed.

## Firebase Realtime Database Schema
All state is managed synchronously via this exact JSON structure:

{
  "gameState": {
    "status": "lobby", // 'lobby', 'active', 'final_wager', 'final_answer', 'podium'
    "currentQuestionId": null,
    "spotifyState": {
      "isPlaying": false,
      "trackId": null,
      "startTime": 0,
      "stopTime": null
    }
  },
  "teams": {
    "team_123": {
      "name": "The Graduates",
      "captain": "John",
      "members": ["John", "Sarah", "Mike"],
      "score": 0,
      "finalWager": 0,
      "finalAnswer": ""
    }
  },
  "questions": {
    "q_1": {
      "category": "The Origin Story",
      "points": 100,
      "type": "jeopardy",
      "questionText": "What swim team was I a part of?",
      "answerText": "New Territory Tarpons",
      "isAnswered": false
    },
    "q_2": {
      "category": "Musical Memories",
      "points": 200,
      "type": "audio_lyric",
      "spotifyUri": "spotify:track:3U5JVgI2x4rDyHGObzJfNf",
      "startTime": 166, // 2:46 in seconds
      "stopTime": 187,  // 3:07 in seconds
      "questionText": "Finish the lyric: Feel the rain on your skin...",
      "answerText": "...No one else can feel it for you.",
      "isAnswered": false
    }
  }
}