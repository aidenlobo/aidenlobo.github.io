<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes. APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
# PROJECT SPECIFIC RULES: STATIC EXPORT & FIREBASE

You are writing code for a Next.js App Router application that must be compiled as a static HTML export using the `output: 'export'` configuration for GitHub Pages. 

Strictly adhere to the following rules to prevent deployment failure:

## 1. Strictly Client Side Architecture
There is no Node.js server at runtime. 
* You are forbidden from using Next.js Server Actions.
* You are forbidden from using API Routes (`app/api/...`).
* Every interactive component, hook, or file interacting with Firebase must begin with the `"use client";` directive at the very top.

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
