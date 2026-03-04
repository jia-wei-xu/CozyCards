
I'm planning on making a small aesthetic flashcard practicing website. It'll be similar to Quizlet and Anki, but focus more on making it cheerful (like scenic wallpaper, confetti on answering questions).

My idea is that on the home screen, you can upload a Quizlet link or upload your own Anki file. There should be another button to see your library, and to make flash cards, and other essential buttons.

Once you get to a deck, you should be able to see a card, and the bottom shows the list of all the cards. Then, you can flip through and go through the cards, with a style similar to Anki's. But everything should look extremely nice with wallpapers, confetti, etc.

I'm making this primarily as a demo for a friend, so it's just going to be deployed on Github pages without a backend. All the flashcards will not be stored in a database, but instead encoded in a Google sheets (yes, that technially means it'll be public, but this is just a demo).

The entire implementation is listed in #file:README.md .

The Google sheets is also working. I have an app script:
```
// ==========================================================================
// CozyCards — Google Apps Script (Full CRUD + Settings + SRS Progress)
// ==========================================================================
// Sheets used:
//   "Flashcards Database" — DeckID | DeckName | CreatedAt | CardsJSON | Folder
//   "UserSettings"        — Key | Value   (stores JSON blobs)
//   "Progress"            — DeckID | ProgressJSON | LastUpdated
//
// doGet actions (via ?action= query param):
//   (none / get_all_decks) — return every deck
//   get_deck               — ?deckId=…  return one deck
//   get_user_settings      — return all user settings
//   get_progress           — ?deckId=… (optional) return SRS progress
//
// doPost actions (via payload.action):
//   create_deck, update_deck, delete_deck,
//   save_user_settings, save_progress
// ==========================================================================

var SHEET_NAME     = "Flashcards Database";
var SETTINGS_SHEET = "UserSettings";
var PROGRESS_SHEET = "Progress";

// ---------------------------------------------------------------------------
// Sheet setup helpers (auto-create + auto-migrate)
// ---------------------------------------------------------------------------

function setupSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(["DeckID", "DeckName", "CreatedAt", "CardsJSON", "Folder"]);
  } else {
    // Migration: add Folder column if the sheet was created before folders existed
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    if (headers.indexOf("Folder") === -1) {
      sheet.getRange(1, sheet.getLastColumn() + 1).setValue("Folder");
    }
  }
  return sheet;
}

function setupSettingsSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SETTINGS_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(SETTINGS_SHEET);
    sheet.appendRow(["Key", "Value"]);
  }
  return sheet;
}

function setupProgressSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(PROGRESS_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(PROGRESS_SHEET);
    sheet.appendRow(["DeckID", "ProgressJSON", "LastUpdated"]);
  }
  return sheet;
}

// ---------------------------------------------------------------------------
// Utility: JSON response builder
// ---------------------------------------------------------------------------

function jsonOk(data)  { return ContentService.createTextOutput(JSON.stringify({ status: "success", data: data })).setMimeType(ContentService.MimeType.JSON); }
function jsonRes(obj)  { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }
function jsonErr(msg)  { return ContentService.createTextOutput(JSON.stringify({ status: "error", message: msg })).setMimeType(ContentService.MimeType.JSON); }

// ---------------------------------------------------------------------------
// GET handler — read-only actions
// ---------------------------------------------------------------------------

function doGet(e) {
  try {
    var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : "get_all_decks";

    switch (action) {
      case "get_deck":
        return getDeck(e.parameter.deckId);
      case "get_user_settings":
        return getUserSettings();
      case "get_progress":
        return getProgress(e.parameter.deckId);  // deckId is optional
      default:
        return getAllDecks();
    }
  } catch (error) {
    return jsonErr(error.toString());
  }
}

// --- Deck reads ---------------------------------------------------------

function getAllDecks() {
  var sheet = setupSheet();
  var data  = sheet.getDataRange().getValues();
  var headers   = data[0];
  var folderCol = headers.indexOf("Folder");
  var decks = [];

  for (var i = 1; i < data.length; i++) {
    decks.push({
      id:        data[i][0],
      name:      data[i][1],
      createdAt: data[i][2],
      cards:     JSON.parse(data[i][3] || "[]"),
      folder:    folderCol >= 0 ? (data[i][folderCol] || "") : ""
    });
  }
  return jsonOk(decks);
}

function getDeck(deckId) {
  if (!deckId) return jsonErr("Missing deckId");

  var sheet = setupSheet();
  var data  = sheet.getDataRange().getValues();
  var headers   = data[0];
  var folderCol = headers.indexOf("Folder");

  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === deckId) {
      return jsonOk({
        id:        data[i][0],
        name:      data[i][1],
        createdAt: data[i][2],
        cards:     JSON.parse(data[i][3] || "[]"),
        folder:    folderCol >= 0 ? (data[i][folderCol] || "") : ""
      });
    }
  }
  return jsonErr("Deck not found");
}

// --- Settings reads -----------------------------------------------------

function getUserSettings() {
  var sheet = setupSettingsSheet();
  var data  = sheet.getDataRange().getValues();
  var settings = {};

  for (var i = 1; i < data.length; i++) {
    var key = data[i][0];
    var raw = data[i][1];
    try      { settings[key] = JSON.parse(raw); }
    catch(e) { settings[key] = raw; }
  }
  return jsonOk(settings);
}

// --- Progress reads -----------------------------------------------------

function getProgress(deckId) {
  var sheet = setupProgressSheet();
  var data  = sheet.getDataRange().getValues();

  if (deckId) {
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] === deckId) {
        return jsonOk({
          deckId:      data[i][0],
          progress:    JSON.parse(data[i][1] || "{}"),
          lastUpdated: data[i][2]
        });
      }
    }
    return jsonOk(null);  // no progress yet — not an error
  }

  // No deckId → return progress for every deck
  var all = [];
  for (var i = 1; i < data.length; i++) {
    all.push({
      deckId:      data[i][0],
      progress:    JSON.parse(data[i][1] || "{}"),
      lastUpdated: data[i][2]
    });
  }
  return jsonOk(all);
}

// ---------------------------------------------------------------------------
// POST handler — write actions
// ---------------------------------------------------------------------------

function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);

    switch (payload.action) {
      case "create_deck":         return createDeck(payload);
      case "update_deck":         return updateDeck(payload);
      case "delete_deck":         return deleteDeck(payload);
      case "save_user_settings":  return saveUserSettings(payload);
      case "save_progress":       return saveProgress(payload);
      default:
        return jsonErr("Unknown action: " + payload.action);
    }
  } catch (error) {
    return jsonErr(error.toString());
  }
}

// --- Deck writes --------------------------------------------------------

function createDeck(payload) {
  var sheet     = setupSheet();
  var deckId    = "deck_" + new Date().getTime();
  var timestamp = new Date().toISOString();
  var cardsJson = JSON.stringify(payload.cards || []);
  var folder    = payload.folder || "";

  sheet.appendRow([deckId, payload.deckName, timestamp, cardsJson, folder]);

  return jsonRes({ status: "success", deckId: deckId });
}

function updateDeck(payload) {
  if (!payload.deckId) return jsonErr("Missing deckId");

  var sheet   = setupSheet();
  var data    = sheet.getDataRange().getValues();
  var headers = data[0];
  var folderCol = headers.indexOf("Folder");

  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === payload.deckId) {
      var row = i + 1;  // Sheets rows are 1-indexed

      if (payload.deckName !== undefined)
        sheet.getRange(row, 2).setValue(payload.deckName);

      if (payload.cards !== undefined)
        sheet.getRange(row, 4).setValue(JSON.stringify(payload.cards));

      if (payload.folder !== undefined && folderCol >= 0)
        sheet.getRange(row, folderCol + 1).setValue(payload.folder);

      return jsonRes({ status: "success", deckId: payload.deckId });
    }
  }
  return jsonErr("Deck not found");
}

function deleteDeck(payload) {
  if (!payload.deckId) return jsonErr("Missing deckId");

  var sheet = setupSheet();
  var data  = sheet.getDataRange().getValues();

  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === payload.deckId) {
      sheet.deleteRow(i + 1);

      // Best-effort: also delete associated SRS progress
      try {
        var pSheet = setupProgressSheet();
        var pData  = pSheet.getDataRange().getValues();
        for (var j = 1; j < pData.length; j++) {
          if (pData[j][0] === payload.deckId) {
            pSheet.deleteRow(j + 1);
            break;
          }
        }
      } catch (_) { /* not critical */ }

      return jsonRes({ status: "success", deckId: payload.deckId });
    }
  }
  return jsonErr("Deck not found");
}

// --- Settings writes ----------------------------------------------------

function saveUserSettings(payload) {
  var sheet    = setupSettingsSheet();
  var data     = sheet.getDataRange().getValues();
  var settings = payload.settings || {};

  for (var key in settings) {
    var valueStr = (typeof settings[key] === "string") ? settings[key] : JSON.stringify(settings[key]);
    var found = false;

    for (var i = 1; i < data.length; i++) {
      if (data[i][0] === key) {
        sheet.getRange(i + 1, 2).setValue(valueStr);
        found = true;
        break;
      }
    }

    if (!found) {
      sheet.appendRow([key, valueStr]);
      data.push([key, valueStr]);   // keep local data in sync for subsequent keys
    }
  }
  return jsonRes({ status: "success" });
}

// --- Progress writes ----------------------------------------------------

function saveProgress(payload) {
  if (!payload.deckId) return jsonErr("Missing deckId");

  var sheet        = setupProgressSheet();
  var data         = sheet.getDataRange().getValues();
  var timestamp    = new Date().toISOString();
  var progressJson = JSON.stringify(payload.progress || {});

  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === payload.deckId) {
      sheet.getRange(i + 1, 2).setValue(progressJson);
      sheet.getRange(i + 1, 3).setValue(timestamp);
      return jsonRes({ status: "success", deckId: payload.deckId });
    }
  }

  // First time saving progress for this deck
  sheet.appendRow([payload.deckId, progressJson, timestamp]);
  return jsonRes({ status: "success", deckId: payload.deckId });
}
```

that's already functional. The full API surface is documented in the Apps Script above. Example usage:
```
const webAppUrl = "https://script.google.com/macros/s/AKfycbx1KJlD35OhrUHUIdwtrTvulqaHn74FSxX9uS__4pKSocPopzTei7PSSwgBBHiQAAT_/exec";

// --- Helper: POST (no Content-Type header to avoid CORS preflight) ---
async function post(payload) {
  const res = await fetch(webAppUrl, { method: "POST", body: JSON.stringify(payload) });
  return res.json();
}
// --- Helper: GET with query params ---
async function get(params = {}) {
  const url = new URL(webAppUrl);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url);
  return res.json();
}

// 1. Create a deck (with folder)
const created = await post({
  action: "create_deck",
  deckName: "Test Aesthetic Deck 🌸",
  cards: [
    { front: "What is the mitochondria?", back: "The powerhouse of the cell" },
    { front: "2 + 2", back: "4" }
  ],
  folder: "Biology"
});
console.log("Created:", created);  // { status: "success", deckId: "deck_17..." }

// 2. Fetch all decks
const allDecks = await get();
console.log("All decks:", allDecks);

// 3. Fetch a single deck
const one = await get({ action: "get_deck", deckId: created.deckId });
console.log("Single deck:", one);

// 4. Update a deck
const updated = await post({ action: "update_deck", deckId: created.deckId, deckName: "Renamed 🌼", folder: "Science" });
console.log("Updated:", updated);

// 5. Save user settings
await post({ action: "save_user_settings", settings: { theme: "catppuccin", daily_new_cap: 20, daily_review_cap: 200 } });
const settings = await get({ action: "get_user_settings" });
console.log("Settings:", settings);

// 6. Save & retrieve SRS progress
await post({ action: "save_progress", deckId: created.deckId, progress: { cards: {}, lastStudied: new Date().toISOString() } });
const progress = await get({ action: "get_progress", deckId: created.deckId });
console.log("Progress:", progress);

// 7. Delete a deck (also removes its progress)
const deleted = await post({ action: "delete_deck", deckId: created.deckId });
console.log("Deleted:", deleted);
```