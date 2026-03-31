# Step-by-Step Guide — Which Document to Read for What

Use this as your navigation map. Find your goal below and follow the linked document.

---

## "I just bought this — where do I start?"

1. **Read** [06-agent-introduction.md](06-agent-introduction.md) — gives you (or your AI assistant) a complete overview of the project
2. **Read** [10-api-keys-guide.md](10-api-keys-guide.md) — lists every API key you'll need and where to get each one
3. **Read** [03-deployment-requirements.md](03-deployment-requirements.md) — confirms your server meets the requirements
4. **Follow** [INSTALL.md](../INSTALL.md) — step-by-step installation from clone to running

---

## "I want to deploy to a live server"

1. **Confirm** server requirements → [03-deployment-requirements.md](03-deployment-requirements.md)
2. **Get all API keys** → [10-api-keys-guide.md](10-api-keys-guide.md)
3. **Configure `.env`** → see `env.example` in the repo root
4. **Deploy** → run `scripts/deploy-to-prod.ps1` (see [INSTALL.md](../INSTALL.md) § "Updating / Deploying changes")

---

## "I want to build and publish the Android app"

1. **Set up Android SDK + signing** → [04-android-app-setup.md](04-android-app-setup.md)
2. **Get Firebase credentials** → [10-api-keys-guide.md](10-api-keys-guide.md) § "Firebase Cloud Messaging"
3. **Build the APK/AAB** → [04-android-app-setup.md](04-android-app-setup.md) § Steps 6–9
4. **Fill out Play Store forms** → [07-google-play-cheatsheet.md](07-google-play-cheatsheet.md)

---

## "I want to change the app colors / branding"

1. **Read** [08-theme-customization.md](08-theme-customization.md)
2. Edit the CSS variables in `globals.css` and/or Tailwind config
3. Rebuild + deploy

---

## "I want my AI coding assistant to help me"

1. Import the project into VS Code
2. Tell the AI assistant: **"Read README/06-agent-introduction.md"**
3. The agent will understand the full project structure, rules, and deployment process
4. From there, just describe what you need — the agent has full context

---

## "I want to understand the full feature set"

→ Read [02-project-overview.md](02-project-overview.md)

---

## "I want to know who built this"

→ Read [01-about-us.md](01-about-us.md)

---

## "I need to set up API keys"

→ Read [10-api-keys-guide.md](10-api-keys-guide.md) — covers every key from Meta WhatsApp to Paystack to OpenAI, with step-by-step instructions for each.

---

## "I want to submit my app to Google Play Store"

→ Read [07-google-play-cheatsheet.md](07-google-play-cheatsheet.md) — has pre-filled answers for every Play Store form question.

---

## Document Index

| # | File | Contents |
|---|---|---|
| 01 | [01-about-us.md](01-about-us.md) | Who is Raven AI, what do we do |
| 02 | [02-project-overview.md](02-project-overview.md) | Complete features, target audience, selling points |
| 03 | [03-deployment-requirements.md](03-deployment-requirements.md) | Server specs, hosting, best practices, checklist |
| 04 | [04-android-app-setup.md](04-android-app-setup.md) | Mobile app build, signing, Play Store upload |
| 05 | [05-readme.md](05-readme.md) | Main project README with architecture diagram |
| 06 | [06-agent-introduction.md](06-agent-introduction.md) | AI agent onboarding — READ THIS FIRST |
| 07 | [07-google-play-cheatsheet.md](07-google-play-cheatsheet.md) | Play Store form questions & answers |
| 08 | [08-theme-customization.md](08-theme-customization.md) | Dark/light mode, color palette guide |
| 09 | [09-step-by-step-guide.md](09-step-by-step-guide.md) | **This file** — navigation map |
| 10 | [10-api-keys-guide.md](10-api-keys-guide.md) | Every API key, where to get it, where to put it |

### Also in the repo root:
- `INSTALL.md` — Full installation walkthrough
- `CHANGELOG.md` — Version history
- `LICENSE` — Envato license terms
- `env.example` — Environment variable template

### In `docs/`:
- Architecture deep-dive, API contracts, operational runbooks, incident response

---

*Start with #06 (Agent Introduction) if you're using an AI assistant, or #03 (Deployment Requirements) if you're setting up manually.*
