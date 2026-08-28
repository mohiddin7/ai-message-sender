// Realistic sample data for screenshots — loaded before chrome-mock.js.
window.__SEED_QUEUE = [
  {
    id: "q1", platform: "chatgpt.com", tabId: 1, conversationUrl: "https://chatgpt.com/c/demo",
    text: "Summarize today's standup notes into 3 action items and post them.",
    mode: "delay", scheduledAt: Date.now() + 15 * 60_000,
    status: "pending", attempts: 0, lastError: null, createdAt: Date.now()
  },
  {
    id: "q2", platform: "claude.ai", tabId: 2, conversationUrl: "https://claude.ai/chat/demo",
    text: "Draft a follow-up email to the design team about the new onboarding flow.",
    mode: "absolute", scheduledAt: Date.now() + 3 * 3600_000,
    status: "pending", attempts: 0, lastError: null, createdAt: Date.now()
  },
  {
    id: "q3", platform: "gemini.google.com", tabId: 3, conversationUrl: "https://gemini.google.com/app/demo",
    text: "Continue the outline from where we left off — add the pricing section.",
    mode: "chain", scheduledAt: null,
    status: "pending", attempts: 0, lastError: null, createdAt: Date.now()
  }
];

window.__SEED_RECURRING = [
  {
    id: "r1", platform: "claude.ai", text: "Give me a one-paragraph market news digest.",
    enabled: true, schedule: { kind: "daily", timeOfDay: "08:30" }
  },
  {
    id: "r2", platform: "chatgpt.com", text: "Review this week's open PRs and flag anything stale.",
    enabled: false, schedule: { kind: "weekly", daysOfWeek: [1, 3, 5], timeOfDay: "17:00" }
  }
];

window.__SEED_HISTORY = [
  { id: "h1", platform: "chatgpt.com", text: "Summarize today's standup notes into 3 action items and post them.", mode: "delay", scheduledAt: Date.now() - 2 * 3600_000, status: "sent", lastError: null },
  { id: "h2", platform: "claude.ai", text: "Draft a follow-up email to the design team about the new onboarding flow.", mode: "absolute", scheduledAt: Date.now() - 5 * 3600_000, status: "dry-run-ok", lastError: null },
  { id: "h3", platform: "gemini.google.com", text: "Continue the outline from where we left off — add the pricing section.", mode: "chain", scheduledAt: Date.now() - 24 * 3600_000, status: "sent", lastError: null },
  { id: "h4", platform: "chatgpt.com", text: "Reply to the client thread with the revised timeline.", mode: "delay", scheduledAt: Date.now() - 26 * 3600_000, status: "failed", lastError: "Send button not found — page layout may have changed." },
  { id: "h5", platform: "claude.ai", text: "Give me a one-paragraph market news digest.", mode: "delay", scheduledAt: Date.now() - 30 * 3600_000, status: "sent", lastError: null }
];
