/* ================================================
   WEKO Service Portal — Application Logic
   ================================================ */

// === CONFIG ===
const GOOGLE_SHEET_URL =
  "https://script.google.com/macros/s/AKfycbwGJVbD34Rkt1uz2x5Nu4riKDNmHTlAGmhbJle0DmGbqwuEsL3S9Ra6qGo23Hi1pBXMyw/exec";
const HISTORY_KEY = "weko_history";
const MAX_HISTORY = 200;

// === PARTS DATABASE ===
const partsDB = [
  { name: "АКБ 60V 22AH", price: 24466 },
  { name: "Зарядное устройство 5A 60V", price: 1282 },
  { name: "Штырь 27,2 30см", price: 423 },
  { name: "Держатель телефона без USB", price: 403 },
  { name: "Кресло Jetson усиленное", price: 1719 },
  { name: "Провод аккумулятора", price: 265 },
  { name: "Крыло переднее", price: 423 },
  { name: "Коннектор АКБ", price: 200 },
  { name: "Корпус АКБ 21AH", price: 1700 },
  { name: "Крышка АКБ нижняя", price: 253 },
  { name: "Провод мотор-колеса R16", price: 636 },
  { name: "Плата датчика холла", price: 235 },
  { name: "Варежки", price: 800 },
  { name: "Задняя подвеска с маятником", price: 1725 },
  { name: "Рама велосипеда", price: 12829 },
  { name: "Держатель телефона с USB", price: 805 },
  { name: "Зарядное устройство 3A 60V", price: 2070 },
  { name: "Внешний корпус АКБ", price: 575 },
  { name: "Бортовой комьютер (Дисплей)", price: 1178 },
  { name: "Поворотники передние", price: 575 },
  { name: "Крышка металлическая под ноги", price: 426 },
  { name: "Педаль металлические", price: 368 },
  { name: "Цепь", price: 157 },
  { name: "Накладка на цепь (Защита)", price: 397 },
  { name: "Ротор", price: 5171 },
  { name: "Диск с магнитами (Статер)", price: 4025 },
  { name: "Гидравлические тормоза", price: 2530 },
  { name: "Крепления гидравлики", price: 252 },
  { name: "Фиксатор шланга гидравлики", price: 133 },
  { name: "Ось переднего колеса", price: 207 },
  { name: "Амортизатор задний (609)", price: 609 },
  { name: "Амортизатор задний (768)", price: 768 },
  { name: "Передняя фара", price: 1587 },
  { name: "Подшипник руля", price: 34 },
  { name: "Руль в сборе", price: 1058 },
  { name: "Вынос руля", price: 529 },
  { name: "Руль", price: 725 },
  { name: "Ручка газа 60V Monster", price: 1125 },
  { name: "Концевик Jetson", price: 199 },
  { name: "Ручка тормоза правая", price: 133 },
  { name: "Ручка тормоза левая", price: 133 },
  { name: "Клемнный зажим", price: 49 },
  { name: "Контроллер 2G", price: 4025 },
  { name: "Трекер 2G", price: 5750 },
  { name: "АКБ 3,7V", price: 365 },
  { name: "Зеркала (комплект)", price: 990 },
  { name: "Подножка", price: 1500 },
  { name: "Крыло заднее", price: 800 },
  { name: "Планка АКБ", price: 800 },
];

// === STATE ===
let currentDetailId = null;
let currentEditId = null;
let historyDateFilter = "all"; // 'today' | 'week' | 'month' | 'exact' | 'all'
let historyExactDate = ''; // YYYY-MM-DD for exact filter
let historySearchQuery = "";
let calViewYear = new Date().getFullYear();
let calViewMonth = new Date().getMonth(); // 0-indexed
let partsFilter = "all"; // 'all' | 'fav'

// === DOM REFS (cached for performance) ===
const $ = (id) => document.getElementById(id);
let _refs = {};
function initRefs() {
  _refs = {
    partsContainer: $("partsContainer"),
    searchInput: $("searchInput"),
    searchClearBtn: $("searchClearBtn"),
    noResults: $("noResults"),
    needDelivery: $("needDelivery"),
    clientName: $("clientName"),
    rentNumber: $("rentNumber"),
    bikeNumber: $("bikeNumber"),
    displayDelivery: $("displayDelivery"),
    displayRepair: $("displayRepair"),
    displayTotal: $("displayTotal"),
    displayTotalMobile: $("displayTotalMobile"),
    selectedCount: $("selectedCount"),
    selectedPartsList: $("selectedPartsList"),
    selectedPartsContent: $("selectedPartsContent"),
    sendBtn: $("sendBtn"),
    copyBtn: $("copyBtn"),
    summaryPanel: $("summaryPanel"),
    summaryBackdrop: $("summaryBackdrop"),
    historyList: $("historyList"),
    historyEmpty: $("historyEmpty"),
    historyCount: $("historyCount"),
    clearHistoryBtn: $("clearHistoryBtn"),
    historySearch: $("historySearch"),
    hiddenClipboard: $("hiddenClipboard"),
  };
}

// ================================================
// UTILITIES
// ================================================

function formatPrice(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// Favorites localStorage
function getFavorites() {
  try { return JSON.parse(localStorage.getItem('weko_favorites') || '[]'); }
  catch { return []; }
}
function saveFavorites(favs) {
  localStorage.setItem('weko_favorites', JSON.stringify(favs));
  // Sync to Google Sheets
  syncFavoritesToSheet(favs);
}

function syncFavoritesToSheet(favs) {
  try {
    fetch(GOOGLE_SHEET_URL, {
      method: "POST",
      mode: "no-cors",
      body: JSON.stringify({ action: "saveSettings", key: "favorites", value: JSON.stringify(favs) }),
      headers: { "Content-Type": "text/plain;charset=utf-8" },
    });
  } catch {}
}

async function loadFavoritesFromSheet() {
  try {
    const res = await fetch(GOOGLE_SHEET_URL + "?action=getSettings");
    const json = await res.json();
    if (json.success && json.settings && json.settings.favorites) {
      const sheetFavs = JSON.parse(json.settings.favorites);
      const localFavs = getFavorites();
      // Merge: union of both
      const merged = [...new Set([...localFavs, ...sheetFavs])];
      localStorage.setItem('weko_favorites', JSON.stringify(merged));
      // Re-render stars
      document.querySelectorAll('.fav-star').forEach(btn => {
        const name = btn.dataset.part;
        const isFav = merged.includes(name);
        btn.classList.toggle('active', isFav);
        btn.querySelector('i').className = isFav ? 'fa-solid fa-star' : 'fa-regular fa-star';
      });
      updateFavCount();
    }
  } catch {}
}
function isFavorite(partName) {
  return getFavorites().includes(partName);
}
function toggleFavorite(partName) {
  const favs = getFavorites();
  const idx = favs.indexOf(partName);
  if (idx >= 0) favs.splice(idx, 1);
  else favs.push(partName);
  saveFavorites(favs);
  return idx < 0; // returns true if now favorited
}

// ================================================
// PARTS RENDERING
// ================================================

function renderParts() {
  const frag = document.createDocumentFragment();
  const favs = getFavorites();
  partsDB.forEach((part) => {
    const label = document.createElement("label");
    label.className =
      "part-card flex items-center p-3 sm:p-3.5 border border-slate-200/80 rounded-xl cursor-pointer bg-white/60";
    const starActive = favs.includes(part.name) ? ' active' : '';
    label.innerHTML = `
            <input type="checkbox" value="${part.price}" data-name="${part.name}" class="part-checkbox custom-check mr-3">
            <div class="flex-grow min-w-0">
                <div class="text-xs sm:text-sm font-semibold text-slate-700 part-title">${part.name}</div>
                <div class="text-xs text-slate-400 font-mono part-price mt-0.5">${formatPrice(part.price)} ₽</div>
            </div>
            <button type="button" class="fav-star${starActive}" data-part="${part.name}" title="В избранное" onclick="event.preventDefault(); event.stopPropagation(); onStarClick(this)">
                <i class="fa-${starActive ? 'solid' : 'regular'} fa-star"></i>
            </button>
        `;
    label.querySelector("input").addEventListener("change", updateTotals);
    frag.appendChild(label);
  });
  _refs.partsContainer.appendChild(frag);
}

function onStarClick(btn) {
  const partName = btn.dataset.part;
  const nowFav = toggleFavorite(partName);
  btn.classList.toggle('active', nowFav);
  btn.querySelector('i').className = nowFav ? 'fa-solid fa-star' : 'fa-regular fa-star';
  // If in favorites view, re-filter to hide unfavorited
  if (partsFilter === 'fav') filterParts();
  // Update favorites count badge
  updateFavCount();
}

function updateFavCount() {
  const badge = $('favCount');
  if (!badge) return;
  const count = getFavorites().length;
  badge.textContent = count;
  badge.style.opacity = count > 0 ? '1' : '0';
}

function setPartsFilter(filter) {
  partsFilter = filter;
  document.querySelectorAll('.parts-filter-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.partsFilter === filter);
  });
  filterParts();
}

function filterParts() {
  const input = _refs.searchInput.value.toLowerCase();
  const cards = _refs.partsContainer.querySelectorAll(".part-card");
  let visibleCount = 0;
  const favs = partsFilter === 'fav' ? getFavorites() : null;

  _refs.searchClearBtn.classList.toggle("visible", input.length > 0);

  cards.forEach((card) => {
    const title = card.querySelector(".part-title").textContent;
    const matchSearch = title.toLowerCase().includes(input);
    const matchFav = favs ? favs.includes(title) : true;
    const show = matchSearch && matchFav;
    card.style.display = show ? "flex" : "none";
    if (show) visibleCount++;
  });

  _refs.noResults.classList.toggle("hidden", visibleCount > 0);
}

function clearSearch() {
  _refs.searchInput.value = "";
  filterParts();
  _refs.searchInput.focus();
}

// ================================================
// CLIENT AUTOCOMPLETE
// ================================================

let acFocusIdx = -1; // focused item index

function getClientSuggestions(query) {
  const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
  const seen = new Map(); // name → { bikeNumber, date }
  history.forEach(h => {
    // Extract clean name (before parentheses)
    const raw = h.client || "";
    const name = raw.replace(/\s*\(.*$/, "").trim();
    if (name && name !== "Имя не указано" && !seen.has(name)) {
      seen.set(name, {
        bike: h.bikeNumber || "",
        date: h.timestamp ? new Date(h.timestamp).toLocaleDateString("ru-RU") : ""
      });
    }
  });

  if (!query) return [...seen.entries()].slice(0, 8).map(([name, meta]) => ({ name, ...meta }));

  const q = query.toLowerCase();
  return [...seen.entries()]
    .filter(([name]) => name.toLowerCase().includes(q))
    .slice(0, 8)
    .map(([name, meta]) => ({ name, ...meta }));
}

function showSuggestions() {
  const input = _refs.clientName;
  const dropdown = $("clientSuggestions");
  const suggestions = getClientSuggestions(input.value.trim());

  if (suggestions.length === 0) {
    dropdown.classList.add("hidden");
    return;
  }

  acFocusIdx = -1;
  dropdown.innerHTML = suggestions.map((s, i) =>
    `<div class="autocomplete-item" data-idx="${i}" data-name="${s.name}">
      ${s.name}${s.bike ? `<span class="ac-meta">РА${s.bike}С</span>` : ""}
    </div>`
  ).join("");
  dropdown.classList.remove("hidden");

  // Click handlers
  dropdown.querySelectorAll(".autocomplete-item").forEach(item => {
    item.addEventListener("mousedown", (e) => {
      e.preventDefault();
      selectSuggestion(item.dataset.name);
    });
  });
}

function selectSuggestion(name) {
  _refs.clientName.value = name;
  $("clientSuggestions").classList.add("hidden");
  // CONVEYOR: Move to next field
  _refs.rentNumber.focus();
}

function handleAcKeydown(e) {
  const dropdown = $("clientSuggestions");
  const hasItems = !dropdown.classList.contains("hidden") && dropdown.querySelectorAll(".autocomplete-item").length > 0;

  if (e.key === "ArrowDown" && hasItems) {
    e.preventDefault();
    const items = dropdown.querySelectorAll(".autocomplete-item");
    acFocusIdx = Math.min(acFocusIdx + 1, items.length - 1);
    items.forEach((el, i) => el.classList.toggle("focused", i === acFocusIdx));
  } else if (e.key === "ArrowUp" && hasItems) {
    e.preventDefault();
    const items = dropdown.querySelectorAll(".autocomplete-item");
    acFocusIdx = Math.max(acFocusIdx - 1, 0);
    items.forEach((el, i) => el.classList.toggle("focused", i === acFocusIdx));
  } else if (e.key === "Enter") {
    e.preventDefault();
    if (hasItems && acFocusIdx >= 0) {
      const items = dropdown.querySelectorAll(".autocomplete-item");
      selectSuggestion(items[acFocusIdx].dataset.name);
    } else {
      // CONVEYOR: Enter moves to next field if no suggestion selected
      $("clientSuggestions").classList.add("hidden");
      _refs.rentNumber.focus();
    }
  } else if (e.key === "Escape") {
    dropdown.classList.add("hidden");
  }
}

// ================================================
// TOTALS
// ================================================

function updateTotals() {
  const needDelivery = _refs.needDelivery.checked;
  const checkboxes = document.querySelectorAll(".part-checkbox:checked");

  let delivery = needDelivery ? 1800 : 0;
  let repair = 0;
  const selectedNames = [];
  checkboxes.forEach((cb) => {
    repair += parseInt(cb.value);
    selectedNames.push(cb.getAttribute("data-name"));
  });

  const total = delivery + repair;

  _refs.displayDelivery.textContent = formatPrice(delivery) + " ₽";
  _refs.displayRepair.textContent = formatPrice(repair) + " ₽";

  const totalEl = _refs.displayTotal;
  totalEl.textContent = formatPrice(total) + " ₽";
  totalEl.classList.add("total-updating");
  setTimeout(() => totalEl.classList.remove("total-updating"), 350);

  if (_refs.displayTotalMobile) {
    _refs.displayTotalMobile.textContent = formatPrice(total) + " ₽";
  }

  _refs.selectedCount.textContent = checkboxes.length;
  _refs.selectedCount.style.opacity = checkboxes.length > 0 ? "1" : "0";

  if (selectedNames.length > 0) {
    _refs.selectedPartsList.classList.remove("hidden");
    _refs.selectedPartsContent.innerHTML = selectedNames
      .map(
        (n) =>
          `<div class="flex items-center gap-1.5"><i class="fa-solid fa-circle text-[4px] text-indigo-400"></i> ${n}</div>`,
      )
      .join("");
  } else {
    _refs.selectedPartsList.classList.add("hidden");
  }
}

// ================================================
// MOBILE SUMMARY TOGGLE
// ================================================

function toggleSummary() {
  _refs.summaryPanel.classList.toggle("collapsed");
  _refs.summaryBackdrop.classList.toggle(
    "visible",
    !_refs.summaryPanel.classList.contains("collapsed"),
  );
}

// ================================================
// FORM
// ================================================

function resetForm() {
  _refs.clientName.value = "";
  _refs.rentNumber.value = "";
  _refs.bikeNumber.value = "";
  _refs.searchInput.value = "";
  _refs.needDelivery.checked = true;
  document
    .querySelectorAll(".part-checkbox")
    .forEach((cb) => (cb.checked = false));
  filterParts();
  updateTotals();
}

function getInvoiceData() {
  const nameRaw = _refs.clientName.value.trim();
  const rentRaw = _refs.rentNumber.value.trim();
  const bikeRaw = _refs.bikeNumber.value.trim();

  let headerText = nameRaw || "Имя не указано";
  const brackets = [];
  if (rentRaw) brackets.push(`рента ${rentRaw}`);
  if (bikeRaw) brackets.push(`РА${bikeRaw}С`);
  if (brackets.length > 0) headerText += ` (${brackets.join(", ")})`;

  const needDelivery = _refs.needDelivery.checked;
  const checkboxes = document.querySelectorAll(".part-checkbox:checked");

  let deliveryCost = needDelivery ? 1800 : 0;
  let repairCost = 0;
  const selectedParts = [];
  checkboxes.forEach((cb) => {
    repairCost += parseInt(cb.value);
    selectedParts.push(cb.getAttribute("data-name"));
  });

  const total = deliveryCost + repairCost;
  const partsString =
    selectedParts.length > 0 ? selectedParts.join(", ") : "Ремонт не требуется";

  let textToCopy = `${headerText}\n\n`;
  textToCopy += `Сумма доставки: ${deliveryCost}\n\n`;
  if (repairCost > 0) textToCopy += `Сумма ремонта: ${repairCost}\n\n`;
  textToCopy += `Итого: ${total}\n\n`;
  const tags = [];
  if (deliveryCost > 0) tags.push("#Доставка");
  if (repairCost > 0) tags.push("#Ремонт");
  textToCopy += tags.join(" ");

  return {
    client: headerText,
    bikeNumber: bikeRaw || "—",
    rentNumber: rentRaw || "",
    delivery: deliveryCost,
    repairTotal: repairCost,
    total,
    partsList: partsString,
    selectedParts,
    textToCopy,
  };
}

// ================================================
// GOOGLE SHEETS
// ================================================

async function sendToGoogleSheets() {
  const btn = _refs.sendBtn;
  const originalText = btn.innerHTML;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Отправляем...';
  btn.disabled = true;
  btn.style.opacity = "0.7";

  const data = getInvoiceData();
  const id = generateId();

  try {
    await fetch(GOOGLE_SHEET_URL, {
      method: "POST",
      mode: "no-cors",
      body: JSON.stringify({ action: "create", id, ...data }),
      headers: { "Content-Type": "text/plain;charset=utf-8" },
    });

    saveToHistory({ id, ...data });

    btn.innerHTML = '<i class="fa-solid fa-check"></i> Успешно!';
    btn.style.opacity = "1";
    btn.className = btn.className
      .replace(
        "from-indigo-600 to-purple-600",
        "from-emerald-500 to-emerald-600",
      )
      .replace(
        "hover:from-indigo-500 hover:to-purple-500",
        "hover:from-emerald-400 hover:to-emerald-500",
      );

    setTimeout(() => {
      btn.innerHTML = originalText;
      btn.disabled = false;
      btn.className = btn.className
        .replace(
          "from-emerald-500 to-emerald-600",
          "from-indigo-600 to-purple-600",
        )
        .replace(
          "hover:from-emerald-400 hover:to-emerald-500",
          "hover:from-indigo-500 hover:to-purple-500",
        );
    }, 2000);
  } catch (error) {
    btn.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> Ошибка!';
    btn.style.opacity = "1";
    btn.className = btn.className.replace(
      "from-indigo-600 to-purple-600",
      "from-red-500 to-red-600",
    );
    setTimeout(() => {
      btn.innerHTML = originalText;
      btn.disabled = false;
      btn.className = btn.className.replace(
        "from-red-500 to-red-600",
        "from-indigo-600 to-purple-600",
      );
    }, 3000);
  }
}

async function updateGoogleSheet(entry) {
  try {
    await fetch(GOOGLE_SHEET_URL, {
      method: "POST",
      mode: "no-cors",
      body: JSON.stringify({
        action: "update",
        id: entry.id,
        client: entry.client,
        delivery: entry.delivery,
        repairTotal: entry.repairTotal,
        total: entry.total,
        partsList: entry.selectedParts.join(", "),
      }),
      headers: { "Content-Type": "text/plain;charset=utf-8" },
    });
    return true;
  } catch {
    return false;
  }
}

// ================================================
// CLIPBOARD
// ================================================

function copyToClipboard() {
  doCopy(getInvoiceData().textToCopy, _refs.copyBtn);
}

function doCopy(text, btn) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard
      .writeText(text)
      .then(() => showCopyBtn(btn))
      .catch(() => {
        fallbackCopy(text);
        showCopyBtn(btn);
      });
  } else {
    fallbackCopy(text);
    showCopyBtn(btn);
  }
}

function fallbackCopy(text) {
  const ta = _refs.hiddenClipboard;
  ta.value = text;
  ta.select();
  document.execCommand("copy");
}

function showCopyBtn(btn) {
  const orig = btn.innerHTML;
  btn.innerHTML =
    '<i class="fa-solid fa-check text-emerald-400"></i> Скопировано!';
  setTimeout(() => {
    btn.innerHTML = orig;
  }, 1800);
}

// ================================================
// HISTORY — CRUD
// ================================================

function getHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
  } catch {
    return [];
  }
}

function setHistory(arr) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(arr));
}

function saveToHistory(data) {
  const history = getHistory();
  history.unshift({
    id: data.id || generateId(),
    timestamp: new Date().toISOString(),
    bikeNumber: data.bikeNumber,
    rentNumber: data.rentNumber,
    client: data.client,
    delivery: data.delivery,
    repairTotal: data.repairTotal,
    total: data.total,
    selectedParts: data.selectedParts || [],
    textToCopy: data.textToCopy || "",
  });
  if (history.length > MAX_HISTORY) history.pop();
  setHistory(history);
  renderHistory(true);
}

function deleteHistoryEntry(id) {
  setHistory(getHistory().filter((e) => e.id !== id));
  renderHistory(false);
}

// ================================================
// HISTORY — SEARCH & FILTER
// ================================================

function getFilteredHistory() {
  let history = getHistory();

  // Date filter
  if (historyDateFilter !== "all") {
    if (historyDateFilter === "exact" && historyExactDate) {
      // Exact date — show only records from that specific day
      const picked = new Date(historyExactDate);
      const dayStart = new Date(picked.getFullYear(), picked.getMonth(), picked.getDate());
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);
      history = history.filter((e) => {
        const t = new Date(e.timestamp);
        return t >= dayStart && t < dayEnd;
      });
    } else {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      let cutoff;
      if (historyDateFilter === "today") {
        cutoff = startOfDay;
      } else if (historyDateFilter === "week") {
        cutoff = new Date(startOfDay);
        cutoff.setDate(cutoff.getDate() - 7);
      } else if (historyDateFilter === "month") {
        cutoff = new Date(startOfDay);
        cutoff.setMonth(cutoff.getMonth() - 1);
      }
      if (cutoff) history = history.filter((e) => new Date(e.timestamp) >= cutoff);
    }
  }

  // Search query (bike number + parts)
  if (historySearchQuery) {
    const q = historySearchQuery.toLowerCase();
    history = history.filter((e) => {
      const bikeMatch = (e.bikeNumber || "").toLowerCase().includes(q);
      const clientMatch = (e.client || "").toLowerCase().includes(q);
      const partsMatch = (e.selectedParts || []).some((p) =>
        p.toLowerCase().includes(q),
      );
      return bikeMatch || clientMatch || partsMatch;
    });
  }

  return history;
}

function onHistorySearch() {
  historySearchQuery = _refs.historySearch.value.trim();
  renderHistory(false);
}

function setDateFilter(filter) {
  // Toggle: if clicking the same "exact" tab again, close it
  if (filter === "exact" && historyDateFilter === "exact") {
    filter = "all";
  }

  historyDateFilter = filter;
  document.querySelectorAll(".filter-tab").forEach((t) => {
    t.classList.toggle("active", t.dataset.filter === filter);
  });

  // Show/hide calendar
  const cal = $("calendarWidget");
  if (filter === "exact") {
    cal.classList.remove("hidden");
    if (!historyExactDate) {
      const now = new Date();
      const pad = n => n.toString().padStart(2, '0');
      historyExactDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
      calViewYear = now.getFullYear();
      calViewMonth = now.getMonth();
    }
    renderCalendar();
  } else {
    cal.classList.add("hidden");
  }

  renderHistory(false);
}

// ================================================
// CUSTOM CALENDAR
// ================================================

const CAL_MONTHS_RU = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
const CAL_DAYS_RU = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];

function renderCalendar() {
  const widget = $("calendarWidget");
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${(today.getMonth()+1).toString().padStart(2,'0')}-${today.getDate().toString().padStart(2,'0')}`;

  // First day of displayed month
  const firstDay = new Date(calViewYear, calViewMonth, 1);
  // Day-of-week for first day (Monday=0 .. Sunday=6)
  let startDow = firstDay.getDay() - 1;
  if (startDow < 0) startDow = 6;

  const daysInMonth = new Date(calViewYear, calViewMonth + 1, 0).getDate();
  const daysInPrev = new Date(calViewYear, calViewMonth, 0).getDate();

  // Build header
  let html = `<div class="cal-header">`;
  html += `<button onclick="calPrevMonth()" aria-label="Предыдущий месяц"><i class="fa-solid fa-chevron-left"></i></button>`;
  html += `<span class="cal-title">${CAL_MONTHS_RU[calViewMonth]} ${calViewYear}</span>`;
  html += `<button onclick="calNextMonth()" aria-label="Следующий месяц"><i class="fa-solid fa-chevron-right"></i></button>`;
  html += `</div>`;

  // Day-of-week labels
  html += `<div class="cal-dow">`;
  CAL_DAYS_RU.forEach(d => html += `<span>${d}</span>`);
  html += `</div>`;

  // Day cells
  html += `<div class="cal-days">`;

  // Previous month trailing days
  for (let i = startDow - 1; i >= 0; i--) {
    const day = daysInPrev - i;
    const m = calViewMonth === 0 ? 12 : calViewMonth;
    const y = calViewMonth === 0 ? calViewYear - 1 : calViewYear;
    const dateStr = `${y}-${m.toString().padStart(2,'0')}-${day.toString().padStart(2,'0')}`;
    html += `<button class="cal-day other-month" onclick="calSelectDay('${dateStr}')">${day}</button>`;
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${calViewYear}-${(calViewMonth+1).toString().padStart(2,'0')}-${d.toString().padStart(2,'0')}`;
    let cls = 'cal-day';
    if (dateStr === todayStr) cls += ' today';
    if (dateStr === historyExactDate) cls += ' selected';
    html += `<button class="${cls}" onclick="calSelectDay('${dateStr}')">${d}</button>`;
  }

  // Next month leading days (fill to complete last row)
  const totalCells = startDow + daysInMonth;
  const remainder = totalCells % 7;
  if (remainder > 0) {
    for (let d = 1; d <= 7 - remainder; d++) {
      const m = calViewMonth === 11 ? 1 : calViewMonth + 2;
      const y = calViewMonth === 11 ? calViewYear + 1 : calViewYear;
      const dateStr = `${y}-${m.toString().padStart(2,'0')}-${d.toString().padStart(2,'0')}`;
      html += `<button class="cal-day other-month" onclick="calSelectDay('${dateStr}')">${d}</button>`;
    }
  }

  html += `</div>`;
  widget.innerHTML = html;
}

function calPrevMonth() {
  calViewMonth--;
  if (calViewMonth < 0) { calViewMonth = 11; calViewYear--; }
  renderCalendar();
}

function calNextMonth() {
  calViewMonth++;
  if (calViewMonth > 11) { calViewMonth = 0; calViewYear++; }
  renderCalendar();
}

function calSelectDay(dateStr) {
  historyExactDate = dateStr;
  renderCalendar();
  renderHistory(false);
}

// ================================================
// HISTORY — RENDERING
// ================================================

function renderHistory(isNew) {
  const list = _refs.historyList;
  const empty = _refs.historyEmpty;
  const allHistory = getHistory();
  const filtered = getFilteredHistory();
  const countBadge = _refs.historyCount;
  const clearBtn = _refs.clearHistoryBtn;

  countBadge.textContent = allHistory.length;
  countBadge.style.opacity = allHistory.length > 0 ? "1" : "0";
  clearBtn.classList.toggle("hidden", allHistory.length === 0);

  // Clear existing items (preserve non-history nodes)
  list.querySelectorAll(".history-item").forEach((el) => el.remove());

  if (filtered.length === 0) {
    empty.classList.remove("hidden");
    if (
      allHistory.length > 0 &&
      (historySearchQuery || historyDateFilter !== "all")
    ) {
      empty.innerHTML = `
                <i class="fa-solid fa-filter-circle-xmark text-xl text-slate-600 mb-2"></i>
                <p class="text-xs text-slate-500">Ничего не найдено</p>
            `;
    } else {
      empty.innerHTML = `
                <i class="fa-solid fa-inbox text-xl text-slate-600 mb-2"></i>
                <p class="text-xs text-slate-500">Генерации появятся здесь</p>
            `;
    }
    return;
  }

  empty.classList.add("hidden");

  const frag = document.createDocumentFragment();
  filtered.forEach((entry, idx) => {
    const div = document.createElement("div");
    div.className = `history-item flex items-center gap-2.5 ${isNew && idx === 0 ? "history-item-new" : ""}`;
    div.setAttribute("data-id", entry.id);
    div.onclick = () => openDetail(entry.id);

    const bikeLabel =
      entry.bikeNumber && entry.bikeNumber !== "—"
        ? `РА${entry.bikeNumber}С`
        : "—";
    const timeStr = formatHistoryTime(entry.timestamp);
    const partsCount = (entry.selectedParts || []).length;

    div.innerHTML = `
            <div class="w-8 h-8 rounded-lg bg-indigo-500/15 flex items-center justify-center flex-shrink-0">
                <i class="fa-solid fa-bicycle text-indigo-400 text-[11px]"></i>
            </div>
            <div class="flex-grow min-w-0">
                <div class="text-xs font-bold text-slate-200 truncate">${bikeLabel}</div>
                <div class="text-[10px] text-slate-500 truncate">${partsCount > 0 ? partsCount + " дет." : "без ремонта"}</div>
            </div>
            <div class="text-right flex-shrink-0">
                <div class="text-xs font-bold text-indigo-400 font-mono">${formatPrice(entry.total)}₽</div>
                <div class="text-[9px] text-slate-500">${timeStr}</div>
            </div>
        `;
    frag.appendChild(div);
  });
  list.appendChild(frag);
}

function formatHistoryTime(iso) {
  const d = new Date(iso);
  const now = new Date();
  const pad = (n) => n.toString().padStart(2, "0");
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;

  if (d.toDateString() === now.toDateString()) return time;
  const y = new Date(now);
  y.setDate(y.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return `вчера ${time}`;
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)} ${time}`;
}

function clearHistory() {
  if (confirm("Удалить всю историю?")) {
    setHistory([]);
    renderHistory(false);
  }
}

// ================================================
// DETAIL MODAL
// ================================================

function openDetail(id) {
  const entry = getHistory().find((e) => e.id === id);
  if (!entry) return;
  currentDetailId = id;

  const bikeLabel =
    entry.bikeNumber && entry.bikeNumber !== "—"
      ? `РА${entry.bikeNumber}С`
      : "Без номера";
  const d = new Date(entry.timestamp);
  const pad = (n) => n.toString().padStart(2, "0");
  const dateStr = `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} в ${pad(d.getHours())}:${pad(d.getMinutes())}`;

  $("detailBikeTitle").textContent = bikeLabel;
  $("detailDate").textContent = dateStr;
  $("detailClient").textContent = entry.client;
  $("detailDelivery").textContent = formatPrice(entry.delivery) + " ₽";
  $("detailRepair").textContent = formatPrice(entry.repairTotal) + " ₽";
  $("detailTotal").textContent = formatPrice(entry.total) + " ₽";

  const partsBlock = $("detailPartsBlock");
  const partsEl = $("detailParts");
  if (entry.selectedParts && entry.selectedParts.length > 0) {
    partsBlock.classList.remove("hidden");
    partsEl.innerHTML = entry.selectedParts
      .map(
        (p) =>
          `<div class="flex items-center gap-2"><i class="fa-solid fa-circle text-[4px] text-indigo-400"></i> ${p}</div>`,
      )
      .join("");
  } else {
    partsBlock.classList.add("hidden");
  }

  $("detailBackdrop").classList.add("active");
  $("detailModal").classList.add("active");
  document.body.style.overflow = "hidden";
}

function closeDetail() {
  $("detailBackdrop").classList.remove("active");
  $("detailModal").classList.remove("active");
  document.body.style.overflow = "";
  currentDetailId = null;
}

function copyHistoryItem() {
  const entry = getHistory().find((e) => e.id === currentDetailId);
  if (entry) doCopy(entry.textToCopy, $("detailCopyBtn"));
}

function deleteHistoryItem() {
  if (!currentDetailId) return;
  deleteHistoryEntry(currentDetailId);
  closeDetail();
}

// ================================================
// EDIT MODAL
// ================================================

function openEditModal() {
  const entry = getHistory().find((e) => e.id === currentDetailId);
  if (!entry) return;
  currentEditId = entry.id;

  // Close detail modal
  closeDetail();

  // Render edit parts list
  const editParts = $("editPartsList");
  editParts.innerHTML = "";

  const frag = document.createDocumentFragment();
  partsDB.forEach((part) => {
    const isChecked = (entry.selectedParts || []).includes(part.name);
    const label = document.createElement("label");
    label.className =
      "edit-part-card flex items-center p-2.5 border border-slate-200/80 rounded-xl cursor-pointer bg-white/60";
    label.innerHTML = `
            <input type="checkbox" value="${part.price}" data-name="${part.name}"
                   class="edit-part-checkbox custom-check mr-2.5" ${isChecked ? "checked" : ""}>
            <div class="flex-grow min-w-0">
                <div class="text-xs font-semibold text-slate-700 truncate">${part.name}</div>
                <div class="text-[10px] text-slate-400 font-mono">${formatPrice(part.price)} ₽</div>
            </div>
        `;
    frag.appendChild(label);
  });
  editParts.appendChild(frag);

  // Update totals display
  updateEditTotals();

  // Show edit modal
  $("editBackdrop").classList.add("active");
  $("editModal").classList.add("active");
  document.body.style.overflow = "hidden";
}

function closeEditModal() {
  $("editBackdrop").classList.remove("active");
  $("editModal").classList.remove("active");
  document.body.style.overflow = "";
  currentEditId = null;
}

function updateEditTotals() {
  const checks = document.querySelectorAll(".edit-part-checkbox:checked");
  let repair = 0;
  checks.forEach((cb) => (repair += parseInt(cb.value)));

  const entry = getHistory().find((e) => e.id === currentEditId);
  const delivery = entry ? entry.delivery : 0;
  const total = delivery + repair;

  $("editRepairTotal").textContent = formatPrice(repair) + " ₽";
  $("editTotal").textContent = formatPrice(total) + " ₽";
  $("editPartsCount").textContent = checks.length + " дет.";
}

async function saveEdit() {
  const entry = getHistory().find((e) => e.id === currentEditId);
  if (!entry) return;

  const saveBtn = $("editSaveBtn");
  const origText = saveBtn.innerHTML;
  saveBtn.innerHTML =
    '<i class="fa-solid fa-spinner fa-spin"></i> Сохраняем...';
  saveBtn.disabled = true;

  // Collect new parts
  const checks = document.querySelectorAll(".edit-part-checkbox:checked");
  const newParts = [];
  let newRepair = 0;
  checks.forEach((cb) => {
    newParts.push(cb.getAttribute("data-name"));
    newRepair += parseInt(cb.value);
  });

  // Update entry
  entry.selectedParts = newParts;
  entry.repairTotal = newRepair;
  entry.total = entry.delivery + newRepair;
  entry.partsList =
    newParts.length > 0 ? newParts.join(", ") : "Ремонт не требуется";

  // Rebuild textToCopy
  let textToCopy = `${entry.client}\n\n`;
  textToCopy += `Сумма доставки: ${entry.delivery}\n\n`;
  if (newRepair > 0) textToCopy += `Сумма ремонта: ${newRepair}\n\n`;
  textToCopy += `Итого: ${entry.total}\n\n`;
  const tags = [];
  if (entry.delivery > 0) tags.push("#Доставка");
  if (newRepair > 0) tags.push("#Ремонт");
  textToCopy += tags.join(" ");
  entry.textToCopy = textToCopy;

  // Save locally
  const history = getHistory();
  const idx = history.findIndex((e) => e.id === entry.id);
  if (idx !== -1) history[idx] = entry;
  setHistory(history);

  // Send update to Google Sheets
  await updateGoogleSheet(entry);

  // Update UI
  renderHistory(false);

  saveBtn.innerHTML = '<i class="fa-solid fa-check"></i> Сохранено!';
  setTimeout(() => {
    saveBtn.innerHTML = origText;
    saveBtn.disabled = false;
    closeEditModal();
  }, 1200);
}

// ================================================
// KEYBOARD & GLOBAL EVENTS
// ================================================

function initEvents() {
  // ESC key
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      // Close calendar first if open
      if (historyDateFilter === "exact") {
        setDateFilter("all");
        return;
      }
      if ($("editModal").classList.contains("active")) {
        closeEditModal();
        return;
      }
      if ($("detailModal").classList.contains("active")) {
        closeDetail();
        return;
      }
      if (
        !_refs.summaryPanel.classList.contains("collapsed") &&
        window.innerWidth < 1024
      ) {
        toggleSummary();
      }
    }
  });

  // Click outside calendar → close it
  document.addEventListener("click", (e) => {
    if (historyDateFilter !== "exact") return;
    const cal = $("calendarWidget");
    const exactTab = document.querySelector('.filter-tab[data-filter="exact"]');
    if (!cal.contains(e.target) && !exactTab.contains(e.target)) {
      setDateFilter("all");
    }
  });

  // Delegated event for edit parts checkboxes
  document.addEventListener("change", (e) => {
    if (e.target.classList.contains("edit-part-checkbox")) {
      updateEditTotals();
    }
  });

  // Delivery checkbox
  _refs.needDelivery.addEventListener("change", updateTotals);

  // Filter tabs (history)
  document.querySelectorAll(".filter-tab").forEach((tab) => {
    tab.addEventListener("click", () => setDateFilter(tab.dataset.filter));
  });

  // Parts filter tabs (all / favorites)
  document.querySelectorAll(".parts-filter-tab").forEach((tab) => {
    tab.addEventListener("click", () => setPartsFilter(tab.dataset.partsFilter));
  });

  // Client autocomplete
  _refs.clientName.addEventListener("input", showSuggestions);
  _refs.clientName.addEventListener("focus", showSuggestions);
  _refs.clientName.addEventListener("keydown", handleAcKeydown);
  _refs.clientName.addEventListener("blur", () => {
    setTimeout(() => $("clientSuggestions").classList.add("hidden"), 150);
  });

  // CONVEYOR: Rent Number -> Bike Number
  _refs.rentNumber.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      _refs.bikeNumber.focus();
    }
  });

  // CONVEYOR: Bike Number -> Done (Blur)
  _refs.bikeNumber.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      _refs.bikeNumber.blur();
    }
  });
}

// ================================================
// PWA — SERVICE WORKER
// ================================================

function initServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
}

// ================================================
// INIT
// ================================================

document.addEventListener("DOMContentLoaded", () => {
  initRefs();
  renderParts();
  renderHistory(false);
  initEvents();
  initServiceWorker();
  updateFavCount();
  loadFavoritesFromSheet(); // Sync favorites from Google Sheets
});
