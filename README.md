# HERSPACE

HERSPACE is a responsive, single-page dashboard for women's wellbeing, safety, growth, money, confidence, and lifestyle. It is a frontend demonstration—not a service or a substitute for professional support.

## Features

- Overview dashboard with configurable section shortcuts and progress summaries.
- Six interactive sections: **Her Safety**, **Her Wellness**, **Her Growth**, **Her Money**, **Her Confidence**, and **Her Lifestyle**.
- Shared sidebar navigation, mobile drawer, section links, profile preferences, local search, and light/dark/system themes.
- Display settings for text size, compact cards, reduced motion, and dashboard shortcut selection.
- Session-only safety and wellness interactions, including an explicitly simulated SOS, journey timer, mood journal, optional body notes, and hydration counter.
- Growth checklists, career goals, and interview practice with sample responses.
- Categorized expenses, monthly totals, budget validation, savings goal progress, and an optional monthly spending limit.
- Confidence challenge, journal, personal wins, and boundary-setting practice.
- Lifestyle checklists, wardrobe entries, and outfit combinations.
- Responsive layouts, keyboard focus indicators, inline feedback, notifications, validation, and empty states.

## Technologies

- HTML5 for semantic structure and accessible form controls.
- CSS3 for the shared design system, themes, responsive layouts, and reduced-motion support.
- Vanilla JavaScript for navigation, interactions, calculations, search, and browser storage.
- `localStorage` for non-sensitive demo data and display preferences. No application framework, package, backend, or external API is required.

## Setup

1. Open `index.html` in a current browser, or serve this folder with a local static server such as VS Code Live Server.
2. Use the sidebar or dashboard cards to navigate; the URL hash follows the active section.
3. Open **Settings** to change display preferences and dashboard shortcuts.

No build, install, account, or network connection is needed. A static server is recommended for consistent browser behavior, but the app is designed to work from `index.html`.

## Short demo guide

1. On **Overview**, use search or a shortcut to open **Her Money**.
2. Add a categorized expense, check the monthly total, delete the entry, and try a budget with both valid and negative values. An optional spending limit appears in the dashboard summary.
3. In **Her Growth**, mark a learning step complete and add, complete, or remove a career goal.
4. In **Her Safety**, start the journey timer, stop it, or try the simulated SOS. The page never sends a call or alert.
5. In **Settings**, change the theme, text size, compact layout, reduced-motion preference, and dashboard shortcuts.

## Privacy and frontend limitations

- Saved demo data is stored in the current browser profile under `herspace-demo-v1`. Browser storage is **not encrypted**, can be cleared or unavailable, and is not synchronized across devices. Avoid entering sensitive information.
- Name and life-stage preferences, checklists for growth and lifestyle, career goals, money examples, confidence reminders/notes/wins, wardrobe/outfits, display preferences, and dashboard shortcuts are locally stored.
- Safety checklist selections, journey timer and SOS state, mood/check-in data, cycle or symptom notes, hydration count, interview practice notes, boundary-practice text, and the profile's current focus choice remain in page memory only. They clear when the page is refreshed or closed.
- Search is performed in the current page and indexes section headings, labels, and descriptions—not personal entries. It sends no query to a server.
- The journey timer and SOS are demonstrations only. They do not track location, contact anyone, or trigger notifications. HERSPACE provides no emergency, medical, legal, or financial service or advice.
- Without a backend, there are no accounts, encrypted records, cloud backup, cross-device sync, server-side search, or external integrations.

To clear locally saved demo data, remove the `herspace-demo-v1` entry in browser developer tools under **Application/Storage → Local Storage**.

## QA checks

The following checks were run in the attached browser preview:

- Navigation to each of the six sections and dashboard shortcut navigation.
- Expense submission, monthly/dashboard total updates, deletion, empty state, and rejection of a future date.
- Budget blank/negative validation, remainder calculation, savings progress, and local storage writes.
- Growth checklist progress; career goal, personal win, and wardrobe form submission and deletion.
- Journey timer start, tick, stop/cancel, accelerated completion, and page-hide cleanup.
- Search results, no-results state, result navigation, theme toggle, Ctrl/Cmd+K, Escape behavior, and mobile navigation drawer.
- Empty states, accessible input labels, no horizontal overflow at the available 542px-wide viewport, and JavaScript runtime errors during exercised flows.
- `node --check script.js`, markup ID/label checks, and `git diff --check`.

The 15-minute timer's completion path was tested by invoking its interval callback repeatedly rather than waiting 15 minutes. Local preference writes were verified; preference restoration after a full reload was **not conclusively verified** in the attached browser preview because its reload restored pre-test browser storage. No automated regression-test suite is included.

## Remaining bugs and incomplete features

- No functional defect was confirmed in the flows listed above. The attached preview did not provide a reliable confirmation of preference persistence across a full reload; verify this in a normal browser session.
- Responsive behavior was checked for horizontal overflow at 542px and by reviewing the tablet/desktop CSS breakpoints, but a full visual QA pass at separate tablet and desktop viewport sizes remains incomplete.
- Automated tests, account management, secure or synchronized storage, server search, and real emergency or health integrations are not implemented.
