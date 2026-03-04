
Since we are using Google Sheets for the decks and deploying as a static site, we need to carefully manage where data lives. 
*   **The Decks (Content):** Stored in Google Sheets. Everyone who visits your site sees the same library of decks.
*   **Study Progress (Spaced Repetition):** Stored in the user's browser (`localStorage`). This means your friend's study progress won't overwrite your study progress.

Here is the final, confirmed UI/UX Flow and Implementation Plan before we write our first line of code.

---

### 🎨 1. Final UI / UX Flow

**Theme:** "Cozy & Aesthetic" — Soft pastel colors, blurred frosted glass (`backdrop-blur`), subtle glowing drop shadows, and high-quality scenic backgrounds (like Studio Ghibli or Lofi landscapes).

*   **View 1: The Dashboard (Home)**
    *   **Background:** A beautiful, full-screen scenic image.
    *   **Navigation:** Clean glass header with logo, "Home", "Library".
    *   **Hero Section:** A warm greeting ("Ready for a cozy study session?").
    *   **Action Hub (Glass Panel):** 
        *   *Option A:* **Paste Quizlet Link** (Input field + "Fetch" button).
        *   *Option B:* **Upload CSV/Anki** (Drag & drop zone).
        *   *Option C:* **Create Manually** (Button routing to creator).
*   **View 2: The Library**
    *   Fetches from your Google Sheet on load.
    *   Displays a masonry grid of Glassmorphism cards.
    *   Each card shows the Deck Name, Card Count, Date Added, and a "Study Now" button.
*   **View 3: The Study Canvas (The Core Experience)**
    *   **Top:** Minimalist progress bar (cards reviewed vs. total due today) and a "Back" button.
    *   **Center:** The Flashcard.
        *   Clicking it triggers a smooth, buttery 3D flip (using `framer-motion`).
    *   **Controls (Bottom of Card):** Once flipped, 4 aesthetic Anki-style buttons appear:
        *   🟥 **Again** (Forgot it completely)
        *   🟧 **Hard** (Remembered, but took immense effort)
        *   🟩 **Good** (Remembered it)
        *   🟦 **Easy** (Too easy, push review date far out)
        *   *Note: Clicking "Good" or "Easy" triggers a small pop of confetti.*
    *   **Bottom Drawer:** A subtle "View all cards" tab at the bottom of the screen. Clicking it slides up a frosted-glass drawer displaying a grid of all cards in the deck, allowing free-browsing.
*   **View 4: Deck Creator**
    *   A clean, table-like interface. 
    *   Input for Deck Title.
    *   Dynamic rows for "Front" and "Back".
    *   A prominent "Save to Cloud" button (POSTs to your Google Sheet).

---

### 🏗️ 2. Final Implementation Plan

We will build this in 5 distinct phases to keep things manageable.

#### **Phase 1: Project Initialization & UI Skeleton**
*   Initialize **Vite + React + TailwindCSS**.
*   Install core dependencies: `react-router-dom` (for routing), `framer-motion` (for animations), `canvas-confetti`, `lucide-react` (for cute icons).
*   Set up **HashRouter** (crucial for GitHub pages so direct links don't 404).
*   Create the global Layout component (background image manager + glassmorphism containers).
*   Build out the empty routing for `/`, `/library`, `/study/:id`, and `/create`.

#### **Phase 2: The API & Library (Google Sheets Integration)**
*   Create an `api.js` service file.
*   Implement the `fetchDecks()` function (GET from your Web App URL).
*   Implement the `saveDeck()` function (POST to your Web App URL).
*   Build the **Library View** to display the fetched data, complete with a loading spinner and error handling.

#### **Phase 3: The Importers (Quizlet & CSV)**
*   **Quizlet Scraper:** Write the logic to fetch the Quizlet URL. 
    *   *Technical note:* We will route this through a free proxy like `https://corsproxy.io/?` to bypass CORS blocks.
    *   We will parse the HTML, extract the `__NEXT_DATA__` JSON string, and map over `studiableItems` to extract the `word` and `definition`.
*   **CSV/Anki Parser:** Implement `PapaParse` to convert uploaded CSV texts into our card JSON format.
*   Once a deck is imported, immediately trigger the `saveDeck()` function to push it to Google Sheets.

#### **Phase 4: The Study Engine & Spaced Repetition**
*   Create the **Flashcard Component** with `framer-motion` 3D flips.
*   Implement a simplified **SM-2 Algorithm** hook.
    *   Cards start with an interval of 0.
    *   Based on user feedback (Again, Hard, Good, Easy), calculate the `nextReviewDate`.
*   Connect to `localStorage` to save the progress of specific `deckId`s locally.
*   Build the interactive "Bottom Drawer" to view all cards at a glance.

#### **Phase 5: Polish, Confetti, & Deployment**
*   Hook up `canvas-confetti` to the "Good"/"Easy" buttons and the "Deck Finished" screen.
*   Ensure the UI looks perfect on mobile phones (studying on a phone is a must).
*   Configure the Vite build script and deploy to GitHub Pages (`npm run build` -> push `dist` folder to `gh-pages` branch).

---

### Ready to Code?
If this plan sounds perfect to you, **let's start Phase 1!** 

Just give me the word, and I will provide the terminal commands to initialize the project, along with the first batch of code for the Layout and Glassmorphism theme setup.