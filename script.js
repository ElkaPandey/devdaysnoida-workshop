(() => {
  "use strict";

  const storageKey = "herspace-demo-v1";
  const sectionNames = {
    home: "Overview",
    safety: "Her Safety",
    wellness: "Her Wellness",
    growth: "Her Growth",
    money: "Her Money",
    confidence: "Her Confidence",
    lifestyle: "Her Lifestyle",
    settings: "Settings"
  };
  const shortcutDefinitions = {
    safety: { title: "Make a safety plan", description: "Build a plan that feels right for you", icon: "♡", color: "safety" },
    wellness: { title: "Check in with yourself", description: "A gentle moment for your wellbeing", icon: "✿", color: "wellness" },
    growth: { title: "Explore a new skill", description: "Your next chapter can start today", icon: "↗", color: "growth" },
    money: { title: "Get to know your money", description: "Try a simple monthly planner", icon: "＄", color: "money" },
    confidence: { title: "Celebrate a personal win", description: "Notice the things you are proud of", icon: "✧", color: "confidence" },
    lifestyle: { title: "Make space for joy", description: "Find a small moment that feels like you", icon: "☼", color: "lifestyle" }
  };
  const affirmations = [
    "I am allowed to learn as I go.",
    "My needs matter, even when they change.",
    "I bring something valuable into every room.",
    "Rest is part of how I move forward.",
    "I can take the next step without seeing the whole path.",
    "I get to define what a good life looks like for me."
  ];
  const $ = id => document.getElementById(id);
  const all = selector => Array.from(document.querySelectorAll(selector));

  function readDemo() {
    try {
      const stored = JSON.parse(localStorage.getItem(storageKey) || "{}");
      return stored && typeof stored === "object" && !Array.isArray(stored) ? stored : {};
    } catch (error) {
      console.warn("HERSPACE demo data could not be read.", error);
      return {};
    }
  }

  const demo = readDemo();
  const sessionData = {
    checkins: 0,
    focusArea: "",
    safetyChecks: [],
    wellnessChecks: [],
    moodNotes: [],
    cycleNotes: [],
    water: 0,
    journeySeconds: 0,
    journeyRemaining: 0,
    journeyTimer: null,
    sosTimer: null,
    interviewNotes: "",
    boundaryNotes: ""
  };
  let activeSection = "home";
  let selectedMood = "";
  let currentAffirmation = typeof demo.savedAffirmation === "string" ? demo.savedAffirmation : affirmations[0];
  let breathingTimer = null;
  let noticeTimer = null;
  let appReady = false;
  const systemTheme = window.matchMedia("(prefers-color-scheme: dark)");

  function persist() {
    try {
      const safeDemo = { ...demo };
      delete safeDemo.checkins;
      delete safeDemo.lastMood;
      delete safeDemo.cycleNotes;
      delete safeDemo.symptomNotes;
      delete safeDemo.moodJournal;
      delete safeDemo.hydration;
      delete safeDemo.safetyPlan;
      delete safeDemo.journeyTimer;
      delete safeDemo.sosEvents;
      delete safeDemo.contactDetails;
      delete safeDemo.emergencyContact;
      delete safeDemo.focusArea;
      if (safeDemo.completed && typeof safeDemo.completed === "object") {
        safeDemo.completed = { ...safeDemo.completed };
        delete safeDemo.completed.safety;
        delete safeDemo.completed.wellness;
      }
      localStorage.setItem(storageKey, JSON.stringify(safeDemo));
      $("storage-warning").hidden = true;
      return true;
    } catch (error) {
      console.warn("HERSPACE demo data could not be saved.", error);
      const warning = $("storage-warning");
      warning.textContent = "Browser storage is unavailable. Changes marked as saved work in this open page but cannot persist after you close or refresh it.";
      warning.hidden = false;
      return false;
    }
  }

  function setFeedback(id, message) {
    const element = $(id);
    if (!element) return;
    element.textContent = message;
    const isError = /please|enter |choose |write |valid |at least|before|cannot|can't|no goals|no expenses|unavailable|keep up to/i.test(message);
    element.dataset.state = isError ? "error" : message ? "success" : "info";
    if (appReady && message && !isError && /saved|added|marked complete|removed|cleared|updated|stopped|finished|cancelled|chosen|noted|goal reopened|step[s]? marked/i.test(message)) {
      showNotification(message, "success");
    }
  }

  function showNotification(message, state = "success") {
    const notification = $("app-notification");
    notification.textContent = message;
    notification.dataset.state = state;
    notification.hidden = false;
    if (noticeTimer) window.clearTimeout(noticeTimer);
    noticeTimer = window.setTimeout(() => {
      notification.hidden = true;
      noticeTimer = null;
    }, 3600);
  }

  function applyDisplayPreferences() {
    const preferences = demo.displayPreferences && typeof demo.displayPreferences === "object" ? demo.displayPreferences : {};
    const theme = ["light", "dark", "system"].includes(preferences.theme) ? preferences.theme : "system";
    const isDark = theme === "dark" || (theme === "system" && systemTheme.matches);
    document.documentElement.dataset.theme = isDark ? "dark" : "light";
    document.documentElement.dataset.textSize = preferences.textSize === "large" ? "large" : "standard";
    document.documentElement.classList.toggle("is-compact", preferences.compact === true);
    document.documentElement.classList.toggle("reduce-motion", preferences.reduceMotion === true);
    $("display-theme").value = theme;
    $("display-scale").value = preferences.textSize === "large" ? "large" : "standard";
    $("compact-layout").checked = preferences.compact === true;
    $("reduce-motion").checked = preferences.reduceMotion === true;
    const button = $("theme-toggle");
    button.setAttribute("aria-label", isDark ? "Switch to light theme" : "Switch to dark theme");
    button.title = isDark ? "Switch to light theme" : "Switch to dark theme";
    button.textContent = isDark ? "☀" : "☾";
    const themeMeta = document.querySelector('meta[name="theme-color"]');
    themeMeta.setAttribute("content", isDark ? "#171620" : "#f8f7fb");
  }

  function updateDisplayPreferences() {
    demo.displayPreferences = {
      theme: $("display-theme").value,
      textSize: $("display-scale").value,
      compact: $("compact-layout").checked,
      reduceMotion: $("reduce-motion").checked
    };
    applyDisplayPreferences();
    const saved = persist();
    setFeedback("display-feedback", saved
      ? "Display preferences updated on this device."
      : "Display preferences updated for this page session; browser storage is unavailable.");
  }

  function renderDashboardShortcuts() {
    const selected = Array.isArray(demo.dashboardShortcuts) ? demo.dashboardShortcuts : ["safety", "wellness", "growth", "money"];
    const container = $("dashboard-shortcuts");
    container.replaceChildren();
    const shortcuts = selected.filter(section => Object.prototype.hasOwnProperty.call(shortcutDefinitions, section));
    if (!shortcuts.length) {
      const empty = document.createElement("div");
      empty.className = "shortcut-empty";
      empty.textContent = "No shortcuts selected yet.";
      const settings = document.createElement("button");
      settings.type = "button";
      settings.className = "button button-secondary";
      settings.dataset.openSection = "settings";
      settings.textContent = "Choose dashboard shortcuts";
      container.append(empty, settings);
      return;
    }
    shortcuts.forEach(section => {
      const definition = shortcutDefinitions[section];
      const button = document.createElement("button");
      button.className = "quick-card quick-" + definition.color;
      button.type = "button";
      button.dataset.openSection = section;
      const icon = document.createElement("span");
      icon.className = "quick-icon";
      icon.setAttribute("aria-hidden", "true");
      icon.textContent = definition.icon;
      const copy = document.createElement("span");
      copy.className = "quick-copy";
      const title = document.createElement("strong");
      title.textContent = definition.title;
      const description = document.createElement("small");
      description.textContent = definition.description;
      copy.append(title, description);
      const arrow = document.createElement("span");
      arrow.className = "quick-arrow";
      arrow.setAttribute("aria-hidden", "true");
      arrow.textContent = "↗";
      button.append(icon, copy, arrow);
      container.append(button);
    });
  }

  function renderShortcutSettings() {
    const selected = new Set(Array.isArray(demo.dashboardShortcuts) ? demo.dashboardShortcuts : ["safety", "wellness", "growth", "money"]);
    const container = $("shortcut-options");
    container.replaceChildren();
    Object.keys(shortcutDefinitions).forEach(section => {
      const label = document.createElement("label");
      label.className = "setting-toggle";
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.value = section;
      checkbox.checked = selected.has(section);
      const copy = document.createElement("span");
      const title = document.createElement("strong");
      title.textContent = sectionNames[section];
      const note = document.createElement("small");
      note.textContent = shortcutDefinitions[section].description;
      copy.append(title, note);
      label.append(checkbox, copy);
      container.append(label);
    });
  }

  function searchSections(query) {
    const results = $("search-results");
    const status = $("search-status");
    results.replaceChildren();
    const normalizedQuery = query.trim().toLocaleLowerCase();
    if (normalizedQuery.length < 2) {
      results.hidden = true;
      status.textContent = "";
      return [];
    }
    const matches = all("[data-view]").flatMap(view => {
      const searchableText = Array.from(view.querySelectorAll("h1, h2, h3, .eyebrow, .quick-copy strong, .explore-card strong, label, .muted"))
        .map(element => element.textContent.trim())
        .filter(Boolean)
        .join(" · ");
      const index = searchableText.toLocaleLowerCase().indexOf(normalizedQuery);
      return index < 0 ? [] : [{ section: view.dataset.view, text: searchableText, index }];
    });
    matches.forEach(match => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "search-result";
      button.dataset.searchSection = match.section;
      const title = document.createElement("strong");
      title.textContent = sectionNames[match.section];
      const snippet = document.createElement("small");
      const start = Math.max(0, match.index - 35);
      snippet.textContent = (start ? "… " : "") + match.text.slice(start, Math.min(match.text.length, match.index + normalizedQuery.length + 55));
      button.append(title, snippet);
      results.append(button);
    });
    results.hidden = matches.length === 0;
    status.textContent = matches.length ? matches.length + " matching section" + (matches.length === 1 ? "" : "s") + "." : "No matching section found.";
    return matches;
  }

  function visitSection(section, options = {}) {
    if (!Object.prototype.hasOwnProperty.call(sectionNames, section)) return;
    activeSection = section;

    all("[data-view]").forEach(view => {
      const isCurrent = view.dataset.view === section;
      view.classList.toggle("is-visible", isCurrent);
      view.hidden = !isCurrent;
      view.setAttribute("aria-hidden", String(!isCurrent));
    });

    all(".nav-item[data-section]").forEach(button => {
      const isCurrent = button.dataset.section === section;
      button.classList.toggle("is-active", isCurrent);
      if (isCurrent) button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    });

    $("current-location").textContent = sectionNames[section];
    closeMobileMenu();
    closeProfile();
    closeSearchResults();

    if (options.updateHistory && window.location.hash !== "#" + section) window.location.hash = section;
    if (options.focus) {
      const view = document.querySelector('[data-view="' + section + '"]');
      view.focus({ preventScroll: true });
      const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.classList.contains("reduce-motion") ? "auto" : "smooth";
      window.scrollTo({ top: 0, behavior });
    }
  }

  function closeMobileMenu() {
    $("sidebar").classList.remove("is-open");
    $("mobile-scrim").hidden = true;
    $("menu-toggle").setAttribute("aria-expanded", "false");
    $("menu-toggle").setAttribute("aria-label", "Open navigation");
  }

  function closeProfile() {
    $("profile-panel").hidden = true;
    $("profile-toggle").setAttribute("aria-expanded", "false");
  }

  function closeSearchResults() {
    $("search-results").hidden = true;
    $("search-form").classList.remove("is-open");
    $("search-toggle").setAttribute("aria-expanded", "false");
  }

  function navigateTo(section) {
    visitSection(section, { updateHistory: true, focus: true });
  }

  function displayName() {
    const name = typeof demo.name === "string" ? demo.name.trim() : "";
    return name || "Alex Morgan";
  }

  function refreshProfile() {
    const fullName = displayName();
    const firstName = fullName.split(/\s+/)[0];
    $("profile-name-display").textContent = fullName;
    $("welcome-name").textContent = firstName;
    $("avatar").textContent = firstName.slice(0, 1).toUpperCase();
  }

  function updateProgress() {
    const completed = demo.completed && typeof demo.completed === "object" ? demo.completed : {};
    const growthSkills = new Set((Array.isArray(completed.growth) ? completed.growth : [])
      .filter(index => Number.isInteger(index) && index >= 0 && index < 4)).size;
    const validCareerGoals = Array.isArray(demo.careerGoals)
      ? demo.careerGoals.filter(goal => goal && typeof goal.name === "string")
      : [];
    const careerGoals = validCareerGoals.filter(goal => goal.done === true);
    const growthGoalTotal = validCareerGoals.length;
    const growthGoals = growthSkills + careerGoals.length;
    const growthTotal = 4 + growthGoalTotal;
    const currentMonth = todayKey().slice(0, 7);
    const totalSpent = (Array.isArray(demo.expenses) ? demo.expenses : [])
      .filter(item => item && typeof item.date === "string" && item.date.slice(0, 7) === currentMonth && Number.isFinite(item.amount))
      .reduce((total, item) => total + item.amount, 0);
    const spendingLimit = demo.budget && Number.isFinite(demo.budget.monthlySpendingLimit) ? demo.budget.monthlySpendingLimit : 0;
    const challengeComplete = demo.challengeComplete === todayKey();

    $("checkin-count").textContent = String(sessionData.checkins);
    $("goal-count").textContent = growthGoals + " / " + growthTotal;
    $("confidence-count").textContent = challengeComplete ? "Complete" : "Not yet";
    $("spending-count").textContent = formatMoney(totalSpent);
    const goalMeter = $("goal-meter");
    goalMeter.setAttribute("aria-valuemax", String(growthTotal));
    goalMeter.setAttribute("aria-valuenow", String(growthGoals));
    goalMeter.firstElementChild.style.width = Math.min(100, growthGoals / growthTotal * 100) + "%";
    $("confidence-meter").setAttribute("aria-valuenow", challengeComplete ? "1" : "0");
    $("confidence-meter").firstElementChild.style.width = challengeComplete ? "100%" : "0%";
    $("spending-meter-wrap").hidden = spendingLimit <= 0;
    $("spending-meter-status").hidden = spendingLimit > 0;
    if (spendingLimit > 0) {
      const percent = Math.min(100, totalSpent / spendingLimit * 100);
      $("spending-meter").style.width = percent + "%";
      $("spending-meter-wrap").setAttribute("aria-valuenow", String(Math.round(percent)));
      const overage = totalSpent > spendingLimit ? " · " + formatMoney(totalSpent - spendingLimit) + " over limit" : "";
      $("spending-meter-status").textContent = "Limit: " + formatMoney(spendingLimit) + overage;
    }
  }

  function restoreProfile() {
    $("preferred-name").value = typeof demo.name === "string" ? demo.name : "";
    $("life-stage").value = typeof demo.lifeStage === "string" ? demo.lifeStage : "";
    $("focus-area").value = sessionData.focusArea;
    refreshProfile();
  }

  function restoreProgressInputs() {
    const completed = demo.completed && typeof demo.completed === "object" ? demo.completed : {};
    const categories = new Set(all("[data-progress]").map(input => input.dataset.progress));
    categories.forEach(category => {
      const selected = Array.isArray(completed[category]) ? completed[category] : [];
      all('[data-progress="' + category + '"]').forEach((input, index) => {
        input.checked = selected.includes(index);
      });
    });
  }

  function syncProgressInputs(category) {
    const checked = all('[data-progress="' + category + '"]')
      .map((input, index) => input.checked ? index : null)
      .filter(index => index !== null);
    if (category === "safety" || category === "wellness") {
      sessionData[category === "safety" ? "safetyChecks" : "wellnessChecks"] = checked;
      const feedbackId = category + "-feedback";
      if ($(feedbackId)) setFeedback(feedbackId, "Selections remain only in this open page session.");
      return;
    }
    if (!demo.completed || typeof demo.completed !== "object") demo.completed = {};
    demo.completed[category] = checked;
    persist();
    updateProgress();

    const messages = {
      safety: checked.length ? "Saved here on this device. Only keep the ideas that feel right to you." : "Your checklist is optional and stays on this device.",
      wellness: "A kind choice, however small, is still a kind choice.",
      growth: checked.length ? checked.length + " step" + (checked.length === 1 ? "" : "s") + " marked as yours. Go at your own pace." : "Choose any small step to mark it as yours.",
      lifestyle: "Your list is yours to change."
    };
    const feedbackId = category + "-feedback";
    if ($(feedbackId)) setFeedback(feedbackId, messages[category]);
  }

  function formatMoney(amount) {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(amount);
  }

  function todayKey() {
    const now = new Date();
    const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    return localDate.toISOString().slice(0, 10);
  }

  function renderSavedNotes() {
    const container = $("saved-notes-list");
    const notes = Array.isArray(demo.notes) ? demo.notes : [];
    container.replaceChildren();
    if (!notes.length && !demo.savedAffirmation) {
      const empty = document.createElement("p");
      empty.className = "muted";
      empty.textContent = "Any reminders you save will appear here on this device.";
      container.append(empty);
      return;
    }
    if (demo.savedAffirmation) {
      const row = document.createElement("div");
      row.className = "saved-note";
      const text = document.createElement("span");
      text.textContent = demo.savedAffirmation;
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "entry-delete";
      remove.textContent = "Remove";
      remove.setAttribute("aria-label", "Remove saved affirmation");
      remove.addEventListener("click", () => {
        delete demo.savedAffirmation;
        if ($("affirmation-text").textContent === text.textContent) {
          $("save-affirmation").setAttribute("aria-pressed", "false");
          $("save-affirmation").textContent = "♡ Save this one";
        }
        persist();
        renderSavedNotes();
        updateProgress();
      });
      row.append(text, remove);
      container.append(row);
    }
    notes.forEach((note, reverseIndex) => {
      const noteIndex = notes.length - reverseIndex - 1;
      const row = document.createElement("div");
      row.className = "saved-note";
      const text = document.createElement("span");
      text.textContent = note;
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "entry-delete";
      remove.textContent = "Remove";
      remove.setAttribute("aria-label", "Remove saved journal note");
      remove.addEventListener("click", () => {
        demo.notes.splice(noteIndex, 1);
        persist();
        renderSavedNotes();
        updateProgress();
      });
      row.append(text, remove);
      container.append(row);
    });
  }

  function updateAffirmation() {
    currentAffirmation = affirmations[Math.floor(Math.random() * affirmations.length)];
    $("affirmation-text").textContent = currentAffirmation;
    $("save-affirmation").setAttribute("aria-pressed", "false");
    $("save-affirmation").textContent = "♡ Save this one";
    setFeedback("affirmation-feedback", "");
  }

  function restoreAffirmation() {
    $("affirmation-text").textContent = currentAffirmation;
    if (demo.savedAffirmation === currentAffirmation) {
      $("save-affirmation").setAttribute("aria-pressed", "true");
      $("save-affirmation").textContent = "♥ Saved for you";
    }
  }

  function restoreMoneyInputs() {
    const budget = demo.budget && typeof demo.budget === "object" ? demo.budget : {};
    ["monthly-income", "needs-amount", "wants-amount", "savings-amount", "savings-target", "savings-current", "monthly-spending-limit"].forEach(id => {
      const key = id.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
      if (Number.isFinite(budget[key])) $(id).value = String(budget[key]);
    });
    const expenses = Array.isArray(demo.expenses) ? demo.expenses : [];
    renderExpenses(expenses);
    updateSavingsProgress();
    if (Object.keys(budget).length) calculateBudget(false);
  }

  function calculateBudget(save) {
    const ids = ["monthly-income", "needs-amount", "wants-amount", "savings-amount", "savings-target", "savings-current", "monthly-spending-limit"];
    if (!ids.some(id => $(id).value.trim() !== "")) {
      setFeedback("budget-result", "Enter at least one amount to update your snapshot.");
      return;
    }
    const amounts = ids.map(id => {
      const value = $(id).value.trim();
      return value === "" ? 0 : Number(value);
    });
    if (amounts.some(value => !Number.isFinite(value) || value < 0)) {
      setFeedback("budget-result", "Please enter zero or a positive amount in each field.");
      return;
    }
    const [income, needs, wants, savings, savingsTarget, savingsCurrent, monthlySpendingLimit] = amounts;
    const total = needs + wants + savings;
    const remainder = income - total;
    const format = new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });
    let result;
    if (income > 0) {
      result = remainder >= 0
        ? "Your example plan leaves " + format.format(remainder) + " unassigned."
        : "Your example plan is " + format.format(Math.abs(remainder)) + " above the income you entered.";
    } else {
      result = "Your example expenses add up to " + format.format(total) + ". Add an income amount if you'd like to compare.";
    }
    setFeedback("budget-result", result);
    if (save) {
      demo.budget = { monthlyIncome: income, needsAmount: needs, wantsAmount: wants, savingsAmount: savings, savingsTarget, savingsCurrent, monthlySpendingLimit };
      persist();
      updateSavingsProgress();
      updateProgress();
    }
  }

  function setCurrentDate() {
    $("today-label").textContent = new Intl.DateTimeFormat(undefined, {
      weekday: "short", month: "short", day: "numeric"
    }).format(new Date());
  }

  function restoreGrowthPlan() {
    const plan = demo.growthPlan && typeof demo.growthPlan === "object" ? demo.growthPlan : {};
    $("growth-idea").value = typeof plan.idea === "string" ? plan.idea : "";
    $("growth-step").value = typeof plan.step === "string" ? plan.step : "";
    if (plan.idea || plan.step) setFeedback("growth-plan-feedback", "Your idea is saved privately on this device.");
    renderCareerGoals();
  }

  function restoreLifestyle() {
    const saved = demo.lifestyle && typeof demo.lifestyle === "object" ? demo.lifestyle : {};
    if (saved.focus) {
      const button = document.querySelector('[data-lifestyle="' + CSS.escape(saved.focus) + '"]');
      if (button) button.classList.add("is-selected");
    }
    $("lifestyle-intention").value = typeof saved.intention === "string" ? saved.intention : "";
    if (saved.focus || saved.intention) setFeedback("lifestyle-feedback-save", "Your intention is saved privately on this device.");
  }

  function createId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function renderSimpleEntries(containerId, entries, emptyText, onDelete, formatEntry) {
    const container = $(containerId);
    container.replaceChildren();
    if (!entries.length) {
      const empty = document.createElement("p");
      empty.className = "muted";
      empty.textContent = emptyText;
      container.append(empty);
      return;
    }
    entries.forEach(entry => {
      const row = document.createElement("div");
      row.className = "entry-row";
      const content = document.createElement("span");
      content.className = "entry-content";
      formatEntry(content, entry);
      row.append(content);
      if (onDelete) {
        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "entry-delete";
        remove.textContent = "Remove";
        remove.setAttribute("aria-label", "Remove " + (entry.name || entry.description || "entry"));
        remove.addEventListener("click", () => onDelete(entry.id));
        row.append(remove);
      }
      container.append(row);
    });
  }

  function renderCareerGoals() {
    const goals = Array.isArray(demo.careerGoals) ? demo.careerGoals : [];
    renderSimpleEntries("career-goal-list", goals, "No goals yet. Add one small step to get started.", id => {
      demo.careerGoals = demo.careerGoals.filter(goal => goal.id !== id);
      persist();
      renderCareerGoals();
      updateProgress();
    }, (container, goal) => {
      const label = document.createElement("label");
      label.className = "goal-entry";
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = goal.done;
      checkbox.setAttribute("aria-label", "Mark " + goal.name + " as complete");
      checkbox.addEventListener("change", () => {
        goal.done = checkbox.checked;
        persist();
        updateProgress();
        setFeedback("career-goal-feedback", goal.done ? "Goal marked complete. Nice progress." : "Goal reopened.");
      });
      const text = document.createElement("span");
      text.textContent = goal.name;
      text.className = goal.done ? "is-complete" : "";
      label.append(checkbox, text);
      container.append(label);
    });
  }

  function renderExpenses(expenses) {
    const currentMonth = todayKey().slice(0, 7);
    const total = expenses
      .filter(item => typeof item.date === "string" && item.date.slice(0, 7) === currentMonth)
      .reduce((sum, item) => sum + item.amount, 0);
    $("expense-total").textContent = formatMoney(total);
    renderSimpleEntries("expense-list", expenses, "No expenses yet. Add an entry to see your spending summary.", id => {
      demo.expenses = demo.expenses.filter(item => item.id !== id);
      persist();
      renderExpenses(demo.expenses);
      updateProgress();
    }, (container, item) => {
      const title = document.createElement("strong");
      title.textContent = item.description;
      const detail = document.createElement("small");
      detail.textContent = item.category + " · " + item.date;
      const amount = document.createElement("b");
      amount.className = "entry-amount";
      amount.textContent = formatMoney(item.amount);
      container.append(title, detail, amount);
    });
    updateProgress();
  }

  function updateSavingsProgress() {
    const target = Number($("savings-target").value);
    const saved = Number($("savings-current").value);
    if (!target) {
      $("savings-progress").textContent = "Add a savings goal to see your progress.";
      return;
    }
    const percent = Math.min(100, saved / target * 100);
    $("savings-progress").textContent = formatMoney(saved) + " of " + formatMoney(target) + " · " + Math.round(percent) + "% toward your goal.";
  }

  function renderJournal(containerId, entries, emptyText) {
    const container = $(containerId);
    container.replaceChildren();
    if (!entries.length) {
      const empty = document.createElement("p");
      empty.className = "muted";
      empty.textContent = emptyText;
      container.append(empty);
      return;
    }
    entries.forEach(note => {
      const item = document.createElement("p");
      item.className = "session-entry";
      item.textContent = note;
      container.append(item);
    });
  }

  function renderCycleNotes() {
    const list = $("cycle-note-list");
    list.replaceChildren();
    $("clear-cycle-notes").disabled = sessionData.cycleNotes.length === 0;
    if (!sessionData.cycleNotes.length) {
      const empty = document.createElement("p");
      empty.className = "muted";
      empty.textContent = "No body notes in this session.";
      list.append(empty);
      return;
    }
    sessionData.cycleNotes.forEach(note => {
      const row = document.createElement("div");
      row.className = "session-entry";
      const content = document.createElement("span");
      content.textContent = [note.cycle, note.symptom].filter(Boolean).join(" · ");
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "entry-delete";
      remove.textContent = "Remove";
      remove.setAttribute("aria-label", "Remove body note");
      remove.addEventListener("click", () => {
        sessionData.cycleNotes.splice(sessionData.cycleNotes.indexOf(note), 1);
        renderCycleNotes();
      });
      row.append(content, remove);
      list.append(row);
    });
  }

  const interviewAnswers = {
    strength: "A useful sample is specific and honest: “I bring clear communication and follow-through. In my last project, I kept the team aligned by sharing concise updates and asking early when priorities changed.” Adapt the example to your real experience.",
    challenge: "You might structure a real example as context, your actions, and what you learned: “We had a tight deadline, so I clarified the must-haves, asked for help with one blocker, and delivered the essential work on time. I learned to flag risks earlier.”",
    motivation: "Connect a genuine interest to the work: “I'm interested in this opportunity because it combines [skill you enjoy] with [problem or purpose]. I'd be excited to contribute by [specific strength] while learning [area].”"
  };
  const challenges = [
    "Name one thing you handled well today.",
    "Ask a question you've been holding back, if it feels right.",
    "Give yourself credit for a small effort.",
    "Take a moment to notice a strength you used this week.",
    "Practice saying one preference out loud."
  ];
  const boundaryPhrases = {
    time: ["I can't take that on right now, but thank you for asking.", "Let me check my priorities before I commit.", "I can help with one part, but not the whole request."],
    privacy: ["I'd rather keep that personal, thanks for understanding.", "I'm not ready to talk about that.", "Let's talk about something else."],
    work: ["I can take this on if we adjust one of my current priorities.", "Could we agree which task should come first?", "I'm at capacity right now; let's revisit the timeline."]
  };

  function renderWins() {
    const wins = Array.isArray(demo.wins) ? demo.wins : [];
    renderSimpleEntries("win-list", wins, "Your wins will appear here when you add them.", id => {
      demo.wins = demo.wins.filter(win => win.id !== id);
      persist();
      renderWins();
      updateProgress();
    }, (container, win) => {
      container.textContent = win.text;
    });
  }

  function renderWardrobe() {
    const items = Array.isArray(demo.wardrobe) ? demo.wardrobe : [];
    renderSimpleEntries("wardrobe-list", items, "Your wardrobe list is empty. Add a few pieces to start an outfit.", id => {
      demo.wardrobe = demo.wardrobe.filter(item => item.id !== id);
      if (Array.isArray(demo.outfits)) {
        demo.outfits = demo.outfits
          .map(outfit => ({ ...outfit, itemIds: outfit.itemIds.filter(itemId => itemId !== id) }))
          .filter(outfit => outfit.itemIds.length);
      }
      persist();
      renderWardrobe();
      renderOutfits();
    }, (container, item) => {
      const name = document.createElement("strong");
      name.textContent = item.name;
      const detail = document.createElement("small");
      detail.textContent = [item.category, item.color].filter(Boolean).join(" · ");
      container.append(name, detail);
    });
    const select = $("outfit-pieces");
    const selected = new Set(Array.from(select.selectedOptions, option => option.value));
    select.replaceChildren();
    items.forEach(item => {
      const option = document.createElement("option");
      option.value = item.id;
      option.textContent = item.name + " (" + item.category + ")";
      option.selected = selected.has(item.id);
      select.append(option);
    });
    $("outfit-form").querySelector('button[type="submit"]').disabled = items.length === 0;
  }

  function renderOutfits() {
    const outfits = Array.isArray(demo.outfits) ? demo.outfits : [];
    renderSimpleEntries("outfit-list", outfits, "No outfits saved yet. Add wardrobe pieces, then create a combination.", id => {
      demo.outfits = demo.outfits.filter(outfit => outfit.id !== id);
      persist();
      renderOutfits();
    }, (container, outfit) => {
      const name = document.createElement("strong");
      name.textContent = outfit.name;
      const pieces = (demo.wardrobe || []).filter(item => outfit.itemIds.includes(item.id)).map(item => item.name);
      const detail = document.createElement("small");
      detail.textContent = pieces.join(" · ");
      container.append(name, detail);
    });
  }

  all(".nav-item[data-section]").forEach(button => {
    button.addEventListener("click", () => navigateTo(button.dataset.section));
  });
  all("[data-open-section]").forEach(button => {
    button.addEventListener("click", () => navigateTo(button.dataset.openSection));
  });
  document.querySelector(".brand").addEventListener("click", event => {
    event.preventDefault();
    navigateTo("home");
  });

  $("dashboard-shortcuts").addEventListener("click", event => {
    const button = event.target.closest("[data-open-section]");
    if (button) navigateTo(button.dataset.openSection);
  });

  $("search-form").addEventListener("submit", event => {
    event.preventDefault();
    const matches = searchSections($("app-search").value);
    if (matches.length) navigateTo(matches[0].section);
  });
  $("app-search").addEventListener("input", () => searchSections($("app-search").value));
  $("search-results").addEventListener("click", event => {
    const button = event.target.closest("[data-search-section]");
    if (button) navigateTo(button.dataset.searchSection);
  });
  $("search-shortcut").addEventListener("click", () => $("app-search").focus());
  $("search-toggle").addEventListener("click", () => {
    const isOpen = $("search-form").classList.toggle("is-open");
    $("search-toggle").setAttribute("aria-expanded", String(isOpen));
    if (isOpen) $("app-search").focus();
    else closeSearchResults();
  });

  $("theme-toggle").addEventListener("click", () => {
    $("display-theme").value = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    updateDisplayPreferences();
  });
  ["display-theme", "display-scale", "compact-layout", "reduce-motion"].forEach(id => {
    $(id).addEventListener("change", updateDisplayPreferences);
  });
  $("shortcut-options").addEventListener("change", event => {
    if (!event.target.matches('input[type="checkbox"]')) return;
    demo.dashboardShortcuts = all("#shortcut-options input:checked").map(input => input.value);
    persist();
    renderDashboardShortcuts();
    setFeedback("shortcut-feedback", "Dashboard shortcuts updated.");
  });
  $("settings-search").addEventListener("click", () => {
    $("search-form").classList.add("is-open");
    $("search-toggle").setAttribute("aria-expanded", "true");
    $("app-search").focus();
    const behavior = document.documentElement.classList.contains("reduce-motion") || window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
    $("app-search").scrollIntoView({ block: "nearest", behavior });
  });
  systemTheme.addEventListener("change", () => {
    const preferences = demo.displayPreferences && typeof demo.displayPreferences === "object" ? demo.displayPreferences : {};
    if (!preferences.theme || preferences.theme === "system") applyDisplayPreferences();
  });

  window.addEventListener("popstate", () => {
    const section = window.location.hash.slice(1);
    visitSection(sectionNames[section] ? section : "home");
  });
  window.addEventListener("hashchange", () => {
    const section = window.location.hash.slice(1);
    if (sectionNames[section] && section !== activeSection) visitSection(section);
  });

  $("menu-toggle").addEventListener("click", () => {
    const isOpen = $("sidebar").classList.toggle("is-open");
    $("mobile-scrim").hidden = !isOpen;
    $("menu-toggle").setAttribute("aria-expanded", String(isOpen));
    $("menu-toggle").setAttribute("aria-label", isOpen ? "Close navigation" : "Open navigation");
  });
  $("mobile-scrim").addEventListener("click", closeMobileMenu);

  $("profile-toggle").addEventListener("click", () => {
    const isOpen = $("profile-panel").hidden;
    $("profile-panel").hidden = !isOpen;
    $("profile-toggle").setAttribute("aria-expanded", String(isOpen));
    if (isOpen) $("preferred-name").focus();
  });
  $("save-preferences").addEventListener("click", () => {
    demo.name = $("preferred-name").value.trim().slice(0, 32);
    demo.lifeStage = $("life-stage").value;
    sessionData.focusArea = $("focus-area").value;
    delete demo.focusArea;
    persist();
    refreshProfile();
    closeProfile();
    $("profile-toggle").focus();
  });

  document.addEventListener("click", event => {
    if (!$("profile-panel").hidden && !event.target.closest(".profile-wrap")) closeProfile();
  });
  document.addEventListener("keydown", event => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      $("search-form").classList.add("is-open");
      $("search-toggle").setAttribute("aria-expanded", "true");
      $("app-search").focus();
      $("app-search").select();
      return;
    }
    if (event.key !== "Escape") return;
    const hadSearchResults = !$("search-results").hidden;
    const hadSearch = $("search-form").classList.contains("is-open");
    const hadProfile = !$("profile-panel").hidden;
    const hadMobileMenu = $("sidebar").classList.contains("is-open");
    closeSearchResults();
    closeProfile();
    closeMobileMenu();
    if (hadSearchResults || hadSearch) {
      if (window.matchMedia("(max-width: 640px)").matches) $("search-toggle").focus();
      else $("app-search").focus();
    }
    else if (hadProfile) $("profile-toggle").focus();
    else if (hadMobileMenu) $("menu-toggle").focus();
  });

  all("[data-progress]").forEach(input => {
    input.addEventListener("change", () => syncProgressInputs(input.dataset.progress));
  });

  all("[data-session-check]").forEach(input => {
    input.addEventListener("change", () => {
      const checks = sessionData[input.dataset.sessionCheck === "safety" ? "safetyChecks" : "wellnessChecks"];
      const group = all('[data-session-check="' + input.dataset.sessionCheck + '"]');
      const index = group.indexOf(input);
      if (input.checked && !checks.includes(index)) checks.push(index);
      if (!input.checked) {
        const position = checks.indexOf(index);
        if (position >= 0) checks.splice(position, 1);
      }
      setFeedback(input.dataset.sessionCheck + "-feedback", "Selections remain only in this open page session.");
    });
  });

  all("[data-mood]").forEach(button => {
    button.addEventListener("click", () => {
      selectedMood = button.dataset.mood;
      all("[data-mood]").forEach(option => {
        const isSelected = option === button;
        option.classList.toggle("is-selected", isSelected);
        option.setAttribute("aria-pressed", String(isSelected));
      });
      setFeedback("mood-feedback", "Noted: " + selectedMood + ". Save today's check-in when you're ready.");
    });
    button.setAttribute("aria-pressed", "false");
  });

  $("save-checkin").addEventListener("click", () => {
    if (!selectedMood) {
      setFeedback("mood-feedback", "Choose a feeling first, or skip today's check-in if you'd rather.");
      return;
    }
    sessionData.checkins++;
    $("save-checkin").disabled = true;
    $("save-checkin").textContent = "Check-in noted this session";
    setFeedback("mood-feedback", "Noted for this session only. Your mood is not saved to browser storage.");
    updateProgress();
  });

  $("save-mood-journal").addEventListener("click", () => {
    const note = $("mood-journal").value.trim();
    if (!note) {
      setFeedback("mood-journal-feedback", "Write a note first, or leave the journal blank.");
      return;
    }
    sessionData.moodNotes.push(note.slice(0, 500));
    $("mood-journal").value = "";
    $("clear-mood-journal").disabled = false;
    renderJournal("mood-journal-list", sessionData.moodNotes, "No notes in this session.");
    setFeedback("mood-journal-feedback", "Added to this page session only. Nothing was written to browser storage.");
  });
  $("clear-mood-journal").addEventListener("click", () => {
    sessionData.moodNotes = [];
    $("clear-mood-journal").disabled = true;
    renderJournal("mood-journal-list", sessionData.moodNotes, "No notes in this session.");
    setFeedback("mood-journal-feedback", "Session notes cleared.");
  });

  $("save-cycle-note").addEventListener("click", () => {
    const cycle = $("cycle-note").value.trim();
    const symptom = $("symptom-note").value;
    if (!cycle && !symptom) {
      setFeedback("cycle-feedback", "Add an optional cycle or symptom note first, or skip this.");
      return;
    }
    sessionData.cycleNotes.push({ cycle: cycle.slice(0, 80), symptom });
    $("cycle-note").value = "";
    $("symptom-note").value = "";
    renderCycleNotes();
    setFeedback("cycle-feedback", "Added to this page session only. Close or refresh to clear it.");
  });
  $("clear-cycle-notes").addEventListener("click", () => {
    sessionData.cycleNotes = [];
    renderCycleNotes();
    setFeedback("cycle-feedback", "Session-only body notes cleared.");
  });

  $("water-add").addEventListener("click", () => {
    sessionData.water++;
    $("water-count").textContent = String(sessionData.water);
    $("water-remove").disabled = false;
    setFeedback("water-feedback", "Noted for this session only. This is not a target.");
  });
  $("water-remove").addEventListener("click", () => {
    sessionData.water = Math.max(0, sessionData.water - 1);
    $("water-count").textContent = String(sessionData.water);
    $("water-remove").disabled = sessionData.water === 0;
    setFeedback("water-feedback", sessionData.water ? "One glass removed from this session's count." : "Count reset to zero.");
  });

  function showJourneyTime() {
    const minutes = Math.floor(sessionData.journeyRemaining / 60);
    const seconds = sessionData.journeyRemaining % 60;
    $("journey-timer-display").textContent = minutes + ":" + String(seconds).padStart(2, "0") + " remaining";
  }
  $("journey-start").addEventListener("click", () => {
    if (sessionData.journeyTimer) return;
    sessionData.journeyRemaining = Number($("journey-duration").value) * 60;
    if (!Number.isFinite(sessionData.journeyRemaining) || sessionData.journeyRemaining < 60) {
      setFeedback("journey-feedback", "Choose a timer length of at least one minute.");
      return;
    }
    $("journey-start").disabled = true;
    $("journey-stop").disabled = false;
    $("journey-duration").disabled = true;
    showJourneyTime();
    setFeedback("journey-feedback", "Demo timer running on this page only. It does not notify anyone.");
    sessionData.journeyTimer = window.setInterval(() => {
      sessionData.journeyRemaining--;
      if (sessionData.journeyRemaining <= 0) {
        window.clearInterval(sessionData.journeyTimer);
        sessionData.journeyTimer = null;
        $("journey-timer-display").textContent = "Timer complete";
        $("journey-start").disabled = false;
        $("journey-stop").disabled = true;
        $("journey-duration").disabled = false;
        setFeedback("journey-feedback", "Demo timer finished. No contact or alert was sent.");
        return;
      }
      showJourneyTime();
    }, 1000);
  });
  $("journey-stop").addEventListener("click", () => {
    if (sessionData.journeyTimer) window.clearInterval(sessionData.journeyTimer);
    sessionData.journeyTimer = null;
    sessionData.journeyRemaining = 0;
    $("journey-timer-display").textContent = "Not started";
    $("journey-start").disabled = false;
    $("journey-stop").disabled = true;
    $("journey-duration").disabled = false;
    setFeedback("journey-feedback", "Demo timer stopped. No contact or alert was sent.");
  });

  $("sos-simulate").addEventListener("click", () => {
    if (sessionData.sosTimer) return;
    let seconds = 5;
    $("sos-simulate").disabled = true;
    $("sos-cancel").hidden = false;
    setFeedback("sos-feedback", "SOS SIMULATION ONLY — ending in " + seconds + ". No call or message is sent.");
    sessionData.sosTimer = window.setInterval(() => {
      seconds--;
      if (seconds <= 0) {
        window.clearInterval(sessionData.sosTimer);
        sessionData.sosTimer = null;
        $("sos-simulate").disabled = false;
        $("sos-cancel").hidden = true;
        setFeedback("sos-feedback", "Simulation ended. No call, message, location share, or alert was sent.");
        return;
      }
      setFeedback("sos-feedback", "SOS SIMULATION ONLY — ending in " + seconds + ". No call or message is sent.");
    }, 1000);
  });
  $("sos-cancel").addEventListener("click", () => {
    if (sessionData.sosTimer) window.clearInterval(sessionData.sosTimer);
    sessionData.sosTimer = null;
    $("sos-simulate").disabled = false;
    $("sos-cancel").hidden = true;
    setFeedback("sos-feedback", "Simulation cancelled. No one was contacted.");
  });

  $("breathing-button").addEventListener("click", () => {
    const status = $("breathing-status");
    if (breathingTimer) {
      window.clearInterval(breathingTimer);
      breathingTimer = null;
      status.classList.remove("is-breathing");
      status.textContent = "Paused. Take care of yourself.";
      $("breathing-button").textContent = "Start a gentle pause";
      return;
    }
    let step = 0;
    const cues = ["If it feels comfortable, breathe in gently.", "And now, let your breath out at your own pace."];
    status.classList.add("is-breathing");
    $("breathing-button").textContent = "Pause";
    status.textContent = cues[0];
    breathingTimer = window.setInterval(() => {
      step++;
      if (step >= 6) {
        window.clearInterval(breathingTimer);
        breathingTimer = null;
        status.classList.remove("is-breathing");
        status.textContent = "That's your pause. Carry on whenever you're ready.";
        $("breathing-button").textContent = "Start another gentle pause";
        return;
      }
      status.textContent = cues[step % cues.length];
    }, 4000);
  });

  $("save-growth-plan").addEventListener("click", () => {
    const idea = $("growth-idea").value.trim();
    const step = $("growth-step").value.trim();
    if (!idea && !step) {
      setFeedback("growth-plan-feedback", "Add an idea or first step if you'd like to save a plan.");
      return;
    }
    demo.growthPlan = { idea, step };
    persist();
    setFeedback("growth-plan-feedback", "Your idea is saved privately on this device.");
  });

  $("career-goal-form").addEventListener("submit", event => {
    event.preventDefault();
    const input = $("career-goal-input");
    const name = input.value.trim();
    if (!name) {
      input.setCustomValidity("Enter a goal before adding it.");
      input.reportValidity();
      input.setCustomValidity("");
      return;
    }
    if (!Array.isArray(demo.careerGoals)) demo.careerGoals = [];
    if (demo.careerGoals.length >= 20) {
      setFeedback("career-goal-feedback", "You can keep up to 20 demo goals. Remove one before adding another.");
      return;
    }
    demo.careerGoals.push({ id: createId(), name: name.slice(0, 120), done: false });
    persist();
    input.value = "";
    renderCareerGoals();
    updateProgress();
    setFeedback("career-goal-feedback", "Goal added. Break it into a small next step whenever you're ready.");
  });

  $("interview-question").addEventListener("change", () => {
    $("interview-prompt").textContent = $("interview-question").selectedOptions[0].textContent;
    $("interview-answer").hidden = true;
    $("show-interview-answer").setAttribute("aria-expanded", "false");
    $("show-interview-answer").textContent = "Show sample answer";
    $("interview-answer").textContent = "";
  });
  $("show-interview-answer").addEventListener("click", () => {
    const answer = $("interview-answer");
    const show = answer.hidden;
    answer.textContent = show ? interviewAnswers[$("interview-question").value] : "";
    answer.hidden = !show;
    $("show-interview-answer").setAttribute("aria-expanded", String(show));
    $("show-interview-answer").textContent = show ? "Hide sample answer" : "Show sample answer";
  });
  $("save-interview-notes").addEventListener("click", () => {
    const notes = $("interview-notes").value.trim();
    if (!notes) {
      setFeedback("interview-feedback", "Write a practice note first, or skip this step.");
      return;
    }
    sessionData.interviewNotes = notes.slice(0, 300);
    $("interview-notes").value = "";
    setFeedback("interview-feedback", "Saved for this page session only; not written to browser storage.");
  });

  $("calculate-budget").addEventListener("click", () => calculateBudget(true));
  all("#monthly-income, #needs-amount, #wants-amount, #savings-amount, #savings-target, #savings-current, #monthly-spending-limit").forEach(input => {
    input.addEventListener("keydown", event => {
      if (event.key === "Enter") calculateBudget(true);
    });
    input.addEventListener("input", updateSavingsProgress);
  });
  $("expense-form").addEventListener("submit", event => {
    event.preventDefault();
    const description = $("expense-description").value.trim();
    const amount = Number($("expense-amount").value);
    const date = $("expense-date").value;
    if (!description || !Number.isFinite(amount) || amount <= 0 || amount > 100000000 || !date) {
      setFeedback("expense-feedback", "Enter a description, a valid date, and an amount greater than zero.");
      return;
    }
    if (Number.isNaN(new Date(date + "T00:00:00").getTime()) || date > todayKey()) {
      setFeedback("expense-feedback", "Choose a valid expense date that is not in the future.");
      return;
    }
    if (!Array.isArray(demo.expenses)) demo.expenses = [];
    if (demo.expenses.length >= 250) {
      setFeedback("expense-feedback", "This demo keeps up to 250 expense entries. Remove one before adding another.");
      return;
    }
    demo.expenses.push({
      id: createId(),
      description: description.slice(0, 60),
      amount: Math.round(amount * 100) / 100,
      category: $("expense-category").value,
      date
    });
    persist();
    $("expense-description").value = "";
    $("expense-amount").value = "";
    $("expense-date").value = todayKey();
    $("expense-date").max = todayKey();
    renderExpenses(demo.expenses);
    setFeedback("expense-feedback", "Expense added to this browser's demo list.");
  });

  $("new-affirmation").addEventListener("click", updateAffirmation);
  $("save-affirmation").addEventListener("click", () => {
    const button = $("save-affirmation");
    if (demo.savedAffirmation === currentAffirmation) {
      delete demo.savedAffirmation;
      button.setAttribute("aria-pressed", "false");
      button.textContent = "♡ Save this one";
      setFeedback("affirmation-feedback", "Removed from your saved reminders.");
    } else {
      demo.savedAffirmation = currentAffirmation;
      button.setAttribute("aria-pressed", "true");
      button.textContent = "♥ Saved for you";
      setFeedback("affirmation-feedback", "Saved to your reminders on this device.");
    }
    persist();
    renderSavedNotes();
    updateProgress();
  });
  $("save-confidence-note").addEventListener("click", () => {
    const note = $("confidence-note").value.trim();
    if (!note) {
      setFeedback("confidence-note-feedback", "Write a note first, or leave this space blank if you'd prefer.");
      return;
    }
    if (!Array.isArray(demo.notes)) demo.notes = [];
    demo.notes.push(note.slice(0, 240));
    demo.notes = demo.notes.slice(-20);
    persist();
    $("confidence-note").value = "";
    setFeedback("confidence-note-feedback", "Your note is saved on this device.");
    renderSavedNotes();
    updateProgress();
  });

  function refreshChallenge() {
    const dayNumber = Math.floor((new Date(todayKey() + "T00:00:00") - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
    const challenge = challenges[dayNumber % challenges.length];
    $("daily-challenge").textContent = challenge;
    const completed = demo.challengeComplete === todayKey();
    $("complete-challenge").disabled = completed;
    $("complete-challenge").textContent = completed ? "Today's challenge complete" : "I gave it a try";
    setFeedback("challenge-feedback", completed ? "You showed up for yourself today. Nice work." : "Optional—trying counts, whatever that looks like.");
  }
  $("complete-challenge").addEventListener("click", () => {
    demo.challengeComplete = todayKey();
    persist();
    refreshChallenge();
    updateProgress();
  });
  $("win-form").addEventListener("submit", event => {
    event.preventDefault();
    const input = $("win-input");
    const text = input.value.trim();
    if (!text) {
      setFeedback("win-feedback", "Add a win first, even a tiny one.");
      return;
    }
    if (!Array.isArray(demo.wins)) demo.wins = [];
    if (demo.wins.length >= 100) {
      setFeedback("win-feedback", "This demo keeps up to 100 wins. Remove one to make room.");
      return;
    }
    demo.wins.push({ id: createId(), text: text.slice(0, 160) });
    persist();
    input.value = "";
    renderWins();
    updateProgress();
    setFeedback("win-feedback", "Saved. Your effort counts.");
  });

  let boundaryPhraseIndex = 0;
  function updateBoundaryPhrase() {
    const scenario = $("boundary-scenario").value;
    const phrases = boundaryPhrases[scenario];
    boundaryPhraseIndex %= phrases.length;
    $("boundary-response").textContent = "“" + phrases[boundaryPhraseIndex] + "”";
  }
  $("boundary-scenario").addEventListener("change", () => {
    boundaryPhraseIndex = 0;
    updateBoundaryPhrase();
  });
  $("boundary-alternate").addEventListener("click", () => {
    const phrases = boundaryPhrases[$("boundary-scenario").value];
    boundaryPhraseIndex = (boundaryPhraseIndex + 1) % phrases.length;
    updateBoundaryPhrase();
  });
  $("save-boundary-practice").addEventListener("click", () => {
    const note = $("boundary-practice").value.trim();
    if (!note) {
      setFeedback("boundary-feedback", "Write a phrase first, or skip practice.");
      return;
    }
    sessionData.boundaryNotes = note.slice(0, 240);
    $("boundary-practice").value = "";
    setFeedback("boundary-feedback", "Kept for this page session only. It is not saved to browser storage.");
  });

  $("wardrobe-form").addEventListener("submit", event => {
    event.preventDefault();
    const name = $("wardrobe-item").value.trim();
    if (!name) {
      setFeedback("wardrobe-feedback", "Add an item name first.");
      return;
    }
    if (!Array.isArray(demo.wardrobe)) demo.wardrobe = [];
    if (demo.wardrobe.length >= 100) {
      setFeedback("wardrobe-feedback", "This demo keeps up to 100 wardrobe pieces. Remove one to add more.");
      return;
    }
    demo.wardrobe.push({
      id: createId(),
      name: name.slice(0, 60),
      category: $("wardrobe-category").value,
      color: $("wardrobe-color").value.trim().slice(0, 24)
    });
    persist();
    $("wardrobe-item").value = "";
    $("wardrobe-color").value = "";
    renderWardrobe();
    setFeedback("wardrobe-feedback", "Piece added to your local demo wardrobe.");
  });

  $("outfit-form").addEventListener("submit", event => {
    event.preventDefault();
    const name = $("outfit-name").value.trim();
    const itemIds = Array.from($("outfit-pieces").selectedOptions, option => option.value);
    if (!name) {
      setFeedback("outfit-feedback", "Give your outfit a name first.");
      return;
    }
    if (!itemIds.length) {
      setFeedback("outfit-feedback", "Choose at least one wardrobe piece for your combination.");
      return;
    }
    if (!Array.isArray(demo.outfits)) demo.outfits = [];
    if (demo.outfits.length >= 50) {
      setFeedback("outfit-feedback", "This demo keeps up to 50 outfits. Remove one before saving another.");
      return;
    }
    demo.outfits.push({ id: createId(), name: name.slice(0, 60), itemIds });
    persist();
    $("outfit-name").value = "";
    renderOutfits();
    setFeedback("outfit-feedback", "Outfit combination saved on this device.");
  });

  all("[data-lifestyle]").forEach(button => {
    button.addEventListener("click", () => {
      all("[data-lifestyle]").forEach(choice => {
        const isSelected = choice === button;
        choice.classList.toggle("is-selected", isSelected);
        choice.setAttribute("aria-pressed", String(isSelected));
      });
      if (!demo.lifestyle || typeof demo.lifestyle !== "object") demo.lifestyle = {};
      demo.lifestyle.focus = button.dataset.lifestyle;
      persist();
      setFeedback("lifestyle-feedback-save", "Chosen: " + button.dataset.lifestyle + ". Add an intention if you'd like.");
    });
    button.setAttribute("aria-pressed", "false");
  });
  $("save-lifestyle").addEventListener("click", () => {
    if (!demo.lifestyle || typeof demo.lifestyle !== "object") demo.lifestyle = {};
    demo.lifestyle.intention = $("lifestyle-intention").value.trim().slice(0, 120);
    persist();
    setFeedback("lifestyle-feedback-save", "Your intention is saved privately on this device.");
  });

  window.addEventListener("pagehide", () => {
    if (sessionData.journeyTimer) window.clearInterval(sessionData.journeyTimer);
    if (sessionData.sosTimer) window.clearInterval(sessionData.sosTimer);
    if (breathingTimer) window.clearInterval(breathingTimer);
    if (noticeTimer) window.clearTimeout(noticeTimer);
    sessionData.journeyTimer = null;
    sessionData.sosTimer = null;
    breathingTimer = null;
    noticeTimer = null;
    sessionData.journeyRemaining = 0;
    $("journey-start").disabled = false;
    $("journey-stop").disabled = true;
    $("journey-duration").disabled = false;
    $("journey-timer-display").textContent = "Not started";
    $("sos-simulate").disabled = false;
    $("sos-cancel").hidden = true;
    $("sos-feedback").textContent = "Simulation stopped when leaving the page. No call or alert was sent.";
    $("breathing-status").classList.remove("is-breathing");
    $("breathing-status").textContent = "Paused when leaving the page.";
    $("breathing-button").textContent = "Start a gentle pause";
    $("app-notification").hidden = true;
  });

  $("expense-date").value = todayKey();
  renderJournal("mood-journal-list", sessionData.moodNotes, "No notes in this session.");
  renderCycleNotes();
  renderWins();
  renderWardrobe();
  renderOutfits();
  refreshChallenge();
  updateBoundaryPhrase();
  restoreProfile();
  restoreAffirmation();
  restoreProgressInputs();
  restoreGrowthPlan();
  restoreLifestyle();
  restoreMoneyInputs();
  applyDisplayPreferences();
  renderDashboardShortcuts();
  renderShortcutSettings();
  renderSavedNotes();
  updateProgress();
  setCurrentDate();
  persist();

  const requestedSection = window.location.hash.slice(1);
  visitSection(sectionNames[requestedSection] ? requestedSection : "home");
  appReady = true;
})();
