/**
 * ================================================
 * WEKO Service — Google Apps Script
 * ================================================
 *
 * ИНСТРУКЦИЯ по установке:
 * 1. Создать Google Таблицу с тремя листами:
 *    - "Счета"      (основной — данные счетов)
 *    - "Statistics"  (автоматическая статистика)
 *    - "Settings"    (синхронизация настроек между устройствами)
 *
 * 2. Открыть Расширения → Apps Script
 * 3. Вставить весь этот код
 * 4. Нажать "Развернуть" → "Новое развертывание"
 *    - Тип: Веб-приложение
 *    - Доступ: Все
 * 5. Скопировать URL и вставить в app.js (переменная GOOGLE_SHEET_URL)
 *
 * Поддерживаемые actions (POST):
 *   "create"       — создать новый счёт
 *   "update"       — обновить существующий счёт
 *   "saveSettings" — сохранить настройки (избранное и др.)
 *
 * Поддерживаемые actions (GET):
 *   ?action=getSettings  — получить настройки
 *   ?action=getStats     — получить сводку статистики
 */

// ============================================
// КОНФИГУРАЦИЯ
// ============================================
const SHEET_INVOICES   = "Счета";
const SHEET_STATISTICS = "statistics";
const SHEET_SETTINGS   = "settings";

// Заголовки листа Счета
const INVOICE_HEADERS = [
  "ID", "Дата", "Время", "Клиент", "Номер ренты",
  "Велосипед", "Доставка", "Ремонт", "Итого", "Детали"
];

// Заголовки листа Statistics
const STATS_HEADERS = [
  "Метрика", "Значение", "Обновлено"
];

// ============================================
// ИНИЦИАЛИЗАЦИЯ ЛИСТОВ
// ============================================

function initSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // --- Лист "Счета" ---
  let invoices = ss.getSheetByName(SHEET_INVOICES);
  if (!invoices) {
    invoices = ss.insertSheet(SHEET_INVOICES);
  }
  if (invoices.getLastRow() === 0) {
    invoices.appendRow(INVOICE_HEADERS);
    invoices.getRange(1, 1, 1, INVOICE_HEADERS.length)
      .setFontWeight("bold")
      .setBackground("#4a5568")
      .setFontColor("#ffffff")
      .setHorizontalAlignment("center");
    invoices.setFrozenRows(1);
    // Ширины колонок
    invoices.setColumnWidth(1, 100);  // ID
    invoices.setColumnWidth(2, 100);  // Дата
    invoices.setColumnWidth(3, 80);   // Время
    invoices.setColumnWidth(4, 200);  // Клиент
    invoices.setColumnWidth(5, 100);  // Ренты
    invoices.setColumnWidth(6, 100);  // Вел
    invoices.setColumnWidth(7, 100);  // Доставка
    invoices.setColumnWidth(8, 100);  // Ремонт
    invoices.setColumnWidth(9, 100);  // Итого
    invoices.setColumnWidth(10, 400); // Детали
  }

  // --- Лист "Statistics" ---
  let stats = ss.getSheetByName(SHEET_STATISTICS);
  if (!stats) {
    stats = ss.insertSheet(SHEET_STATISTICS);
  }
  if (stats.getLastRow() === 0) {
    stats.appendRow(STATS_HEADERS);
    stats.getRange(1, 1, 1, STATS_HEADERS.length)
      .setFontWeight("bold")
      .setBackground("#5b21b6")
      .setFontColor("#ffffff")
      .setHorizontalAlignment("center");
    stats.setFrozenRows(1);
    stats.setColumnWidth(1, 250);
    stats.setColumnWidth(2, 200);
    stats.setColumnWidth(3, 180);
  }

  // --- Лист "Settings" ---
  let settings = ss.getSheetByName(SHEET_SETTINGS);
  if (!settings) {
    settings = ss.insertSheet(SHEET_SETTINGS);
  }
  if (settings.getLastRow() === 0) {
    settings.appendRow(["Ключ", "Значение", "Обновлено"]);
    settings.getRange(1, 1, 1, 3)
      .setFontWeight("bold")
      .setBackground("#0369a1")
      .setFontColor("#ffffff")
      .setHorizontalAlignment("center");
    settings.setFrozenRows(1);
    settings.setColumnWidth(1, 200);
    settings.setColumnWidth(2, 500);
    settings.setColumnWidth(3, 180);
  }
}

// ============================================
// POST — Обработчик входящих запросов
// ============================================

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;

    if (action === "create") {
      return handleCreate(data);
    } else if (action === "update") {
      return handleUpdate(data);
    } else if (action === "saveSettings") {
      return handleSaveSettings(data);
    }

    return jsonResponse({ success: false, error: "Unknown action" });
  } catch (err) {
    return jsonResponse({ success: false, error: err.toString() });
  }
}

// ============================================
// GET — Получение данных
// ============================================

function doGet(e) {
  try {
    const action = e.parameter.action;

    if (action === "getSettings") {
      return handleGetSettings();
    } else if (action === "getStats") {
      return handleGetStats();
    }

    return jsonResponse({ success: false, error: "Unknown action" });
  } catch (err) {
    return jsonResponse({ success: false, error: err.toString() });
  }
}

// ============================================
// СОЗДАНИЕ СЧЁТА
// ============================================

function handleCreate(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_INVOICES);

  if (!sheet) {
    initSheets();
    return handleCreate(data);
  }

  const now = new Date();
  const dateStr = Utilities.formatDate(now, "Europe/Moscow", "dd.MM.yyyy");
  const timeStr = Utilities.formatDate(now, "Europe/Moscow", "HH:mm");

  const row = [
    data.id || "",
    dateStr,
    timeStr,
    data.client || "",
    data.rentNumber || "",
    data.bikeNumber || "",
    data.delivery || 0,
    data.repairTotal || 0,
    data.total || 0,
    data.partsList || ""
  ];

  sheet.appendRow(row);

  // Форматировать числовые ячейки
  const lastRow = sheet.getLastRow();
  sheet.getRange(lastRow, 7, 1, 3).setNumberFormat("#,##0");

  // Обновить статистику
  updateStatistics();

  return jsonResponse({ success: true, id: data.id });
}

// ============================================
// ОБНОВЛЕНИЕ СЧЁТА
// ============================================

function handleUpdate(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_INVOICES);
  if (!sheet) return jsonResponse({ success: false, error: "Sheet not found" });

  const idCol = 1; // Колонка A = ID
  const lastRow = sheet.getLastRow();

  for (let i = 2; i <= lastRow; i++) {
    if (sheet.getRange(i, idCol).getValue() === data.id) {
      // Обновляем клиента, доставку, ремонт, итого, детали
      if (data.client !== undefined)      sheet.getRange(i, 4).setValue(data.client);
      if (data.delivery !== undefined)    sheet.getRange(i, 7).setValue(data.delivery);
      if (data.repairTotal !== undefined) sheet.getRange(i, 8).setValue(data.repairTotal);
      if (data.total !== undefined)       sheet.getRange(i, 9).setValue(data.total);
      if (data.partsList !== undefined)   sheet.getRange(i, 10).setValue(data.partsList);

      sheet.getRange(i, 7, 1, 3).setNumberFormat("#,##0");

      updateStatistics();
      return jsonResponse({ success: true });
    }
  }

  return jsonResponse({ success: false, error: "ID not found" });
}

// ============================================
// СТАТИСТИКА — Обновление листа Statistics
// ============================================

function updateStatistics() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const invoices = ss.getSheetByName(SHEET_INVOICES);
  let stats = ss.getSheetByName(SHEET_STATISTICS);

  if (!invoices) return;
  if (!stats) {
    initSheets();
    stats = ss.getSheetByName(SHEET_STATISTICS);
  }

  const lastRow = invoices.getLastRow();
  if (lastRow < 2) return; // Нет данных

  const data = invoices.getRange(2, 1, lastRow - 1, 10).getValues();
  const now = new Date();
  const today = Utilities.formatDate(now, "Europe/Moscow", "dd.MM.yyyy");

  // --- Считаем метрики ---
  let totalCount = data.length;
  let todayCount = 0;
  let weekCount = 0;
  let monthCount = 0;
  let totalSum = 0;
  let monthSum = 0;
  let todaySum = 0;
  let totalDelivery = 0;
  let totalDeliveryCount = 0;
  let totalRepair = 0;
  const partsCount = {};

  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  data.forEach(function(row) {
    const dateStr = row[1]; // dd.MM.yyyy
    const delivery = Number(row[6]) || 0;
    const repair = Number(row[7]) || 0;
    const total = Number(row[8]) || 0;
    const parts = String(row[9]);

    totalSum += total;
    totalDelivery += delivery;
    if (delivery > 0) totalDeliveryCount++;
    totalRepair += repair;

    // Парсим дату
    if (dateStr) {
      const parts2 = String(dateStr).split(".");
      if (parts2.length === 3) {
        const d = new Date(
          parseInt(parts2[2]),
          parseInt(parts2[1]) - 1,
          parseInt(parts2[0])
        );

        if (String(dateStr) === today) {
          todayCount++;
          todaySum += total;
        }
        if (d >= weekAgo) weekCount++;
        if (d >= monthStart) {
          monthCount++;
          monthSum += total;
        }
      }
    }

    // Считаем детали
    if (parts && parts !== "Ремонт не требуется") {
      parts.split(",").forEach(function(p) {
        const name = p.trim();
        if (name) {
          partsCount[name] = (partsCount[name] || 0) + 1;
        }
      });
    }
  });

  // ТОП-10 деталей
  const topParts = Object.keys(partsCount)
    .sort(function(a, b) { return partsCount[b] - partsCount[a]; })
    .slice(0, 10)
    .map(function(name) { return name + " (" + partsCount[name] + ")"; })
    .join("\n");

  const avgCheck = totalCount > 0 ? Math.round(totalSum / totalCount) : 0;
  const avgMonthCheck = monthCount > 0 ? Math.round(monthSum / monthCount) : 0;

  const updated = Utilities.formatDate(now, "Europe/Moscow", "dd.MM.yyyy HH:mm");

  // --- Записываем в лист ---
  const metrics = [
    ["Всего ремонтов", totalCount, updated],
    ["Ремонтов сегодня", todayCount, updated],
    ["Ремонтов за неделю", weekCount, updated],
    ["Ремонтов за месяц", monthCount, updated],
    ["", "", ""],
    ["Общая сумма", formatNum(totalSum) + " ₽", updated],
    ["Сумма за сегодня", formatNum(todaySum) + " ₽", updated],
    ["Сумма за месяц", formatNum(monthSum) + " ₽", updated],
    ["Средний чек (всего)", formatNum(avgCheck) + " ₽", updated],
    ["Средний чек (месяц)", formatNum(avgMonthCheck) + " ₽", updated],
    ["", "", ""],
    ["Доставок (штук)", formatNum(totalDeliveryCount) + " шт.", updated],
    ["Доставок всего", formatNum(totalDelivery) + " ₽", updated],
    ["Ремонтов всего", formatNum(totalRepair) + " ₽", updated],
    ["", "", ""],
    ["ТОП-10 деталей", topParts, updated]
  ];

  // Очищаем данные (но не заголовок)
  if (stats.getLastRow() > 1) {
    stats.getRange(2, 1, stats.getLastRow() - 1, 3).clear();
  }

  // Записываем метрики
  stats.getRange(2, 1, metrics.length, 3).setValues(metrics);

  // Форматирование
  stats.getRange(2, 1, metrics.length, 1).setFontWeight("bold");
}

function formatNum(n) {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

// ============================================
// НАСТРОЙКИ — Сохранение
// ============================================

function handleSaveSettings(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_SETTINGS);
  if (!sheet) {
    initSheets();
    sheet = ss.getSheetByName(SHEET_SETTINGS);
  }

  const key = data.key; // например "favorites"
  const value = data.value; // JSON строка
  const now = Utilities.formatDate(new Date(), "Europe/Moscow", "dd.MM.yyyy HH:mm");

  // Ищем существующий ключ
  const lastRow = sheet.getLastRow();
  for (let i = 2; i <= lastRow; i++) {
    if (sheet.getRange(i, 1).getValue() === key) {
      sheet.getRange(i, 2).setValue(value);
      sheet.getRange(i, 3).setValue(now);
      return jsonResponse({ success: true });
    }
  }

  // Если не найден — добавляем
  sheet.appendRow([key, value, now]);
  return jsonResponse({ success: true });
}

// ============================================
// НАСТРОЙКИ — Получение
// ============================================

function handleGetSettings() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_SETTINGS);
  if (!sheet) return jsonResponse({ success: true, settings: {} });

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return jsonResponse({ success: true, settings: {} });

  const result = {};
  const data = sheet.getRange(2, 1, lastRow - 1, 2).getValues();
  data.forEach(function(row) {
    if (row[0]) result[row[0]] = row[1];
  });

  return jsonResponse({ success: true, settings: result });
}

// ============================================
// СТАТИСТИКА — Получение (GET)
// ============================================

function handleGetStats() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_STATISTICS);
  if (!sheet) return jsonResponse({ success: true, stats: [] });

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return jsonResponse({ success: true, stats: [] });

  const data = sheet.getRange(2, 1, lastRow - 1, 3).getValues();
  const stats = data
    .filter(function(row) { return row[0] !== ""; })
    .map(function(row) {
      return { metric: row[0], value: row[1], updated: row[2] };
    });

  return jsonResponse({ success: true, stats: stats });
}

// ============================================
// УТИЛИТЫ
// ============================================

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Вручную запустить для первоначальной настройки листов.
 * Расширения → Apps Script → Выбрать "setupSheets" → Запустить
 */
function setupSheets() {
  initSheets();
  updateStatistics();
}
