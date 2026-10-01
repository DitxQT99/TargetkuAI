# Research Notes — 24 September 2026

Web research informed this architecture.

1. The Push API delivers pushes to an active Service Worker, where a `push` event can be handled.
2. Persistent mobile notifications should be created from the Service Worker with `ServiceWorkerRegistration.showNotification()`.
3. VAPID is used by the application server to authenticate Web Push requests; the public key is used for subscription and the private key stays server-side.
4. Vercel Cron triggers Vercel Functions with HTTP GET. Cron timezone is UTC.
5. Vercel Hobby cron is limited to once per day; Pro/Enterprise have per-minute precision.
6. Neon supplies a serverless PostgreSQL driver for server-side JavaScript and exposes the connection through `DATABASE_URL`.
7. `web-push` provides VAPID configuration and `sendNotification()`.

Implementation:
Vercel Cron -> Serverless Function -> Neon due-reminder rows -> web-push/VAPID -> browser push service -> Service Worker -> Android notification.


8. TARGETKU AI integration (October 2026)
- Upstream contract observed from the supplied endpoint UI: `GET https://api-faa.my.id/faa/ai-promt?prompt=...&query=...`.
- The supplied example response is JSON with `status`, `creator`, and `response`; the frontend reads `response`.
- Because cross-origin response headers could not be live-verified from this environment, TARGETKU uses same-origin `POST /api/ai-chat` as the primary path and keeps a direct upstream fallback.
- The frontend sends a compact, app-specific context rather than the entire localStorage blob. Context includes user profile basics, active targets, today's completion state, recent 14-day progress, notes, streak, XP/level, achievements, equipped frame, weekly/monthly statistics, and an insight summary.
- The AI system prompt explicitly restricts answers to TARGETKU/productivity topics and requires the exact refusal `Sorry, I can't help you with that.` for out-of-scope questions.
- No API key or private credential is added to the frontend.
