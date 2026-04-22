# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Nima is an AI-powered personal styling app ("Pinterest meets personal stylist"). Users discover fashion looks, get AI styling advice, virtually try on outfits, and shop curated items. Built with Expo (React Native) on the frontend and Convex as the real-time backend.

## Tech Stack

- **Frontend:** Expo SDK 54, React Native 0.81.5, React 19, TypeScript
- **Routing:** Expo Router v6 (file-based, typed routes enabled)
- **Backend:** Convex (real-time database, serverless functions, file storage)
- **Styling:** NativeWind v4 (Tailwind CSS for React Native), dark mode via `"class"` strategy
- **Auth:** WorkOS AuthKit with OAuth PKCE flow, tokens stored in expo-secure-store
- **AI:** Vercel AI SDK + OpenAI (chat), Google Gemini (image generation/try-on)
- **Workflows:** `@convex-dev/workflow` for durable multi-step operations (onboarding, try-on)
- **Payments:** Fingo Pay M-Pesa (KES currency) for credit purchases

## Development Commands

```bash
# Start Expo dev server
npm start

# Start Convex dev server (must run concurrently with Expo)
npm run convex    # or: npx convex dev

# Platform-specific
npm run android   # expo run:android
npm run ios       # expo run:ios
npm run web       # expo start --web
```

No test or lint scripts are configured. EAS Build profiles (development, preview, production) are defined in `eas.json`.

## Architecture

### Routing (app/)

File-based routing via Expo Router. Root layout (`app/_layout.tsx`) uses a `Stack` navigator wrapping all providers. Key route groups:

- `(tabs)/` — Main tab navigator: Discover, Ask Nima (chat), Lookbooks, Profile
- `(auth)/` — Modal-presented auth screens (sign-in, sign-up)
- Dynamic routes: `product/[id]`, `look/[id]`, `fitting/[sessionId]`, `lookbook/[id]`, `ask/[chatId]`, `orders/[id]`, `messages/[userId]`, `discover/category/[category]`, `discover/gender/[gender]`

### Backend (convex/)

All server logic lives in `convex/`. Functions are organized by domain in subdirectories, each with `queries.ts`, `mutations.ts`, and `actions.ts` files. Schema is defined in `convex/schema.ts` (~20 tables). Shared types and constants live in `convex/types.ts`.

Key domains: `users/`, `chat/`, `looks/`, `items/`, `lookbooks/`, `cart/`, `orders/`, `credits/`, `friends/`, `directMessages/`, `workflows/`, `search/`, `notifications/`

HTTP endpoints for webhooks (WorkOS, Fingo Pay) and health check are in `convex/http.ts`.

### Auth Flow

1. `lib/auth.ts` launches WorkOS hosted login via expo-web-browser with PKCE
2. Auth code returned to `app/callback.tsx`
3. Code exchanged for tokens via Convex action (`convex/auth.ts`) to avoid CORS
4. Tokens stored in expo-secure-store (with chunking for large JWTs via `lib/auth-storage.ts`)
5. `useAuthFromWorkOS` hook provides `fetchAccessToken` to `ConvexProviderWithAuth`
6. `components/AuthGuard.tsx` protects routes; `components/UserDataSync.tsx` syncs WorkOS user data to Convex

### State Management

No external state library. Convex reactive queries (`useQuery`) serve as the real-time data layer. React Context for local state:
- `ThemeContext` — light/dark/system theme (syncs NativeWind)
- `UserContext` — current user from Convex
- `SelectionContext` — multi-item selection for look creation (max 6 items)

### Client Utilities (lib/)

- `lib/utils.ts` — `cn()` utility (clsx + tailwind-merge)
- `lib/constants/Colors.ts` — Static color tokens for programmatic use outside Tailwind
- `lib/hooks/` — Custom hooks (credits, push notifications, onboarding)
- `lib/contexts/` — React context providers

### UI Components (components/)

Organized by feature domain (`ask/`, `discover/`, `fitting/`, `look/`, etc.) with shared primitives in `components/ui/`. Uses CVA (class-variance-authority) for component variants. Icons from `lucide-react-native`. Fonts: DM Sans (sans), Cormorant Garamond (serif).

## Convex Rules (MANDATORY)

### Explicit Types on All Functions

Every Convex function must have explicit type annotations — no type inference allowed:

```typescript
import { query, QueryCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { v } from "convex/values";

export const getUser = query({
  args: { userId: v.id("users") },
  returns: v.union(v.object({ /* ... */ }), v.null()),
  handler: async (
    ctx: QueryCtx,                    // Explicit context type
    args: { userId: Id<"users"> },    // Explicit args type
  ): Promise<Doc<"users"> | null> => { // Explicit return type
    // ...
  },
});
```

Required on every handler: explicit `ctx` type (`QueryCtx`/`MutationCtx`/`ActionCtx`), explicit `args` type, explicit `Promise<...>` return type, AND a Convex `returns` validator.

### Separate Files for Actions

Convex does not allow `"use node"` in files that define queries or mutations. Actions requiring Node.js (AI calls, external APIs) must be in separate `actions.ts` files.

### Query Best Practices

Use database indexes instead of `.filter()`. All indexes are defined in `convex/schema.ts`.

## Path Alias

`@/*` maps to the project root (e.g., `import { cn } from "@/lib/utils"`).

## Design System

"Loro Piana Inspired" luxury color palette defined in `tailwind.config.js`. Key colors:
- Primary: Burgundy (`#5C2A33`) / Rose Gold (`#C9A07A` dark)
- Background: Ivory Cream (`#FAF8F5`) / Deep Espresso (`#1A1614` dark)
- Surface: Soft Champagne (`#F5F0E8`) / Dark Cocoa (`#252220` dark)

Custom URL scheme: `shopnima://`

## Environment Variables

Client-side vars use `EXPO_PUBLIC_` prefix. Server-side Convex vars are set in the Convex Dashboard (not in files). Key client vars: `EXPO_PUBLIC_CONVEX_URL`, `EXPO_PUBLIC_WORKOS_CLIENT_ID`, `EXPO_PUBLIC_WORKOS_REDIRECT_URI`.
