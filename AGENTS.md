# Project Instructions & Context

This file contains custom instructions and context for AI coding agents working on the SkillBridge project. Adhering to these rules ensures consistency and prevents regression of specific fixes.

## Gemini Model Configuration

The application uses a multi-model orchestration strategy. Always refer to `/services/geminiService.ts` for the source of truth on model mapping.

Current Mappings:
- **Fastest (Lite):** `gemini-3.1-flash-lite`
- **Balanced (Default):** `gemini-3.5-flash`
- **Deep (Pro):** `gemini-3.1-pro-preview`
- **TTS:** `gemini-3.1-flash-tts-preview`

## UI & UX Standards

### Layout & Scrolling
- The `LandingPage.tsx` uses a specific nested scrolling architecture to fix a "scroll beyond footer" bug.
- The root container has `h-screen w-screen overflow-hidden fixed inset-0`.
- The content wrapper has `relative z-10 w-full h-screen overflow-y-auto overflow-x-hidden scroll-smooth`.
- **Do NOT** change this structure without verifying the footer behavior on all screen sizes.

### Highlighting System
- Manually added skills in `StepProfile.tsx` are permanently highlighted using `newlyAddedIds` state.
- Highlights are implemented with Framer Motion animations and specific border/background colors.

### Voice Mode (Chat Widget)
- Voice mode UI is designed to fit without a scrollbar.
- Listening animations and wave sizes should remain compact (approx `w-24 h-24` for the primary indicator).

## Development Guidelines

### Tailwind Palette
- Prefer standard Tailwind Slate shades (`slate-50` to `slate-900`) for consistency.
- Avoid non-standard classes like `slate-505`, `slate-404`, or `slate-850`. Always normalize these to the nearest standard Tailwind value if found.

### Iconography
- Always use `lucide-react` for icons.
- Avoid custom SVG paths unless strictly necessary for brand-specific visuals.
