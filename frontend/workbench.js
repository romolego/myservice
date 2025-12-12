const API_BASE = "http://127.0.0.1:8000";

const state = {
  activeCardId: null,
  domains: [],
  users: [],
  assistant: {
    query: "",
    results: [],
    filterDomain: "",
    filterStatus: "",
  },
  registry: {
    page: 1,
    pageSize: 10,
    total: 0,
    filters: {
      domain: "",
      status: "",
      search: "",
    },
    highlightId: null,
  },
};

const elements = {
  // Assistant
  assistantQuery: document.getElementById("assistant-query"),
  assistantSearch: document.getElementById("assistant-search"),
  assistantResults: document.getElementById("assistant-results"),
  assistantDomain: document.getElementById("assistant-domain-filter"),
  assistantStatus: document.getElementById("assistant-status-filter"),

  // Card details
  cardTitle: document.getElementById("card-title"),
  cardMeta: document.getElementById("card-meta"),
  sourcesTableBody: document.querySelector("#sources-table tbody"),
  eventsList: document.getElementById("events-list"),
  eventsBlock: document.getElementById("events-block"),

  // Chat
  chatHistory: document.getElementById("chat-history"),
  chatInput: document.getElementById("chat-input"),
  chatSend: document.getElementById("chat-send"),

  // Tabs
  tabChat: document.getElementById("tab-chat"),
  tabRegistry: document.getElementById("tab-registry"),
  chatView: document.getElementById("chat-view"),
  registryView: document.getElementById("registry-view"),

  // Registry
  registryTableBody: document.querySelector("#registry-table tbody"),
  registryPage: document.getElementById("registry-page"),
  registryPrev: document.getElementById("registry-prev"),
  registryNext: document.getElementById("registry-next"),
  registryDomain: document.getElementById("registry-domain"),
  registryStatus: document.getElementById("registry-status"),
  registrySearch: document.getElementById("registry-search"),
  registryApply: document.getElementById("registry-apply"),
  createCardBtn: document.getElementById("create-card"),

  // Notifications
  notificationContainer: document.getElementById("notification-container"),

  // Modal
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
};

function showNotification(message, type = "error", timeout = 4000) {
  const note = document.createElement("div");
  note.className = "notification";
  note.textContent = message;
  if (type === "success") {
    note.style.borderColor = "#2fb344";
    note.style.color = "#2fb344";
  }
  elements.notificationContainer.appendChild(note);
  setTimeout(() => note.remove(), timeout);
}

function switchTab(target) {
  const isChat = target === "chat-view";
  elements.chatView.classList.toggle("hidden", !isChat);
  elements.registryView.classList.toggle("hidden", isChat);
  elements.tabChat.classList.toggle("active", isChat);
  elements.tabRegistry.classList.toggle("active", !isChat);
  if (!isChat) {
    loadRegistry();
  }
}

elements.tabChat.addEventListener("click", () => switchTab("chat-view"));
elements.tabRegistry.addEventListener("click", () => switchTab("registry-view"));

aSyncInit();

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

function fillSelect(select, items, formatLabel, formatValue = (item) => item.id) {
  const firstOption = select.querySelector("option")?.outerHTML || "";
  select.innerHTML = firstOption;
  items.forEach((item) => {
    const opt = document.createElement("option");
    opt.value = formatValue(item);
    opt.textContent = formatLabel(item);
    select.appendChild(opt);
  });
}

function filterAssistantCards(cards) {
  return cards.filter((card) => {
    const matchDomain =
      !state.assistant.filterDomain || String(card.domain_id || card.domain?.id || "") === state.assistant.filterDomain || card.domain_name === state.assistant.filterDomain;
    const matchStatus = !state.assistant.filterStatus || card.status === state.assistant.filterStatus;
    return matchDomain && matchStatus;
  });
}

function renderAssistantList() {
  elements.assistantResults.innerHTML = "";
  const filtered = filterAssistantCards(state.assistant.results);

  if (!filtered.length) {
    const empty = document.createElement("div");
    empty.textContent = "Нет подобранных карточек";
    elements.assistantResults.appendChild(empty);
    return;
  }

  filtered.forEach((item) => {
    const cardEl = document.createElement("div");
    cardEl.className = "card-item";
    cardEl.dataset.id = item.id;
    if (state.activeCardId === item.id) cardEl.classList.add("active");
    const domainLabel = item.domain_name || item.domain?.name || "";
    const domainCode = item.domain_code || item.domain?.code || "";
    cardEl.innerHTML = `
      <h3>${item.title}</h3>
      <div class="card-meta">
        <span class="badge">${domainCode ? domainCode : domainLabel}</span>
        <span class="badge">${item.status || ""}</span>
        ${item.updated_at ? `<span>Обновлено: ${new Date(item.updated_at).toLocaleString()}</span>` : ""}
      </div>
    `;
    cardEl.addEventListener("click", () => selectCard(item.id));
    elements.assistantResults.appendChild(cardEl);
  });
}

async function handleAssistantSearch() {
  const text = elements.assistantQuery.value.trim();
  state.assistant.query = text;
  if (!text) {
    showNotification("Введите текст запроса для подбора карточек", "error", 2500);
    return;
  }

  try {
    elements.assistantSearch.disabled = true;
    const res = await fetch(`${API_BASE}/chat/mock`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text, card_id: null }),
    });
    if (!res.ok) throw new Error("Не удалось подобрать карточки");
    const data = await res.json();
    state.assistant.results = (data.used_cards || []).map((c) => ({
      ...c,
      domain_name: c.domain_name,
    }));
    renderAssistantList();
  } catch (err) {
    showNotification(err.message || "Ошибка подбора карточек");
  } finally {
    elements.assistantSearch.disabled = false;
  }
}

function ensureAssistantOptions() {
  fillSelect(
    elements.assistantDomain,
    state.domains,
    (d) => `${d.code} — ${d.name}`,
    (d) => d.name
  );
  fillSelect(elements.registryDomain, state.domains, (d) => `${d.code} — ${d.name}`);
  fillSelect(elements.cardDomainInput, state.domains, (d) => `${d.code} — ${d.name}`);
}

function ensureUserOptions() {
  fillSelect(elements.cardOwnerInput, state.users, (u) => u.name);
}

function addChatMessage(text, from = "bot", usedCards = []) {
  const msg = document.createElement("div");
  msg.className = `message ${from}`;

  const textEl = document.createElement("div");
  textEl.className = "message-text";
  textEl.textContent = text;
  msg.appendChild(textEl);

  if (usedCards && usedCards.length) {
    const usedWrap = document.createElement("div");
    usedWrap.className = "used-cards";
    const label = document.createElement("span");
    label.textContent = "Ещё подходящие карточки: ";
    usedWrap.appendChild(label);

    usedCards.forEach((card, idx) => {
      const link = document.createElement("button");
      link.type = "button";
      link.className = "link-button";
      link.textContent = card.title;
      link.addEventListener("click", () => {
        addCardsToAssistant([card]);
        selectCard(card.id);
      });
      usedWrap.appendChild(link);
      if (idx < usedCards.length - 1) {
        const sep = document.createElement("span");
        sep.textContent = ", ";
        usedWrap.appendChild(sep);
      }
    });
    msg.appendChild(usedWrap);
  }

  elements.chatHistory.appendChild(msg);
  elements.chatHistory.scrollTop = elements.chatHistory.scrollHeight;
}

elements.chatSend.addEventListener("click", handleChatSend);
elements.chatInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    handleChatSend();
  }
});

async function handleChatSend() {
  const text = elements.chatInput.value.trim();
  if (!text) return;
  if (!state.activeCardId) {
    showNotification("Сначала выберите карточку слева");
    return;
  }

  addChatMessage(text, "user");
  elements.chatInput.value = "";

  try {
    elements.chatSend.disabled = true;
    const payload = { message: text, card_id: state.activeCardId };
    const res = await fetch(`${API_BASE}/chat/mock`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Ошибка обращения к псевдо-LLM");
    const data = await res.json();
    addChatMessage(data.answer, "bot", data.used_cards || []);
  } catch (err) {
    showNotification("Ошибка обращения к псевдо-LLM, попробуйте ещё раз");
  } finally {
    elements.chatSend.disabled = false;
    elements.chatInput.focus();
  }
}

elements.assistantSearch.addEventListener("click", handleAssistantSearch);
elements.assistantDomain.addEventListener("change", (e) => {
  state.assistant.filterDomain = e.target.value;
  renderAssistantList();
});
elements.assistantStatus.addEventListener("change", (e) => {
  state.assistant.filterStatus = e.target.value;
  renderAssistantList();
});

elements.registryApply.addEventListener("click", () => {
  state.registry.filters.domain = elements.registryDomain.value;
  state.registry.filters.status = elements.registryStatus.value;
  state.registry.filters.search = elements.registrySearch.value.trim();
  state.registry.page = 1;
  loadRegistry();
});

elements.registryPrev.addEventListener("click", () => {
  if (state.registry.page > 1) {
    state.registry.page -= 1;
    loadRegistry();
  }
});

elements.registryNext.addEventListener("click", () => {
  const maxPage = Math.max(1, Math.ceil(state.registry.total / state.registry.pageSize));
  if (state.registry.page < maxPage) {
    state.registry.page += 1;
    loadRegistry();
  }
});

elements.createCardBtn.addEventListener("click", openCreateModal);
elements.modalClose.addEventListener("click", closeCreateModal);
elements.modalCancel.addEventListener("click", closeCreateModal);
elements.modalOverlay.addEventListener("click", (e) => {
  if (e.target === elements.modalOverlay) closeCreateModal();
});
elements.modalSave.addEventListener("click", saveCardFromModal);

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
    const query = buildRegistryQuery();
    const res = await fetch(`${API_BASE}/cards/feed?${query}`);
    if (!res.ok) throw new Error("Ошибка загрузки реестра");
    const data = await res.json();
    state.registry.total = data.total;
    renderRegistry(data.items);
    updateRegistryPagination();
  } catch (err) {
    showNotification(err.message || "Ошибка реестра");
  }
}

function renderRegistry(items) {
  elements.registryTableBody.innerHTML = "";
  if (!items.length) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 7;
    cell.textContent = "Нет данных";
    row.appendChild(cell);
    elements.registryTableBody.appendChild(row);
    return;
  }

  items.forEach((item) => {
    const row = document.createElement("tr");
    row.dataset.id = item.id;
    row.innerHTML = `
      <td>${item.id}</td>
      <td>${item.title}</td>
      <td>${item.domain.code}</td>
      <td>${item.status}</td>
      <td>${item.owner.name}</td>
      <td>${item.source_count}</td>
      <td>${item.last_event_at ? new Date(item.last_event_at).toLocaleDateString() : "—"}</td>
    `;
    if (state.registry.highlightId === item.id) {
      row.classList.add("just-created");
      setTimeout(() => row.classList.remove("just-created"), 2500);
      state.registry.highlightId = null;
    }
    row.addEventListener("click", () => {
      switchTab("chat-view");
      addCardsToAssistant([
        {
          id: item.id,
          title: item.title,
          status: item.status,
          domain_name: item.domain.name,
          domain_code: item.domain.code,
          updated_at: item.updated_at,
        },
      ]);
      selectCard(item.id);
    });
    elements.registryTableBody.appendChild(row);
  });
}

function updateRegistryPagination() {
  elements.registryPage.textContent = state.registry.page;
  const maxPage = Math.max(1, Math.ceil(state.registry.total / state.registry.pageSize));
  elements.registryPrev.disabled = state.registry.page <= 1;
  elements.registryNext.disabled = state.registry.page >= maxPage;
}

async function selectCard(cardId) {
  state.activeCardId = cardId;
  Array.from(document.querySelectorAll(".card-item")).forEach((el) => {
    el.classList.toggle("active", Number(el.dataset?.id) === cardId);
  });
  await loadCardDetails(cardId);
}

async function loadCardDetails(cardId) {
  try {
    const res = await fetch(`${API_BASE}/cards/${cardId}/full`);
    if (!res.ok) throw new Error("Не удалось загрузить карточку");
    const data = await res.json();
    renderCard(data);
  } catch (err) {
    showNotification(err.message || "Ошибка карточки");
  }
}

function renderCard(data) {
  elements.cardTitle.textContent = data.card.title;
  const fields = {
    domain: `${data.domain.code} — ${data.domain.name}`,
    owner: data.owner.name,
    status: data.card.status,
    created: new Date(data.card.created_at).toLocaleString(),
    updated: new Date(data.card.updated_at).toLocaleString(),
  };
  elements.cardMeta.querySelector('[data-field="domain"]').textContent = fields.domain;
  elements.cardMeta.querySelector('[data-field="owner"]').textContent = fields.owner;
  elements.cardMeta.querySelector('[data-field="status"]').textContent = fields.status;
  elements.cardMeta.querySelector('[data-field="created"]').textContent = fields.created;
  elements.cardMeta.querySelector('[data-field="updated"]').textContent = fields.updated;

  elements.sourcesTableBody.innerHTML = "";
  data.sources.forEach((src) => {
    const row = document.createElement("tr");
    const link = src.uri
      ? `<a href="${src.uri}" target="_blank" rel="noopener noreferrer">${src.uri}</a>`
      : "";
    row.innerHTML = `
      <td>${src.title}</td>
      <td>${src.type}</td>
      <td>${link}</td>
    `;
    elements.sourcesTableBody.appendChild(row);
  });

  elements.eventsList.innerHTML = "";
  if (data.events && data.events.length) {
    data.events.forEach((ev) => {
      const item = document.createElement("div");
      item.className = "badge";
      item.textContent = `${new Date(ev.created_at).toLocaleString()} — ${ev.event_type}`;
      elements.eventsList.appendChild(item);
    });
    elements.eventsBlock.classList.remove("hidden");
  } else {
    elements.eventsBlock.classList.add("hidden");
  }
}

function addCardsToAssistant(cards) {
  const existingIds = new Set(state.assistant.results.map((c) => c.id));
  const merged = [...cards.filter((c) => !existingIds.has(c.id)), ...state.assistant.results];
  state.assistant.results = merged;
  renderAssistantList();
}

function resetModalState() {
  [
    elements.cardTitleInput,
    elements.cardDescriptionInput,
    elements.cardTagsInput,
  ].forEach((el) => {
    el.value = "";
    el.classList.remove("invalid");
  });
  elements.cardDomainInput.value = "";
  elements.cardOwnerInput.value = "";
  elements.cardStatusInput.value = "draft";
}

function openCreateModal() {
  resetModalState();
  elements.modalOverlay.classList.remove("hidden");
}

function closeCreateModal() {
  elements.modalOverlay.classList.add("hidden");
}

function validateModalForm() {
  let valid = true;
  const requiredFields = [
    elements.cardTitleInput,
    elements.cardDescriptionInput,
    elements.cardDomainInput,
    elements.cardOwnerInput,
  ];
  requiredFields.forEach((el) => {
    const isEmpty = !el.value.trim();
    el.classList.toggle("invalid", isEmpty);
    if (isEmpty) valid = false;
  });
  return valid;
}

async function saveCardFromModal() {
  if (!validateModalForm()) {
    showNotification("Заполните обязательные поля", "error", 2500);
    return;
  }

  const payload = {
    title: elements.cardTitleInput.value.trim(),
    description: elements.cardDescriptionInput.value.trim(),
    domain_id: Number(elements.cardDomainInput.value),
    owner_id: Number(elements.cardOwnerInput.value),
    status: elements.cardStatusInput.value,
  };

  try {
    elements.modalSave.disabled = true;
    const res = await fetch(`${API_BASE}/cards/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Не удалось создать карточку");
    const created = await res.json();
    closeCreateModal();
    state.registry.highlightId = created.id;
    await loadRegistry();
    showNotification("Карточка создана", "success", 2500);
  } catch (err) {
    showNotification(err.message || "Не удалось создать карточку, попробуйте ещё раз");
  } finally {
    elements.modalSave.disabled = false;
  }
}

function addDefaultAssistantFromFeed() {
  fetch(`${API_BASE}/cards/feed?page=1&page_size=10`)
    .then((res) => (res.ok ? res.json() : null))
    .then((data) => {
      if (!data || !data.items) return;
      const prepared = data.items.map((item) => ({
        id: item.id,
        title: item.title,
        status: item.status,
        domain_name: item.domain.name,
        domain_code: item.domain.code,
        updated_at: item.updated_at,
      }));
      state.assistant.results = prepared;
      renderAssistantList();
      if (prepared.length && !state.activeCardId) {
        selectCard(prepared[0].id);
      }
    })
    .catch(() => {});
}

async function aSyncInit() {
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

  addDefaultAssistantFromFeed();

  if (window.location.hash === "#registry") {
    switchTab("registry-view");
  }
}
