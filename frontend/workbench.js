const API_BASE = "http://127.0.0.1:8000";

const state = {
  page: 1,
  pageSize: 10,
  total: 0,
  registryPage: 1,
  activeCardId: null,
  filters: {
    domain: "",
    status: "",
    search: "",
  },
};

const elements = {
  cardsList: document.getElementById("cards-list"),
  pageInfo: document.getElementById("page-info"),
  pagePrev: document.getElementById("page-prev"),
  pageNext: document.getElementById("page-next"),
  domainFilter: document.getElementById("domain-filter"),
  statusFilter: document.getElementById("status-filter"),
  searchFilter: document.getElementById("search-filter"),
  applyFilters: document.getElementById("apply-filters"),
  cardTitle: document.getElementById("card-title"),
  cardMeta: document.getElementById("card-meta"),
  sourcesTableBody: document.querySelector("#sources-table tbody"),
  eventsList: document.getElementById("events-list"),
  eventsBlock: document.getElementById("events-block"),
  chatHistory: document.getElementById("chat-history"),
  chatInput: document.getElementById("chat-input"),
  chatSend: document.getElementById("chat-send"),
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
  notificationContainer: document.getElementById("notification-container"),
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

async function fetchDomains() {
  try {
    const res = await fetch(`${API_BASE}/domains/`);
    if (!res.ok) throw new Error("Не удалось загрузить домены");
    return await res.json();
  } catch (err) {
    showNotification("Не удалось загрузить домены, использую заглушку (TODO)");
    return [
      { id: 1, code: "AI", name: "Artificial Intelligence" },
      { id: 2, code: "MED", name: "Medicine" },
      { id: 3, code: "FIN", name: "Finance" },
    ];
  }
}

function fillDomainSelect(select, domains) {
  domains.forEach((d) => {
    const opt = document.createElement("option");
    opt.value = d.id;
    opt.textContent = `${d.code} — ${d.name}`;
    select.appendChild(opt);
  });
}

function readFilters(fromRegistry = false) {
  if (fromRegistry) {
    state.filters.domain = elements.registryDomain.value;
    state.filters.status = elements.registryStatus.value;
    state.filters.search = elements.registrySearch.value.trim();
  } else {
    state.filters.domain = elements.domainFilter.value;
    state.filters.status = elements.statusFilter.value;
    state.filters.search = elements.searchFilter.value.trim();
  }
}

function syncFilterControls() {
  elements.domainFilter.value = state.filters.domain;
  elements.statusFilter.value = state.filters.status;
  elements.searchFilter.value = state.filters.search;

  elements.registryDomain.value = state.filters.domain;
  elements.registryStatus.value = state.filters.status;
  elements.registrySearch.value = state.filters.search;
}

function buildQuery(page) {
  const params = new URLSearchParams();
  params.set("page", page);
  params.set("page_size", state.pageSize);
  if (state.filters.domain) params.set("domain_id", state.filters.domain);
  if (state.filters.status) params.set("status", state.filters.status);
  if (state.filters.search) params.set("search", state.filters.search);
  return params.toString();
}

async function loadFeed() {
  try {
    const query = buildQuery(state.page);
    const res = await fetch(`${API_BASE}/cards/feed?${query}`);
    if (!res.ok) throw new Error("Ошибка загрузки ленты");
    const data = await res.json();
    state.total = data.total;
    renderFeed(data.items);
    updatePagination();
  } catch (err) {
    showNotification(err.message || "Ошибка ленты");
  }
}

async function loadRegistry() {
  try {
    const query = buildQuery(state.registryPage);
    const res = await fetch(`${API_BASE}/cards/feed?${query}`);
    if (!res.ok) throw new Error("Ошибка загрузки реестра");
    const data = await res.json();
    state.total = data.total;
    renderRegistry(data.items);
    updateRegistryPagination();
  } catch (err) {
    showNotification(err.message || "Ошибка реестра");
  }
}

function renderFeed(items) {
  elements.cardsList.innerHTML = "";
  if (!items.length) {
    elements.cardsList.textContent = "Нет карточек";
    return;
  }

  const activeInPage = items.some((item) => item.id === state.activeCardId);
  if (!state.activeCardId || !activeInPage) {
    state.activeCardId = items[0].id;
    selectCard(state.activeCardId);
  }

  items.forEach((item) => {
    const cardEl = document.createElement("div");
    cardEl.className = "card-item";
    cardEl.dataset.id = item.id;
    if (state.activeCardId === item.id) cardEl.classList.add("active");
    cardEl.innerHTML = `
      <h3>${item.title}</h3>
      <div class="card-meta">
        <span class="badge">${item.domain.code}</span>
        <span class="badge">${item.status}</span>
        <span>Источники: ${item.source_count}</span>
        <span>Обновлено: ${new Date(item.updated_at).toLocaleString()}</span>
      </div>
    `;
    cardEl.addEventListener("click", () => selectCard(item.id));
    elements.cardsList.appendChild(cardEl);
  });
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
    row.innerHTML = `
      <td>${item.id}</td>
      <td>${item.title}</td>
      <td>${item.domain.code}</td>
      <td>${item.status}</td>
      <td>${item.owner.name}</td>
      <td>${item.source_count}</td>
      <td>${item.last_event_at ? new Date(item.last_event_at).toLocaleDateString() : "—"}</td>
    `;
    row.addEventListener("click", () => {
      state.activeCardId = item.id;
      switchTab("chat-view");
      syncFilterControls();
      selectCard(item.id);
    });
    elements.registryTableBody.appendChild(row);
  });
}

function updatePagination() {
  elements.pageInfo.textContent = state.page;
  const maxPage = Math.max(1, Math.ceil(state.total / state.pageSize));
  elements.pagePrev.disabled = state.page <= 1;
  elements.pageNext.disabled = state.page >= maxPage;
}

function updateRegistryPagination() {
  elements.registryPage.textContent = state.registryPage;
  const maxPage = Math.max(1, Math.ceil(state.total / state.pageSize));
  elements.registryPrev.disabled = state.registryPage <= 1;
  elements.registryNext.disabled = state.registryPage >= maxPage;
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
    label.textContent = "Использованы карточки: ";
    usedWrap.appendChild(label);

    usedCards.forEach((card, idx) => {
      const link = document.createElement("button");
      link.type = "button";
      link.className = "link-button";
      link.textContent = card.title;
      link.addEventListener("click", () => selectCard(card.id));
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
  addChatMessage(text, "user");
  elements.chatInput.value = "";

  try {
    elements.chatSend.disabled = true;
    const payload = { message: text, card_id: state.activeCardId || null };
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

elements.applyFilters.addEventListener("click", () => {
  readFilters(false);
  state.page = 1;
  state.registryPage = 1;
  syncFilterControls();
  loadFeed();
});

elements.registryApply.addEventListener("click", () => {
  readFilters(true);
  state.page = 1;
  state.registryPage = 1;
  syncFilterControls();
  loadRegistry();
});

elements.pagePrev.addEventListener("click", () => {
  if (state.page > 1) {
    state.page -= 1;
    loadFeed();
  }
});

elements.pageNext.addEventListener("click", () => {
  const maxPage = Math.max(1, Math.ceil(state.total / state.pageSize));
  if (state.page < maxPage) {
    state.page += 1;
    loadFeed();
  }
});

elements.registryPrev.addEventListener("click", () => {
  if (state.registryPage > 1) {
    state.registryPage -= 1;
    loadRegistry();
  }
});

elements.registryNext.addEventListener("click", () => {
  const maxPage = Math.max(1, Math.ceil(state.total / state.pageSize));
  if (state.registryPage < maxPage) {
    state.registryPage += 1;
    loadRegistry();
  }
});

async function init() {
  const domains = await fetchDomains();
  fillDomainSelect(elements.domainFilter, domains);
  fillDomainSelect(elements.registryDomain, domains);
  await loadFeed();

  if (window.location.hash === "#registry") {
    switchTab("registry-view");
  }
}

init();
