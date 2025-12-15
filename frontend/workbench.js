const API_BASE = "http://127.0.0.1:8000";

const STATUS_COLORS = {
  active: "green",
  draft: "yellow",
  archived: "grey",
  green: "green",
  yellow: "yellow",
  red: "red",
  grey: "grey",
};

const state = {
  domains: [],
  users: [],
  cardsCache: [],
  assistant: {
    query: "",
    searchBlocks: [],
    filters: {
      domain: "",
      statuses: new Set(),
      sort: "relevance",
      visibility: "all",
    },
    selections: new Set(),
    hasChatStarted: false,
  },
  chat: {
    messages: [],
    setHistory: [],
    activeSetId: null,
    hideSources: false,
    previousChat: [],
  },
  registry: {
    page: 1,
    pageSize: 10,
    total: 0,
    view: "table",
    selected: new Set(),
    filters: {
      domain: "",
      status: "",
      search: "",
      owner: "",
      reviewer: "",
      onlyMine: false,
      verifiedFrom: "",
      sort: "updated",
    },
  },
};

const el = {
  assistantQuery: document.getElementById("assistant-query"),
  assistantSearch: document.getElementById("assistant-search"),
  assistantDomain: document.getElementById("assistant-domain-filter"),
  assistantSort: document.getElementById("assistant-sort"),
  assistantResults: document.getElementById("assistant-results"),
  assistantClear: document.getElementById("assistant-clear"),
  statusFilters: Array.from(document.querySelectorAll(".status-filter")),
  markAll: document.getElementById("mark-all"),
  unmarkAll: document.getElementById("unmark-all"),
  onlySelected: document.getElementById("only-selected"),
  onlyUnselected: document.getElementById("only-unselected"),
  chooseRecommended: document.getElementById("choose-recommended"),
  selectionSummary: document.getElementById("selection-summary"),

  selectedChips: document.getElementById("selected-chips"),
  chatSetInfo: document.getElementById("chat-set-info"),
  chatHistory: document.getElementById("chat-history"),
  chatBlocker: document.getElementById("chat-blocker"),
  prechatComposer: document.getElementById("prechat-composer"),
  prechatInput: document.getElementById("prechat-input"),
  prechatSend: document.getElementById("prechat-send"),
  chatComposer: document.getElementById("chat-composer"),
  chatInput: document.getElementById("chat-input"),
  chatSend: document.getElementById("chat-send"),
  hideSourcesToggle: document.getElementById("hide-sources-toggle"),
  clearSelected: document.getElementById("clear-selected"),
  clearChat: document.getElementById("clear-chat"),
  restoreChat: document.getElementById("restore-chat"),
  exportChat: document.getElementById("export-chat"),

  tabChat: document.getElementById("tab-chat"),
  tabRegistry: document.getElementById("tab-registry"),
  chatView: document.getElementById("chat-view"),
  registryView: document.getElementById("registry-view"),

  registryTableBody: document.querySelector("#registry-table tbody"),
  registryPage: document.getElementById("registry-page"),
  registryPrev: document.getElementById("registry-prev"),
  registryNext: document.getElementById("registry-next"),
  registryDomain: document.getElementById("registry-domain"),
  registryStatus: document.getElementById("registry-status"),
  registrySearch: document.getElementById("registry-search"),
  registryApply: document.getElementById("registry-apply"),
  registryPageSize: document.getElementById("registry-page-size"),
  registryOwner: document.getElementById("registry-owner"),
  registryReviewer: document.getElementById("registry-reviewer"),
  registryVerifiedFrom: document.getElementById("registry-verified-from"),
  registryOnlyMine: document.getElementById("registry-only-mine"),
  registrySort: document.getElementById("registry-sort"),
  registryViewTable: document.getElementById("registry-view-table"),
  registryViewCompact: document.getElementById("registry-view-compact"),

  notificationContainer: document.getElementById("notification-container"),
  modalOverlay: document.getElementById("modal-overlay"),
  modalClose: document.getElementById("modal-close"),
  modalCancel: document.getElementById("modal-cancel"),
  modalSave: document.getElementById("modal-save"),
  cardTitleInput: document.getElementById("card-title-input"),
  cardDescriptionInput: document.getElementById("card-description-input"),
  cardDomainInput: document.getElementById("card-domain-input"),
  cardOwnerInput: document.getElementById("card-owner-input"),
  cardStatusInput: document.getElementById("card-status-input"),
  cardTagsInput: document.getElementById("card-tags-input"),
  cardContentInput: null,
  cardQuestionsInput: null,
  createCardBtn: document.getElementById("create-card"),
  modalBody: null,
};

function showNotification(message, type = "error", timeout = 4000) {
  const note = document.createElement("div");
  note.className = "notification";
  note.textContent = message;
  if (type === "success") {
    note.style.borderColor = "#2fb344";
    note.style.color = "#2fb344";
  }
  el.notificationContainer.appendChild(note);
  setTimeout(() => note.remove(), timeout);
}

function switchTab(target) {
  const isChat = target === "chat-view";
  el.chatView.classList.toggle("hidden", !isChat);
  el.registryView.classList.toggle("hidden", isChat);
  el.tabChat.classList.toggle("active", isChat);
  el.tabRegistry.classList.toggle("active", !isChat);
  if (!isChat) {
    loadRegistry();
  }
}

el.tabChat.addEventListener("click", () => switchTab("chat-view"));
el.tabRegistry.addEventListener("click", () => switchTab("registry-view"));

async function fetchDomains() {
  const res = await fetch(`${API_BASE}/domains/`);
  if (!res.ok) throw new Error("Не удалось загрузить домены");
  return res.json();
}

async function fetchUsers() {
  const res = await fetch(`${API_BASE}/users/`);
  if (!res.ok) throw new Error("Не удалось загрузить пользователей");
  return res.json();
}

async function fetchCards() {
  const res = await fetch(`${API_BASE}/cards/`);
  if (!res.ok) throw new Error("Не удалось загрузить карточки");
  return res.json();
}

function fillSelect(select, items, formatLabel, formatValue = (item) => item.id) {
  if (!select) return;
  const first = select.querySelector("option")?.outerHTML || "";
  select.innerHTML = first;
  items.forEach((item) => {
    const opt = document.createElement("option");
    opt.value = formatValue(item);
    opt.textContent = formatLabel(item);
    select.appendChild(opt);
  });
}

function ensureAssistantOptions() {
  fillSelect(el.assistantDomain, state.domains, (d) => `${d.code} — ${d.name}`);
  fillSelect(el.registryDomain, state.domains, (d) => `${d.code} — ${d.name}`);
  fillSelect(el.cardDomainInput, state.domains, (d) => `${d.code} — ${d.name}`);
}

function ensureUserOptions() {
  fillSelect(el.cardOwnerInput, state.users, (u) => u.name);
}

function colorDot(status) {
  const color = STATUS_COLORS[status] || "grey";
  return `<span class="dot dot-${color}"></span>`;
}

function statusLabel(status) {
  if (!status) return "—";
  const map = { green: "актуально", active: "активно", yellow: "требует ревизии", red: "критично", grey: "черновик" };
  return map[status] || status;
}

function computeScore(card, queryTerms) {
  if (!queryTerms.length) return 0;
  let score = 0;
  const textFields = [card.title || "", card.description || "", card.content || ""];
  queryTerms.forEach((term) => {
    if ((card.title || "").toLowerCase().includes(term)) score += 5;
    if ((card.description || "").toLowerCase().includes(term)) score += 3;
    if ((card.content || "").toLowerCase().includes(term)) score += 2;
  });
  const color = STATUS_COLORS[card.status] || "";
  if (color === "yellow") score -= 1;
  if (color === "red") score -= 2;
  if (color === "grey") score -= 0.5;
  return score;
}

function sortResults(results) {
  const sort = state.assistant.filters.sort;
  const sorted = [...results];
  if (sort === "title") {
    sorted.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
  } else if (sort === "verification") {
    sorted.sort((a, b) => new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0));
  } else {
    sorted.sort((a, b) => (b.score || 0) - (a.score || 0));
  }
  return sorted;
}

function applyAssistantFilters(results) {
  const domain = state.assistant.filters.domain;
  const statuses = state.assistant.filters.statuses;
  const visibility = state.assistant.filters.visibility;
  return results.filter((item) => {
    if (domain && String(item.domain_id || "") !== domain) return false;
    if (statuses.size && !statuses.has(STATUS_COLORS[item.status] || item.status)) return false;
    const isSelected = state.assistant.selections.has(item.id);
    if (visibility === "selected" && !isSelected) return false;
    if (visibility === "unselected" && isSelected) return false;
    return true;
  });
}

function renderAssistantList() {
  el.assistantResults.innerHTML = "";
  if (!state.assistant.searchBlocks.length) {
    el.assistantResults.textContent = "Пока нет результатов. Введите вопрос и нажмите Подобрать.";
    return;
  }

  state.assistant.searchBlocks.forEach((block) => {
    const blockEl = document.createElement("div");
    blockEl.className = "search-block";
    const head = document.createElement("div");
    head.className = "search-block-header";
    head.innerHTML = `<div class="search-question">Вы: ${block.query}</div><div class="search-time">${new Date(block.createdAt).toLocaleTimeString()}</div>`;
    blockEl.appendChild(head);

    const list = document.createElement("div");
    list.className = "cards-list";

    const filtered = applyAssistantFilters(block.results);
    const sorted = sortResults(filtered);

    if (!sorted.length) {
      const empty = document.createElement("div");
      empty.className = "muted";
      empty.textContent = "Нет карточек по текущим фильтрам";
      list.appendChild(empty);
    } else {
      sorted.forEach((item) => list.appendChild(renderAssistantItem(item)));
    }

    blockEl.appendChild(list);
    el.assistantResults.appendChild(blockEl);
  });

  updateSelectionSummary();
  syncChatAvailability();
}

function renderAssistantItem(item) {
  const cardEl = document.createElement("div");
  cardEl.className = "card-item selectable";
  cardEl.dataset.id = item.id;
  const selected = state.assistant.selections.has(item.id);
  if (selected) cardEl.classList.add("active");

  const domain = state.domains.find((d) => d.id === item.domain_id);
  const domainLabel = domain ? `${domain.code || ""}` : "—";
  const ownerLabel = item.owner_name || "—";
  const tags = item.tags ? item.tags.split(",").filter(Boolean) : [];

  cardEl.innerHTML = `
    <div class="card-row">
      <label class="checkbox-row">
        <input type="checkbox" ${selected ? "checked" : ""} data-select-card="${item.id}" />
        ${colorDot(item.status)}
        <div class="card-title-area">
          <div class="card-title-line">
            <span class="card-title">${item.title || "Без названия"}</span>
            <span class="badge">${domainLabel}</span>
            <span class="badge status-pill status-${STATUS_COLORS[item.status] || "grey"}">${statusLabel(item.status)}</span>
          </div>
          <div class="card-summary">${item.description || item.summary || "—"}</div>
        </div>
      </label>
    </div>
    <div class="card-row meta-row">
      <div class="meta">Источник: ${item.source || "—"} (${statusLabel(item.source_status || item.status)})</div>
      <div class="meta">Владелец: ${ownerLabel}</div>
      <div class="meta">Актуализация: ${item.updated_at ? new Date(item.updated_at).toLocaleDateString() : "—"}</div>
      <div class="meta">Домен: ${domainLabel}</div>
    </div>
    <div class="card-row tags-row">
      <div class="tags">
        ${tags.map((t) => `<span class="tag">${t}</span>`).join("")}
      </div>
      <div class="status-text">${statusLabel(item.status)}</div>
    </div>
  `;

  cardEl.querySelector("input[type='checkbox']").addEventListener("change", (e) => {
    toggleSelection(item.id, e.target.checked);
  });

  cardEl.addEventListener("click", (e) => {
    if (e.target.tagName.toLowerCase() === "input") return;
    toggleSelection(item.id, !selected);
  });

  return cardEl;
}

function toggleSelection(id, checked) {
  if (checked) {
    state.assistant.selections.add(id);
  } else {
    state.assistant.selections.delete(id);
  }
  updateSelectionSummary();
  renderAssistantList();
  renderSelectedChips();
}

function updateSelectionSummary() {
  el.selectionSummary.textContent = `Выбрано источников: ${state.assistant.selections.size}`;
}

function renderSelectedChips() {
  el.selectedChips.innerHTML = "";
  const ids = Array.from(state.assistant.selections);
  if (!ids.length) {
    el.selectedChips.innerHTML = '<div class="muted">Нет выбранных источников</div>';
  }

  ids.forEach((id) => {
    const card = state.cardsCache.find((c) => c.id === id);
    const title = card?.title || `Карточка ${id}`;
    const status = card?.status;
    const chip = document.createElement("div");
    chip.className = "chip";
    chip.innerHTML = `${colorDot(status)} <span class="chip-title">${title.slice(0, 32)}${title.length > 32 ? "…" : ""}</span> <button class="chip-remove" data-remove="${id}">✕</button>`;
    chip.querySelector("button").addEventListener("click", () => {
      toggleSelection(id, false);
    });
    el.selectedChips.appendChild(chip);
  });

  el.chatSetInfo.textContent = `Текущий набор источников: ${ids.length}`;
}

function clearSelection() {
  state.assistant.selections.clear();
  renderAssistantList();
  renderSelectedChips();
}

function handleVisibility(mode) {
  state.assistant.filters.visibility = mode;
  renderAssistantList();
}

function chooseRecommended() {
  const lastBlock = state.assistant.searchBlocks[state.assistant.searchBlocks.length - 1];
  if (!lastBlock) return;
  const sorted = sortResults(lastBlock.results).filter((item) => {
    const color = STATUS_COLORS[item.status] || "";
    return color === "green" || color === "active";
  });
  clearSelection();
  sorted.slice(0, 3).forEach((item) => state.assistant.selections.add(item.id));
  renderAssistantList();
  renderSelectedChips();
}

function addSearchBlock(query, results) {
  state.assistant.searchBlocks.unshift({
    query,
    results,
    createdAt: Date.now(),
  });
  if (!state.assistant.hasChatStarted) {
    results.slice(0, 2).forEach((item) => state.assistant.selections.add(item.id));
  }
  renderAssistantList();
  renderSelectedChips();
  syncPrechatPrompt();
}

function syncPrechatPrompt() {
  const last = state.assistant.searchBlocks[0];
  if (last) {
    el.prechatInput.value = last.query;
  }
}

async function handleAssistantSearch() {
  const text = el.assistantQuery.value.trim();
  state.assistant.query = text;
  if (!text) {
    showNotification("Введите текст запроса для подбора карточек");
    return;
  }
  try {
    el.assistantSearch.disabled = true;
    const queryTerms = text.toLowerCase().split(/\s+/).filter((t) => t.length > 2);
    const domainFilter = state.assistant.filters.domain;
    const raw = state.cardsCache.filter((card) => (domainFilter ? String(card.domain_id || "") === domainFilter : true));

    const scored = raw
      .map((card) => ({
        ...card,
        score: computeScore(card, queryTerms),
      }))
      .filter((card) => card.score > 0 || queryTerms.length === 0);

    addSearchBlock(text, scored);
  } catch (err) {
    showNotification(err.message || "Ошибка подбора карточек");
  } finally {
    el.assistantSearch.disabled = false;
  }
}

function syncChatAvailability() {
  const hasSelection = state.assistant.selections.size > 0;
  el.chatBlocker.classList.toggle("hidden", hasSelection);
  el.prechatComposer.classList.toggle("hidden", !hasSelection || state.chat.messages.length > 0);
  el.chatComposer.classList.toggle("hidden", !hasSelection || state.chat.messages.length === 0);
  el.prechatInput.disabled = !hasSelection;
  el.prechatSend.disabled = !hasSelection;
  el.chatInput.disabled = !hasSelection;
  el.chatSend.disabled = !hasSelection;
}

function addChatMessage(text, from = "system", meta = {}) {
  const msg = document.createElement("div");
  msg.className = `message ${from}`;
  const textEl = document.createElement("div");
  textEl.className = "message-text";
  textEl.textContent = text;
  msg.appendChild(textEl);

  if (from === "bot" && meta.usedCards && meta.usedCards.length && !state.chat.hideSources) {
    const cite = document.createElement("div");
    cite.className = "used-cards";
    cite.innerHTML = `<strong>Источники:</strong> ${meta.usedCards
      .map((c) => `${c.title} (${statusLabel(c.status)})`)
      .join(", ")}`;
    msg.appendChild(cite);
  }

  if (from === "bot") {
    const copyBtn = document.createElement("button");
    copyBtn.className = "link-button";
    copyBtn.textContent = "Скопировать ответ";
    copyBtn.addEventListener("click", async () => {
      const textToCopy = state.chat.hideSources ? text : `${text}\n\nИсточники: ${meta.usedCards
        .map((c) => `${c.title} (${statusLabel(c.status)})`)
        .join(", ")}`;
      try {
        await navigator.clipboard.writeText(textToCopy);
        showNotification("Ответ скопирован", "success", 1500);
      } catch (err) {
        console.error(err);
      }
    });
    msg.appendChild(copyBtn);
  }

  if (from === "system" && meta.badge) {
    const badge = document.createElement("button");
    badge.className = "link-button";
    badge.textContent = meta.badge;
    badge.addEventListener("click", () => restoreSelection(meta.setId));
    msg.appendChild(badge);
  }

  el.chatHistory.appendChild(msg);
  el.chatHistory.scrollTop = el.chatHistory.scrollHeight;
  state.chat.messages.push({ from, text, meta });
}

function snapshotSelection() {
  const id = `set-${Date.now()}`;
  const ids = Array.from(state.assistant.selections);
  state.chat.setHistory.push({ id, ids, createdAt: Date.now() });
  state.chat.activeSetId = id;
  return id;
}

async function sendChat(message) {
  const selectedIds = Array.from(state.assistant.selections);
  if (!selectedIds.length) {
    showNotification("Нужно выбрать хотя бы одну карточку");
    return;
  }

  addChatMessage(message, "user");
  const payload = { message, selected_card_ids: selectedIds };
  try {
    el.chatSend.disabled = true;
    el.prechatSend.disabled = true;
    const res = await fetch(`${API_BASE}/chat/mock`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Ошибка обращения к модели");
    const data = await res.json();
    addChatMessage(data.answer, "bot", { usedCards: data.used_cards });
  } catch (err) {
    showNotification(err.message || "Не удалось получить ответ");
  } finally {
    el.chatSend.disabled = false;
    el.prechatSend.disabled = false;
  }
}

function handlePrechatStart() {
  const text = el.prechatInput.value.trim();
  if (!text) return;
  const setId = snapshotSelection();
  addChatMessage(
    `Создан временный эксперт на основе ${state.assistant.selections.size} источников`,
    "system",
    { badge: `Сделано на основе подборки ${setId}`, setId }
  );
  state.assistant.hasChatStarted = true;
  syncChatAvailability();
  sendChat(text);
}

function handleChatSend() {
  const text = el.chatInput.value.trim();
  if (!text) return;
  sendChat(text);
  el.chatInput.value = "";
}

function clearChatMessages() {
  state.chat.previousChat = [...state.chat.messages];
  state.chat.messages = [];
  el.chatHistory.innerHTML = "";
  syncChatAvailability();
}

function restorePreviousChat() {
  if (!state.chat.previousChat.length) return;
  el.chatHistory.innerHTML = "";
  state.chat.messages = [];
  state.chat.previousChat.forEach((msg) => addChatMessage(msg.text, msg.from, msg.meta));
}

async function exportChat() {
  if (!state.chat.messages.length) return;
  const text = state.chat.messages
    .map((m) => `${m.from === "user" ? "Пользователь" : m.from === "bot" ? "Эксперт" : "Система"}: ${m.text}`)
    .join("\n");
  await navigator.clipboard.writeText(text);
  showNotification("История скопирована", "success", 1500);
}

function restoreSelection(setId) {
  const snapshot = state.chat.setHistory.find((s) => s.id === setId);
  if (!snapshot) return;
  state.assistant.selections = new Set(snapshot.ids);
  renderAssistantList();
  renderSelectedChips();
  syncChatAvailability();
}

function buildRegistryQuery() {
  const params = new URLSearchParams();
  params.set("page", state.registry.page);
  params.set("page_size", state.registry.pageSize);
  if (state.registry.filters.domain) params.set("domain_id", state.registry.filters.domain);
  if (state.registry.filters.status) params.set("status", state.registry.filters.status);
  if (state.registry.filters.search) params.set("search", state.registry.filters.search);
  return params.toString();
}

async function loadRegistry() {
  try {
    if (!state.cardsCache.length) {
      state.cardsCache = await fetchCards();
    }

    const filtered = applyRegistryFilters(state.cardsCache);
    const sorted = sortRegistry(filtered);
    state.registry.total = sorted.length;
    const paginated = paginateRegistry(sorted);
    renderRegistry(paginated);
    updateRegistryPagination();
  } catch (err) {
    showNotification(err.message || "Ошибка реестра");
  }
}

function getCurrentUserId() {
  return state.users?.[0]?.id || null;
}

function matchesSearch(item, text) {
  if (!text) return true;
  const haystack = [item.title, item.description, item.tags, item.domain?.code, item.owner?.name, item.owner_name]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(text.toLowerCase());
}

function applyRegistryFilters(items) {
  const { domain, status, search, owner, reviewer, onlyMine, verifiedFrom } = state.registry.filters;
  const fromDate = verifiedFrom ? new Date(verifiedFrom) : null;
  const currentUserId = getCurrentUserId();

  return items.filter((item) => {
    if (domain && String(item.domain_id || item.domain?.id || "") !== domain) return false;
    if (status && item.status !== status) return false;
    if (search && !matchesSearch(item, search)) return false;
    if (owner && !(item.owner?.name || item.owner_name || "").toLowerCase().includes(owner.toLowerCase())) return false;
    if (reviewer && !(item.reviewer?.name || item.reviewer_name || "").toLowerCase().includes(reviewer.toLowerCase()))
      return false;
    if (onlyMine && currentUserId && item.owner_id !== currentUserId) return false;
    if (fromDate) {
      const updatedAt = item.updated_at || item.last_event_at;
      if (!updatedAt || new Date(updatedAt) < fromDate) return false;
    }
    return true;
  });
}

function sortRegistry(items) {
  const sorted = [...items];
  if (state.registry.filters.sort === "title") {
    sorted.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
  } else {
    sorted.sort((a, b) => new Date(b.updated_at || b.last_event_at || 0) - new Date(a.updated_at || a.last_event_at || 0));
  }
  return sorted;
}

function paginateRegistry(items) {
  const start = (state.registry.page - 1) * state.registry.pageSize;
  return items.slice(start, start + state.registry.pageSize);
}

function handleRegistrySelect(id, checked) {
  if (checked) {
    state.registry.selected.add(id);
  } else {
    state.registry.selected.delete(id);
  }
}

function renderRegistry(items) {
  const isTable = state.registry.view === "table";
  el.registryTableBody.parentElement.classList.toggle("hidden", !isTable);
  el.registryTableBody.innerHTML = "";

  const compactHostId = "registry-compact";
  let compactHost = document.getElementById(compactHostId);
  if (!compactHost) {
    compactHost = document.createElement("div");
    compactHost.id = compactHostId;
    el.registryTableBody.parentElement.parentElement.appendChild(compactHost);
  }
  compactHost.className = isTable ? "hidden" : "compact-list";
  compactHost.innerHTML = "";

  if (!items.length) {
    if (isTable) {
      const row = document.createElement("tr");
      const cell = document.createElement("td");
      cell.colSpan = 16;
      cell.textContent = "Нет данных";
      row.appendChild(cell);
      el.registryTableBody.appendChild(row);
    } else {
      const empty = document.createElement("div");
      empty.className = "muted";
      empty.textContent = "Нет карточек по текущим фильтрам";
      compactHost.appendChild(empty);
    }
    return;
  }

  items.forEach((item) => {
    const ownerName = item.owner?.name || item.owner_name || "—";
    const reviewerName = item.reviewer?.name || item.reviewer_name || "—";
    const domainCode = item.domain?.code || item.domain_code || "—";
    const updated = item.updated_at || item.last_event_at;
    const updatedLabel = updated ? new Date(updated).toLocaleDateString() : "—";
    const statusColor = STATUS_COLORS[item.status] || "grey";
    const progressWidth = Math.min(100, (item.title?.length || 0) / 2);

    if (isTable) {
      const row = document.createElement("tr");
      row.dataset.id = item.id;
      row.innerHTML = `
        <td><input type="checkbox" data-registry-select="${item.id}" ${
          state.registry.selected.has(item.id) ? "checked" : ""
        } /></td>
        <td>${item.id}<div class="muted">uid-${item.id}</div></td>
        <td>
          <div class="title-cell">${item.title || "Без названия"}</div>
          <div class="progress"><div class="progress-bar" style="width: ${progressWidth}%"></div></div>
        </td>
        <td>Документ</td>
        <td>${item.version || "v1"}</td>
        <td><span class="badge status-pill status-${statusColor}">${statusLabel(item.status)}</span></td>
        <td>${domainCode}</td>
        <td>${ownerName}<br /><span class="muted">Ревьюер: ${reviewerName}</span></td>
        <td>${updatedLabel}</td>
        <td>—</td>
        <td>${item.source_count ?? "—"}</td>
        <td>${item.likes ?? 0}</td>
        <td>${item.bookmarks ?? 0}</td>
        <td>${item.confidentiality || "—"}</td>
        <td>${item.links_count ?? 0}</td>
        <td>${item.in_expert ?? "—"}</td>
        <td>⋮</td>
      `;
      row.addEventListener("click", (e) => {
        if (e.target.tagName.toLowerCase() === "input") return;
        addSearchBlock(item.title, [
          {
            id: item.id,
            title: item.title,
            status: item.status,
            domain_id: item.domain_id || item.domain?.id,
            description: item.description,
            updated_at: item.updated_at,
          },
        ]);
        toggleSelection(item.id, true);
        switchTab("chat-view");
      });
      row.querySelector("input[type='checkbox']")?.addEventListener("change", (e) => {
        handleRegistrySelect(item.id, e.target.checked);
        e.stopPropagation();
      });
      el.registryTableBody.appendChild(row);
    } else {
      const card = document.createElement("div");
      card.className = "compact-card";
      card.innerHTML = `
        <div class="title-line">
          <h4>${item.title || "Без названия"}</h4>
          <span class="badge status-pill status-${statusColor}">${statusLabel(item.status)}</span>
        </div>
        <div class="compact-meta">
          <span>${domainCode}</span>
          <span>Обновлено: ${updatedLabel}</span>
          <span>Владелец: ${ownerName}</span>
          <span>Ревьюер: ${reviewerName}</span>
        </div>
        <div class="muted">${item.description || item.summary || "—"}</div>
        <div class="compact-actions">
          <label class="filter-chip"><input type="checkbox" data-registry-select="${item.id}" ${
            state.registry.selected.has(item.id) ? "checked" : ""
          } /> В подборку</label>
          <button class="link-button" data-open="${item.id}">Открыть в чате</button>
        </div>
      `;
      card.querySelector("[data-open]")?.addEventListener("click", () => {
        addSearchBlock(item.title, [
          {
            id: item.id,
            title: item.title,
            status: item.status,
            domain_id: item.domain_id || item.domain?.id,
            description: item.description,
            updated_at: item.updated_at,
          },
        ]);
        toggleSelection(item.id, true);
        switchTab("chat-view");
      });
      card.querySelector("input[type='checkbox']")?.addEventListener("change", (e) => {
        handleRegistrySelect(item.id, e.target.checked);
        e.stopPropagation();
      });
      compactHost.appendChild(card);
    }
  });
}

function updateRegistryPagination() {
  el.registryPage.textContent = state.registry.page;
  const maxPage = Math.max(1, Math.ceil(state.registry.total / state.registry.pageSize));
  el.registryPrev.disabled = state.registry.page <= 1;
  el.registryNext.disabled = state.registry.page >= maxPage;
}

function resetModalState() {
  [
    el.cardTitleInput,
    el.cardDescriptionInput,
    el.cardTagsInput,
    el.cardContentInput,
  ].forEach((inp) => inp && (inp.value = ""));
  if (el.cardDomainInput) el.cardDomainInput.value = "";
  if (el.cardOwnerInput) el.cardOwnerInput.value = "";
  if (el.cardStatusInput) el.cardStatusInput.value = "draft";
}

function openCreateModal() {
  resetModalState();
  el.modalOverlay.classList.remove("hidden");
}

function closeCreateModal() {
  el.modalOverlay.classList.add("hidden");
}

function validateModalForm() {
  let valid = true;
  const required = [el.cardTitleInput, el.cardContentInput || el.cardDescriptionInput];
  required.forEach((el) => {
    if (!el) return;
    const empty = !el.value.trim();
    el.classList.toggle("invalid", empty);
    if (empty) valid = false;
  });
  return valid;
}

async function saveCardFromModal() {
  if (!validateModalForm()) {
    showNotification("Заполните обязательные поля: заголовок и основной текст");
    return;
  }

  const payload = {
    title: el.cardTitleInput.value.trim(),
    description: (el.cardDescriptionInput.value || "").trim(),
    content: (el.cardContentInput?.value || el.cardDescriptionInput.value || "").trim(),
    domain_id: el.cardDomainInput.value ? Number(el.cardDomainInput.value) : null,
    owner_id: el.cardOwnerInput.value ? Number(el.cardOwnerInput.value) : null,
    status: el.cardStatusInput.value || "draft",
  };

  try {
    el.modalSave.disabled = true;
    const res = await fetch(`${API_BASE}/cards/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Не удалось создать карточку");
    await res.json();
    closeCreateModal();
    await loadRegistry();
    state.cardsCache = await fetchCards();
    showNotification("Карточка создана", "success", 2000);
  } catch (err) {
    showNotification(err.message || "Ошибка создания карточки");
  } finally {
    el.modalSave.disabled = false;
  }
}

function attachModalExtras() {
  el.modalBody = document.querySelector(".modal-body .form-grid");
  if (!el.modalBody) return;
  const contentField = document.createElement("label");
  contentField.className = "full-width";
  contentField.innerHTML = `Основной текст карточки<textarea id="card-content-input" rows="5"></textarea>`;
  el.modalBody.appendChild(contentField);
  el.cardContentInput = contentField.querySelector("textarea");

  const questionsField = document.createElement("label");
  questionsField.className = "full-width";
  questionsField.innerHTML = `Краткие вопросы (по строкам)<textarea id="card-questions-input" rows="3"></textarea>`;
  el.modalBody.appendChild(questionsField);
  el.cardQuestionsInput = questionsField.querySelector("textarea");
}

function initEventHandlers() {
  el.assistantSearch.addEventListener("click", handleAssistantSearch);
  el.assistantQuery.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && e.ctrlKey) {
      e.preventDefault();
      handleAssistantSearch();
    }
  });
  el.assistantDomain.addEventListener("change", (e) => {
    state.assistant.filters.domain = e.target.value;
    renderAssistantList();
  });
  el.assistantSort.addEventListener("change", (e) => {
    state.assistant.filters.sort = e.target.value;
    renderAssistantList();
  });
  el.statusFilters.forEach((chk) =>
    chk.addEventListener("change", () => {
      state.assistant.filters.statuses = new Set(
        el.statusFilters.filter((c) => c.checked).map((c) => c.value)
      );
      renderAssistantList();
    })
  );
  el.assistantClear.addEventListener("click", () => {
    state.assistant.searchBlocks = [];
    clearSelection();
    renderAssistantList();
    syncPrechatPrompt();
  });
  el.markAll.addEventListener("click", () => {
    state.assistant.searchBlocks.forEach((block) => block.results.forEach((r) => state.assistant.selections.add(r.id)));
    renderAssistantList();
    renderSelectedChips();
  });
  el.unmarkAll.addEventListener("click", () => {
    clearSelection();
  });
  el.onlySelected.addEventListener("click", () => handleVisibility("selected"));
  el.onlyUnselected.addEventListener("click", () => handleVisibility("unselected"));
  el.chooseRecommended.addEventListener("click", chooseRecommended);

  el.prechatSend.addEventListener("click", handlePrechatStart);
  el.prechatInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handlePrechatStart();
    }
  });
  el.chatSend.addEventListener("click", handleChatSend);
  el.chatInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleChatSend();
    }
  });

  el.hideSourcesToggle.addEventListener("change", (e) => {
    state.chat.hideSources = e.target.checked;
  });
  el.clearSelected.addEventListener("click", clearSelection);
  el.clearChat.addEventListener("click", clearChatMessages);
  el.restoreChat.addEventListener("click", restorePreviousChat);
  el.exportChat.addEventListener("click", exportChat);

  el.registryApply.addEventListener("click", () => {
    state.registry.filters.domain = el.registryDomain.value;
    state.registry.filters.status = el.registryStatus.value;
    state.registry.filters.search = el.registrySearch.value.trim();
    state.registry.filters.owner = el.registryOwner.value.trim();
    state.registry.filters.reviewer = el.registryReviewer.value.trim();
    state.registry.filters.onlyMine = el.registryOnlyMine.checked;
    state.registry.filters.verifiedFrom = el.registryVerifiedFrom.value;
    state.registry.filters.sort = el.registrySort.value;
    state.registry.page = 1;
    loadRegistry();
  });
  el.registrySearch.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      el.registryApply.click();
    }
  });
  el.registryPageSize.addEventListener("change", (e) => {
    state.registry.pageSize = Number(e.target.value) || 10;
    state.registry.page = 1;
    loadRegistry();
  });
  el.registryPrev.addEventListener("click", () => {
    if (state.registry.page > 1) {
      state.registry.page -= 1;
      loadRegistry();
    }
  });
  el.registryNext.addEventListener("click", () => {
    const maxPage = Math.max(1, Math.ceil(state.registry.total / state.registry.pageSize));
    if (state.registry.page < maxPage) {
      state.registry.page += 1;
      loadRegistry();
    }
  });

  el.registryViewTable.addEventListener("click", () => {
    state.registry.view = "table";
    el.registryViewTable.classList.add("active");
    el.registryViewCompact.classList.remove("active");
    loadRegistry();
  });
  el.registryViewCompact.addEventListener("click", () => {
    state.registry.view = "compact";
    el.registryViewCompact.classList.add("active");
    el.registryViewTable.classList.remove("active");
    loadRegistry();
  });

  el.createCardBtn.addEventListener("click", openCreateModal);
  el.modalClose.addEventListener("click", closeCreateModal);
  el.modalCancel.addEventListener("click", closeCreateModal);
  el.modalOverlay.addEventListener("click", (e) => {
    if (e.target === el.modalOverlay) closeCreateModal();
  });
  el.modalSave.addEventListener("click", saveCardFromModal);
}

async function init() {
  attachModalExtras();
  try {
    state.domains = await fetchDomains();
    ensureAssistantOptions();
  } catch (err) {
    showNotification("Не удалось загрузить домены", "error", 3000);
  }

  try {
    state.users = await fetchUsers();
    ensureUserOptions();
  } catch (err) {
    showNotification("Не удалось загрузить пользователей", "error", 3000);
  }

  try {
    state.cardsCache = await fetchCards();
  } catch (err) {
    showNotification("Не удалось загрузить карточки", "error", 3000);
  }

  initEventHandlers();
  renderAssistantList();
  renderSelectedChips();
  syncChatAvailability();
}

init();
