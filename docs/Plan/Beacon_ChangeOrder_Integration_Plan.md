# Beacon — ChangeOrder Integration Plan

**Plan version:** 1.0
**Target files:** `ChangeOrderDetails.html`, `AdvertiserChangeOrders.html`, `ChangeOrderList.html`, and all advertiser-scoped sidebar pages
**Execution tool:** VS Code Copilot Claude agent
**Execution style:** Feed phases sequentially. After each phase, Samuel performs visual verification before proceeding to the next phase.

---

## 0. Context & Objectives

Two related bodies of work:

**A. Navigation gap fix.** The existing pages `ChangeOrderList.html`, `ChangeOrderDetails.html`, and `AdvertiserChangeOrders.html` are orphaned — no advertiser-scoped page has a sidebar link pointing to them. Add a "Change Orders" item to the advertiser sidebar on all relevant pages so users can actually reach the Change Order list.

**B. ChangeOrderDetails card redesign.** Redesign the entity-card stack on `ChangeOrderDetails.html` to:
1. Reflect the new entity hierarchy (Advertiser → Campaign Group → Campaign → Ad Group) by inserting a Campaign Group card.
2. Introduce a Connections table section at the top of every card, pulling real connection data from localStorage.
3. Update each card's editable-field list to a trimmed, entity-specific set.
4. Apply a unified, professional visual language that makes the hierarchy and parent→child relationship obvious at a glance.

**Do not change** the page header, CO metadata strip, Manage Entities modal, action buttons, breadcrumbs, or any other file not explicitly listed.

---

## 1. Canonical decisions (read these first)

These are settled — do not re-debate during implementation. If the code appears to contradict any of these, the code is wrong.

| # | Decision |
|---|----------|
| 1 | **Entity order on ChangeOrderDetails:** Advertiser → Campaign Group → Campaign → Ad Group (top to bottom, vertically stacked on all screen sizes). |
| 2 | **Card headers show name + entity ID:** `[ADV] Goldmine Software Solutions (ADV-A8X2K1)`, `[CG] Q2 Retail Push (GRP-1774971542155)`, `[CAM] Tuscaloosa AL - Prog. Display (CAM-...)`, `[AG] Local Consumers_Persona (AG-1EGU6Z)`. Names are **read-only** on this page. |
| 3 | **Campaign Group ID:** use the real ID already stored in `localStorage['campaign_tree_groups']` (format `GRP-{timestamp}`). Do NOT invent a placeholder. |
| 4 | **Connections table is 3 columns:** `Connection \| Reporting ID \| Create/Edit` — single-line rows. |
| 5 | **Reporting ID column** displays the relevant external record ID for that connection. For DSP rows use `deliveryId`. For Ad Server rows use `reportingId`. Display `—` if empty. |
| 6 | **Create/Edit checkbox auto-state logic:** checkbox is **checked** when the reporting ID cell is empty (meaning: needs creation). Unchecked when a reporting ID value exists. User can toggle manually. No backend action wired — purely a visual status marker. |
| 7 | **Empty connections state:** render an empty table body (no rows). Do NOT render a "No connections configured" message. |
| 8 | **Campaign Group has no Connections page yet** — its connections table will typically render empty. That is expected and acceptable. |
| 9 | **Field lists per card** (see Phase 3 for exact implementation):<br>• **Advertiser:** Connections table, Account #<br>• **Campaign Group:** Connections table only<br>• **Campaign:** Connections table only<br>• **Ad Group:** Connections table, MV Classification, Tactic/Content Category, Geo Target, Start Date, End Date, Impressions, Landing Page, UTM Code |
| 10 | **Sidebar nav label:** "Change Orders" (plural). Route target: `./AdvertiserChangeOrders.html`. Position: **after Connections, before Ad Groups** (matches existing order on `AdvertiserChangeOrders.html` itself). |
| 11 | **Scoping of ChangeOrders list:** the existing `AdvertiserChangeOrders.html` is already advertiser-scoped. The new sidebar link points to it. Do NOT add a sidebar link pointing to `ChangeOrderList.html` (that's the global/internal view). |
| 12 | **Action buttons, CO metadata strip, Manage Entities modal:** unchanged. |

---

## 2. Discovery notes for the agent (verify before coding)

These findings were confirmed during plan drafting. If the agent finds anything different when it opens the files, it should **stop and ask** rather than proceed on stale info.

### 2.1 Connection data shape

**Advertiser connections** are derived on `WFAdvertiserConnections.html` from `advertiser.connectors` (on the `adv_selected_data` localStorage object). The rendered platform array items look like:

```js
{
  platform: 'The Trade Desk',
  platformType: 'DSP',                    // 'DSP' or 'Ad Server'
  status: 'ENABLED',
  enabled_at: '2025-10-08 14:17:55',
  disabled_at: null,
  manualRecordId: null
}
```

The actual `deliveryId` / `reportingId` values live on the **entity object itself** (e.g. `advertiser.deliveryId`, `advertiser.reportingId`), not on each platform row. Same pattern for campaigns and ad groups (`campaign.deliveryId`, `adGroup.reportingId`, etc.).

**Implication:** To build the 3-column connections table, for each entity we must: (a) read the list of connected platforms from the connectors object on that entity, and (b) pull the appropriate ID field (`deliveryId` for DSP-type platforms, `reportingId` for Ad Server-type platforms) from the entity itself.

### 2.2 localStorage keys
| Data | Key | Notes |
|------|-----|-------|
| Currently selected advertiser | `adv_selected_data` | JSON object with `connectors`, `deliveryId`, `reportingId`, `id`, `name`, `account` |
| Advertiser list | `adv_list_data` | array |
| Campaign groups (per advertiser) | `campaign_tree_groups` | array of `{id: 'GRP-<ts>', name, campaigns: [...]}` |
| Ad groups | `adgroups_data_v1` | array |
| Selected entities for CO | `co_selected_entities` | drives which entities render cards (existing) |

### 2.3 Existing sidebar pattern for Change Orders
`AdvertiserChangeOrders.html` already defines the active-state styling for this nav link. **Copy that markup exactly** when adding to other pages. Do not invent a new icon path — use the inline SVG already in `AdvertiserChangeOrders.html` line ~274.

### 2.4 Files that need the new sidebar link
Confirmed missing as of plan date:
- `WFAdvertiserDetails.html`
- `WFAdvertiserConnections.html`
- `AdvertiserCampaignGroups.html`
- `AdvertiserCampaigns.html`
- `AdvertiserAdGroup.html`

Already has it (do not modify the sidebar):
- `AdvertiserChangeOrders.html` ✓
- `ChangeOrderDetails.html` ✓

---

## 3. Phase 1 — Sidebar navigation (LOW RISK, DO THIS FIRST)

**Goal:** Add a "Change Orders" sidebar item, pointing to `./AdvertiserChangeOrders.html`, on all advertiser-scoped pages that don't already have one.

### 3.1 Files to modify
1. `WFAdvertiserDetails.html`
2. `WFAdvertiserConnections.html`
3. `AdvertiserCampaignGroups.html`
4. `AdvertiserCampaigns.html`
5. `AdvertiserAdGroup.html`

### 3.2 Exact markup to insert

Insert this `<li>` block **after the Connections `<li>` and before the Ad Groups `<li>`** in each page's `<ul>` sidebar list.

```html
<li>
  <a href="./AdvertiserChangeOrders.html" data-nav-link
     class="flex items-center px-1 py-2 text-sm text-gray-700 hover:bg-blue-50 rounded-md">
    <svg class="w-6 h-6 mr-2 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
    </svg>
    <span data-link-label>Change Orders</span>
  </a>
</li>
```

**Placement rule:** in every target file, scan for the exact string `data-nav-link` in the sidebar `<ul>` and locate the `<li>` whose anchor `href` contains `WFAdvertiserConnections.html` (the Connections item). Insert the new `<li>` block immediately after that Connections `<li>` closes (`</li>`), on a new line, preserving the file's existing indentation style.

**Active-state variant:** The snippet above is the default/inactive styling. Do NOT create an active-state version of this snippet on these pages — the user won't be on the Change Orders page when viewing any of these files.

### 3.3 DO NOT TOUCH in Phase 1
- Any other sidebar `<li>` or its classes.
- Any breadcrumb or header markup.
- Any JS, any existing event listeners, any localStorage logic.
- The `<nav>` wrapper, its ID, classes, or structure.
- `sidebar.js` (the shared script) — the link is purely HTML.
- The sidebar icon sizing/layout (`w-6 h-6 mr-2`).
- `AdvertiserChangeOrders.html` and `ChangeOrderDetails.html` (already have the link).

### 3.4 Verification checklist — Phase 1
- [ ] Open each of the 5 modified pages. Confirm the sidebar shows: Overview · Connections · Campaigns · **Change Orders** · Ad Groups.
- [ ] Click the new "Change Orders" link on each page. Confirm it navigates to `AdvertiserChangeOrders.html`.
- [ ] On `AdvertiserChangeOrders.html`, confirm the "Change Orders" item is still shown with active styling (blue bg, blue text) — unchanged from before.
- [ ] View page source on each modified page and confirm no extra whitespace, no duplicated `<li>`, no orphan closing tags.
- [ ] Confirm `ChangeOrderDetails.html` is unchanged (its sidebar already had the link; it should not be part of this phase's diff).

**🛑 STOP HERE. Samuel performs visual verification before Phase 2.**

---

## 4. Phase 2 — Add Campaign Group card & restructure card order

**Goal:** On `ChangeOrderDetails.html`, insert a Campaign Group card between the existing Advertiser card and the first Campaign card. Keep existing styling scheme (pill tag, colored background) intact for this phase — the visual redesign happens in Phase 4.

### 4.1 File to modify
`ChangeOrderDetails.html` (only)

### 4.2 Location

The entity section stack lives inside `<div class="px-6 py-5 space-y-4">` which begins around **line 263**. The existing order is:
1. Advertiser section (`<!-- Advertiser Section (Blue background) -->`, ~line 265)
2. Campaign 1 section (`<!-- Campaign 1 Section (Purple background) -->`, ~line 307)
3. Ad Group(s) nested inside Campaign 1
4. (more campaigns / ad groups as applicable)

### 4.3 Markup to insert

Insert this block **after the closing `</div>` of the Advertiser section and before the `<!-- Campaign 1 Section` comment**:

```html
<!-- Campaign Group Section (Teal background) -->
<div class="entity-section bg-teal-50 border border-teal-200">
  <div class="entity-header flex items-center justify-between px-4 py-3" onclick="toggleSection('cgSection')">
    <div class="flex items-center gap-3">
      <svg id="cgChevron" class="chevron-icon w-5 h-5 text-teal-600 rotated" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
      </svg>
      <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wide bg-teal-100 text-teal-800">CG</span>
      <h3 id="cgNameDisplay" class="text-lg font-semibold text-teal-900">Loading…</h3>
      <span id="cgIdDisplay" class="text-sm text-teal-700">(—)</span>
    </div>
    <span class="text-sm text-teal-600">Campaign Group</span>
  </div>

  <div id="cgSection" class="entity-content expanded bg-white border-t border-teal-200">
    <div class="px-6 py-4">
      <!-- Connections table will be injected by Phase 3; intentionally empty in Phase 2 -->
      <div class="text-sm text-gray-500 italic" data-cg-connections-placeholder>Connections table will render here.</div>
    </div>
  </div>
</div>
```

### 4.4 Also in Phase 2: update existing card headers to show entity ID inline

For the Advertiser, Campaign, and Ad Group cards already present, amend the `<h3>` header area so the entity ID appears alongside the name.

**Advertiser header** (currently ~line 273):
```html
<!-- BEFORE -->
<h3 class="text-lg font-semibold text-blue-900">Goldmine Software Solutions</h3>
<!-- AFTER -->
<h3 id="advNameDisplay" class="text-lg font-semibold text-blue-900">Goldmine Software Solutions</h3>
<span id="advIdDisplay" class="text-sm text-blue-700">(—)</span>
```

**Campaign 1 header** (currently ~line 315):
```html
<!-- BEFORE -->
<h3 class="text-lg font-semibold text-purple-900">Tuscaloosa AL - Prog. Display</h3>
<!-- AFTER -->
<h3 class="text-lg font-semibold text-purple-900 campaign-name-display">Tuscaloosa AL - Prog. Display</h3>
<span class="text-sm text-purple-700 campaign-id-display">(—)</span>
```

Repeat for any additional campaign headers in the file.

**Ad Group 1 header** (currently ~line 364):
```html
<!-- BEFORE -->
<span class="text-sm font-medium text-orange-900">Local Consumers_Persona</span>
<!-- AFTER -->
<span class="text-sm font-medium text-orange-900 adgroup-name-display">Local Consumers_Persona</span>
<span class="text-xs text-orange-700 adgroup-id-display">(—)</span>
```

Repeat for any additional ad group headers.

### 4.5 Populate the ID spans from localStorage

Add this block inside the existing `DOMContentLoaded` handler (currently ~line 665). Place it **after** the existing `advertiser.name` breadcrumb update, **before** the closing `});` of that handler.

```js
// Populate entity ID spans in card headers
try {
  // Advertiser ID
  const advIdSpan = document.getElementById('advIdDisplay');
  if (advIdSpan && typeof advertiser !== 'undefined' && advertiser) {
    advIdSpan.textContent = advertiser.id ? `(${advertiser.id})` : '(—)';
    const advNameSpan = document.getElementById('advNameDisplay');
    if (advNameSpan && advertiser.name) advNameSpan.textContent = advertiser.name;
  }

  // Campaign Group — pull first group from campaign_tree_groups as the active group
  // (In production, this would come from the specific CO's selected group context.)
  const cgRaw = localStorage.getItem('campaign_tree_groups');
  if (cgRaw) {
    const groups = JSON.parse(cgRaw);
    if (Array.isArray(groups) && groups.length > 0) {
      const activeGroup = groups[0];
      const cgNameEl = document.getElementById('cgNameDisplay');
      const cgIdEl = document.getElementById('cgIdDisplay');
      if (cgNameEl) cgNameEl.textContent = activeGroup.name || 'Unnamed Group';
      if (cgIdEl) cgIdEl.textContent = activeGroup.id ? `(${activeGroup.id})` : '(—)';
    }
  }

  // Campaign / Ad Group IDs — leave as placeholders in Phase 2.
  // Phase 3 will wire real data from co_selected_entities.
} catch (e) {
  console.warn('Failed to populate entity IDs:', e);
}
```

### 4.6 DO NOT TOUCH in Phase 2
- The page header (editable CO name, status badge, action buttons, CO metadata strip).
- The Manage Entities modal and its JS.
- The `toggleSection()` function.
- The `.entity-cam-check` change handler.
- Any background/border color on the existing Advertiser, Campaign, or Ad Group cards (color redesign is Phase 4).
- Any form field in the Advertiser, Campaign, or Ad Group cards (field list changes are Phase 3).
- Nesting structure: Ad Group cards remain inside Campaign cards. Do NOT flatten.

### 4.7 Verification checklist — Phase 2
- [ ] A teal Campaign Group card appears between the Advertiser and Campaign cards.
- [ ] The CG card title reads the name of the first group in `campaign_tree_groups` (or "Loading…" if none).
- [ ] The CG header shows `(GRP-<timestamp>)` next to the name.
- [ ] The Advertiser card header now shows `(<advertiser.id>)` next to the name.
- [ ] Campaign and Ad Group headers have the `(—)` placeholder span (will populate in Phase 3).
- [ ] Clicking the CG header's chevron collapses/expands the section using the existing `toggleSection()` behavior.
- [ ] No console errors on load.
- [ ] Advertiser, Campaign, and Ad Group cards are otherwise unchanged visually.

**🛑 STOP HERE. Samuel performs visual verification before Phase 3.**

---

## 5. Phase 3 — Connections section + field list updates

**Goal:** Replace each card's interior content with (a) a 3-column Connections table driven by live localStorage data, plus (b) the trimmed, entity-specific editable field list.

### 5.1 File to modify
`ChangeOrderDetails.html` (only)

### 5.2 Shared helper — render the Connections table

Add this helper function inside the `<script>` block (currently ~line 639), **above** the existing `toggleSection` function. This one helper serves all four entity types.

```js
/**
 * Builds and injects a 3-column Connections table into a container element.
 * @param {HTMLElement} container - target element (empty <div>)
 * @param {Object} entity - entity object potentially containing .connectors, .deliveryId, .reportingId
 * @param {string} entityType - 'advertiser' | 'campaignGroup' | 'campaign' | 'adGroup' (for future wiring)
 */
function renderConnectionsTable(container, entity, entityType) {
  if (!container) return;

  const rows = [];
  const connectors = entity && entity.connectors ? entity.connectors : null;
  const platformLabelMap = {
    'trade-desk': 'The Trade Desk',
    'dv360': 'DV360',
    'simplifi': 'Simpli.fi',
    'google-campaign-manager': 'Google Campaign Manager'
  };

  // Build row list: DSP platforms use deliveryId, Ad Server platforms use reportingId
  if (connectors) {
    if (Array.isArray(connectors.dsp)) {
      connectors.dsp.forEach(key => {
        rows.push({
          name: platformLabelMap[key] || key,
          reportingId: entity.deliveryId || '',  // DSP → deliveryId
          type: 'DSP'
        });
      });
    }
    if (Array.isArray(connectors.adServer)) {
      connectors.adServer.forEach(key => {
        rows.push({
          name: platformLabelMap[key] || key,
          reportingId: entity.reportingId || '',  // Ad Server → reportingId
          type: 'Ad Server'
        });
      });
    }
  }

  // Build the table markup
  const tableHtml = `
    <div class="mb-5">
      <h4 class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Connections</h4>
      <div class="overflow-x-auto border border-gray-200 rounded-md">
        <table class="min-w-full divide-y divide-gray-200 text-sm">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Connection</th>
              <th class="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Reporting ID</th>
              <th class="px-4 py-2 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider w-28">Create/Edit</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200 bg-white">
            ${rows.map(r => {
              const hasId = r.reportingId && String(r.reportingId).trim() !== '';
              const checked = hasId ? '' : 'checked';
              const idCell = hasId ? r.reportingId : '—';
              return `
                <tr>
                  <td class="px-4 py-2 text-gray-900">${r.name}</td>
                  <td class="px-4 py-2 text-gray-700">${idCell}</td>
                  <td class="px-4 py-2 text-center">
                    <input type="checkbox" class="w-4 h-4 accent-blue-600 cursor-pointer" ${checked}>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  container.innerHTML = tableHtml;
}
```

### 5.3 Rewrite each card's content body

For each of the four card types, **replace the inner content block** (the `<div class="px-6 py-4">...</div>` inside `<div class="entity-content expanded ...">`) with the markup below.

---

#### 5.3.1 Advertiser card content

**Locate:** The Advertiser section's content block (`<div id="advSection" class="entity-content expanded bg-white border-t border-blue-200">` ~line 278).

**Replace everything inside** (the `<div class="px-6 py-4">...</div>`) with:

```html
<div class="px-6 py-4">
  <div data-adv-connections-container></div>
  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1">Account #</label>
      <input id="advAccountInput" type="text" value="—" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
    </div>
  </div>
</div>
```

---

#### 5.3.2 Campaign Group card content

**Locate:** The CG section placeholder from Phase 2 (`<div class="text-sm text-gray-500 italic" data-cg-connections-placeholder>...`).

**Replace** the wrapping `<div class="px-6 py-4">...</div>` with:

```html
<div class="px-6 py-4">
  <div data-cg-connections-container></div>
</div>
```

(CG has no editable fields other than the connections table.)

---

#### 5.3.3 Campaign card content

**For each Campaign section** (there may be multiple — `cam1Section`, `cam2Section`, `cam3Section`):

**Replace everything inside** the `<div class="px-6 py-4">...</div>` — including the current editable fields AND the nested Ad Groups — with:

```html
<div class="px-6 py-4">
  <div data-cam-connections-container data-campaign-id="CAM-PLACEHOLDER"></div>

  <!-- Nested Ad Groups (keep existing nested ad-group markup in a wrapper) -->
  <div class="space-y-3 pl-4 border-l-4 border-purple-200 campaign-adgroups-wrapper">
    <!-- AG cards (unchanged structurally; their interior content is updated below) -->
  </div>
</div>
```

**⚠️ Preservation rule:** When making this change, **the existing ad-group `<div class="entity-section bg-orange-50 ...">` blocks must be moved, not deleted**, into the `.campaign-adgroups-wrapper`. Do not delete ad-group markup. Do not duplicate it.

Recommended approach for the agent: first cut the existing ad-group section blocks into a buffer, replace the campaign content wrapper as above, then paste the ad-group blocks back into `.campaign-adgroups-wrapper`.

---

#### 5.3.4 Ad Group card content

**For each Ad Group section** (there may be multiple — `ag1Section`, `ag2Section`, etc.):

**Replace everything inside** the Ad Group's `<div class="px-6 py-4">...</div>` with:

```html
<div class="px-6 py-4">
  <div data-ag-connections-container data-adgroup-id="AG-PLACEHOLDER"></div>

  <div class="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-3">
    <div>
      <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">MV Classification</label>
      <input type="text" placeholder="Programmatic Display" class="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none">
    </div>
    <div>
      <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Tactic / Content Category</label>
      <input type="text" placeholder="Persona" class="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none">
    </div>
    <div>
      <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Geo Target</label>
      <input type="text" placeholder="Tuscaloosa, AL (60mi)" class="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none">
    </div>
    <div>
      <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Start Date <span class="text-red-500 font-bold">*</span></label>
      <input type="date" class="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none">
    </div>
    <div>
      <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">End Date <span class="text-red-500 font-bold">*</span></label>
      <input type="date" class="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none">
    </div>
    <div>
      <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Impressions <span class="text-red-500 font-bold">*</span></label>
      <input type="text" placeholder="500,000" class="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none">
    </div>
    <div class="md:col-span-2">
      <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Landing Page</label>
      <input type="url" placeholder="https://example.com/landing" class="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none">
    </div>
    <div class="md:col-span-2">
      <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">UTM Code</label>
      <input type="text" placeholder="utm_source=beacon&utm_medium=display&utm_campaign=..." class="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none">
    </div>
  </div>
</div>
```

**Removed from Ad Group card:** the current "read-only metadata row" with ID/Classification/Tactic, the Monthly Impressions field, and the Additional Notes textarea. Those are no longer part of the card per Decision #9.

(The Ad Group's ID is now displayed in the **header** via Phase 2's `adgroup-id-display` span, not in an inline metadata row.)

### 5.4 Wire the Connections tables on load

Extend the `DOMContentLoaded` handler (after the Phase 2 ID-population block) with:

```js
// Render Connections tables for each entity card
try {
  // Advertiser
  const advContainer = document.querySelector('[data-adv-connections-container]');
  if (advContainer && typeof advertiser !== 'undefined' && advertiser) {
    renderConnectionsTable(advContainer, advertiser, 'advertiser');
    // Populate Account # field from advertiser data
    const acctInput = document.getElementById('advAccountInput');
    if (acctInput) acctInput.value = advertiser.account || advertiser.accountNumber || '';
  }

  // Campaign Group — empty connections render (no CG Connections page yet)
  const cgContainer = document.querySelector('[data-cg-connections-container]');
  if (cgContainer) {
    renderConnectionsTable(cgContainer, { connectors: null }, 'campaignGroup');
  }

  // Campaigns — iterate all campaign card containers
  //   For the mockup, pull from co_selected_entities or fall back to empty.
  document.querySelectorAll('[data-cam-connections-container]').forEach(container => {
    // In production this would resolve data-campaign-id → real campaign object.
    // For now, use any campaign found under the active group, or render empty.
    let campaignObj = { connectors: null };
    try {
      const groupsRaw = localStorage.getItem('campaign_tree_groups');
      if (groupsRaw) {
        const groups = JSON.parse(groupsRaw);
        const firstGroup = Array.isArray(groups) && groups[0];
        if (firstGroup && Array.isArray(firstGroup.campaigns) && firstGroup.campaigns[0]) {
          campaignObj = firstGroup.campaigns[0];
        }
      }
    } catch (e) { /* swallow */ }
    renderConnectionsTable(container, campaignObj, 'campaign');
  });

  // Ad Groups — iterate all ad-group card containers
  document.querySelectorAll('[data-ag-connections-container]').forEach(container => {
    let adGroupObj = { connectors: null };
    try {
      const agRaw = localStorage.getItem('adgroups_data_v1');
      if (agRaw) {
        const ags = JSON.parse(agRaw);
        if (Array.isArray(ags) && ags[0]) adGroupObj = ags[0];
      }
    } catch (e) { /* swallow */ }
    renderConnectionsTable(container, adGroupObj, 'adGroup');
  });
} catch (e) {
  console.warn('Failed to render connections tables:', e);
}
```

**Note to agent:** Phase 3's data wiring uses first-available entities as a stand-in. This is intentional for the mockup — a future phase will resolve specific entities via `co_selected_entities`. Do not try to implement that resolution now.

### 5.5 DO NOT TOUCH in Phase 3
- Card background colors (blue/teal/purple/orange from Phase 2) — those stay until Phase 4.
- The page header, CO metadata, action buttons.
- The Manage Entities modal.
- The `toggleSection()` function and chevron logic.
- The sidebar nav.
- The entity ID/name display spans from Phase 2 — keep them wired.
- Any `.entity-section`, `.entity-header`, `.entity-content`, `.chevron-icon` CSS rules.
- The `.entity-cam-check` handler logic (still needed for the modal).

### 5.6 Risk flags — Phase 3
| Risk | Mitigation |
|------|------------|
| **Ad group cards accidentally deleted** when rewriting campaign content. | The agent MUST preserve all existing ad-group `.entity-section` blocks by cutting them into a buffer before replacing the campaign content, then reinserting them. If unsure, the agent should ask. |
| **Multiple campaign/ad-group instances** — the file has 3 campaigns and 3 ad groups in the sample data. The rewrite must apply to ALL, not just the first. | Use a `querySelectorAll` / iteration approach in the edit strategy; don't manually edit only `cam1Section`. |
| **Reporting ID displayed on the wrong rows.** DSP rows must show `deliveryId`; Ad Server rows must show `reportingId`. | Covered by the `renderConnectionsTable` helper logic. Do not invert. |
| **Checkbox state inverted.** The checkbox is checked when the ID is EMPTY (create/edit needed), unchecked when ID is PRESENT. | Covered in the helper's `hasId ? '' : 'checked'` line. Do not invert. |

### 5.7 Verification checklist — Phase 3
- [ ] **Advertiser card:** shows Connections table at top, then a single "Account #" field below. No Name/Website/Industry fields remain.
- [ ] **Advertiser connections table:** 3 columns, header row reads "Connection | Reporting ID | Create/Edit". Rows populate from `adv_selected_data.connectors`. DSP rows show `advertiser.deliveryId` in the middle column. Ad Server rows show `advertiser.reportingId`.
- [ ] **Checkbox logic:** for any connection row with a non-empty reporting ID, checkbox is unchecked. For rows with empty (`—`), checkbox is checked by default. User can click to toggle.
- [ ] **Campaign Group card:** shows an empty Connections table (3-column header, no rows). No other fields.
- [ ] **Campaign card:** shows a Connections table at top, then the nested Ad Groups, then nothing else. No campaign-level input fields remain.
- [ ] **Ad Group card:** shows Connections table at top, then the 8 fields (MV Classification, Tactic/Content Category, Geo Target, Start Date, End Date, Impressions, Landing Page, UTM Code) in a 2-column responsive grid. No ID metadata row. No Monthly Impressions. No Additional Notes textarea.
- [ ] All 3 campaign cards in the sample are updated (not just the first).
- [ ] All 3 ad group cards in the sample are updated.
- [ ] Entity IDs still display in card headers from Phase 2.
- [ ] No JS console errors.
- [ ] Collapsing/expanding cards still works via chevrons.
- [ ] Manage Entities modal still opens and functions.

**🛑 STOP HERE. Samuel performs visual verification before Phase 4.**

---

## 6. Phase 4 — Visual redesign of the card stack

**Goal:** Replace the loud pastel-backgrounds-per-entity look with a professional, consistent visual language that makes hierarchy obvious without shouting. Tight spacing. Clear parent→child rail. Refined entity-type badges.

### 6.1 File to modify
`ChangeOrderDetails.html` (only)

### 6.2 Design direction (agent: implement exactly as specified)

**Card container:** white background, single `border` in a neutral gray (`border-gray-200`), `rounded-lg`, subtle `shadow-sm` on hover only. No more pastel fills.

**Hierarchy signaling:** each card has a **colored left border accent** (4px) keyed to entity type — this is how the eye tracks the hierarchy.

| Entity | Accent color | Entity pill bg | Pill text |
|--------|-------------|----------------|-----------|
| Advertiser | `border-l-blue-600` | `bg-blue-600` | `text-white` |
| Campaign Group | `border-l-teal-600` | `bg-teal-600` | `text-white` |
| Campaign | `border-l-indigo-500` | `bg-indigo-500` | `text-white` |
| Ad Group | `border-l-amber-500` | `bg-amber-500` | `text-white` |

**Nesting visualization:** Campaign cards (inside the Campaign Group card? — see §6.4) and Ad Group cards (inside a Campaign card) get a left indentation of `ml-6` and a thin vertical rail (`border-l border-gray-200`) in the parent's padding area, connecting children visually to their parent.

**Card header row:**
- Entity-type pill (rounded-md, px-2 py-0.5, text-xs, font-semibold, uppercase, tracking-wide): `ADV` / `CG` / `CAM` / `AG`
- Entity name: `text-base font-semibold text-gray-900`
- Entity ID: `text-xs text-gray-500 font-mono` — e.g., `ADV-A8X2K1`
- Chevron on the right, gray (`text-gray-400 hover:text-gray-600`)
- Hover state on entire header row: `bg-gray-50`

**Spacing:** card interior padding `px-5 py-4`. Gap between cards `space-y-3` (tightened from current `space-y-4`). No extra top/bottom margin on child cards — the vertical rail + indentation handles the relationship.

**Connections table header:** label changes from "Connections" to a small all-caps section header: `text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2`. The table body rows are `py-1.5` (tighter than Phase 3's `py-2`). Alternating row shading removed. Border `border-gray-200` only.

**Field labels:** across all cards, standardize on `text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1`. Inputs: `w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none`. No more mixed sizes (currently Advertiser uses `py-2` while Ad Group uses `py-1.5`).

### 6.3 Implementation — exact changes

#### 6.3.1 Remove the old colored-backgrounds-per-entity styling

Search and replace the four card section wrappers:

```html
<!-- BEFORE (Advertiser) -->
<div class="entity-section bg-blue-50 border border-blue-200">
<!-- AFTER -->
<div class="entity-section bg-white border border-gray-200 border-l-4 border-l-blue-600">
```

```html
<!-- BEFORE (CG) -->
<div class="entity-section bg-teal-50 border border-teal-200">
<!-- AFTER -->
<div class="entity-section bg-white border border-gray-200 border-l-4 border-l-teal-600">
```

```html
<!-- BEFORE (Campaign) -->
<div class="entity-section bg-purple-50 border border-purple-200">
<!-- AFTER -->
<div class="entity-section bg-white border border-gray-200 border-l-4 border-l-indigo-500">
```

```html
<!-- BEFORE (Ad Group) -->
<div class="entity-section bg-orange-50 border border-orange-200">
<!-- AFTER -->
<div class="entity-section bg-white border border-gray-200 border-l-4 border-l-amber-500">
```

**For every entity type**, the `.entity-header` div class should change from:
```html
class="entity-header flex items-center justify-between px-4 py-3"
```
to:
```html
class="entity-header flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors"
```

#### 6.3.2 Update entity pills

```html
<!-- BEFORE (Advertiser) -->
<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wide bg-blue-100 text-blue-900">ADV</span>
<!-- AFTER -->
<span class="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold uppercase tracking-wider bg-blue-600 text-white">ADV</span>
```

Repeat with color tokens for each entity type (teal-600 for CG, indigo-500 for CAM, amber-500 for AG).

#### 6.3.3 Update entity name + ID display

Across all card headers, normalize to:
```html
<h3 class="text-base font-semibold text-gray-900">{NAME}</h3>
<span class="text-xs text-gray-500 font-mono">{ID}</span>
```

Remove the per-entity color classes on these (`text-blue-900`, `text-teal-900`, etc.).

#### 6.3.4 Update chevrons

All chevrons standardize to `text-gray-400 group-hover:text-gray-600`. Remove per-entity colored chevrons.

#### 6.3.5 Update the "Advertiser-level fields" / "3 Ad Groups" right-side labels

The existing small helper text on each header's right side (e.g., `<span class="text-sm text-blue-600">Advertiser-level fields</span>`) should change to `text-xs text-gray-400`. The content stays the same except the CG card should read `Campaign Group` (already set in Phase 2) and the Campaign card should read `{N} Ad Groups` in gray.

#### 6.3.6 Apply nesting rail

Wrap the existing `<div class="space-y-3 pl-4 border-l-4 border-purple-200 campaign-adgroups-wrapper">` (Phase 3) to:
```html
<div class="space-y-2 mt-4 ml-4 pl-4 border-l border-gray-200 campaign-adgroups-wrapper">
```

(Thin gray rail instead of thick purple, tighter spacing, less visual noise.)

#### 6.3.7 Update the Connections section header

In `renderConnectionsTable` (Phase 3, §5.2), change:
```html
<h4 class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Connections</h4>
```
to:
```html
<h4 class="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Connections</h4>
```

And update the table's row padding: `px-4 py-2` → `px-4 py-1.5`.

#### 6.3.8 Update field label styling across the file

Find every instance of:
```html
class="block text-sm font-medium text-gray-700 mb-1"
```
Change to:
```html
class="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1"
```

For `required-indicator` labels, keep the modifier — it's driven by CSS and doesn't need changing.

For Ad Group labels already using `text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1`, only normalize the size to `text-[11px]`.

### 6.4 Decision on Campaign Group as parent of Campaigns

**Observation:** Per the domain model, Campaigns are children of Campaign Groups — which implies Campaign cards should visually nest INSIDE the Campaign Group card on this page. However, the current markup places them as siblings.

**Decision for this phase:** Keep them as siblings (do NOT move Campaign cards inside the CG card). The CG card stays standalone. The visual hierarchy is signaled by:
1. Card order (CG appears above Campaigns)
2. Left accent color
3. Tighter `space-y-3` between cards

Rationale: nesting Campaigns inside the CG card would break the existing Manage Entities modal behavior and the `toggleSection` collapse logic. A future phase can address this if desired.

**Ad Groups stay nested inside their parent Campaign** — unchanged from current behavior.

### 6.5 DO NOT TOUCH in Phase 4
- Any field values, input names, or form behavior (Phase 3 handled that).
- The Connections table **data logic** (Phase 3 handled that; only the **visual styling** of the table changes here).
- The `renderConnectionsTable` JS **logic** — only its inline HTML class strings change.
- The entity ID / name binding code from Phase 2.
- The page header, CO metadata, action buttons, Manage Entities modal.
- Sidebar nav.
- `toggleSection()` and chevron rotation behavior.
- The `.entity-cam-check` handler.

### 6.6 Verification checklist — Phase 4
- [ ] All four card types show a white background with a colored left border accent (blue/teal/indigo/amber).
- [ ] Entity pills are solid-color pills with white text (not the previous pastel-on-pastel look).
- [ ] Card headers show name + monospace ID in a muted gray.
- [ ] Hovering a card header subtly shades it (`bg-gray-50`).
- [ ] Ad Group cards are indented with a thin gray vertical rail connecting them to their parent Campaign.
- [ ] Connections tables are visually tighter, with a small uppercase section header.
- [ ] All form field labels are the same size and weight (`text-[11px] font-semibold uppercase`).
- [ ] No console errors.
- [ ] Collapse/expand still works on every card.
- [ ] Entire stack looks **consistent** — no single card breaks the visual language.
- [ ] Overall page looks more professional and more intentional than the pastel-backgrounds version, and hierarchy is readable at a glance.

---

## 7. Out of scope (do NOT attempt in any phase)

- Adding a Campaign Group Connections page (`AdvertiserCampaignGroupConnections.html`).
- Wiring the checkbox to any backend action or sync behavior.
- Moving Campaign cards inside Campaign Group cards (see §6.4 decision).
- Changing the Manage Entities modal.
- Changing the `ChangeOrderList.html` (global) page.
- Removing or repurposing the `AdvertiserChangeOrders.html` page.
- Any non-ChangeOrder files beyond the Phase 1 sidebar additions.

---

## 8. Completion report format

When all four phases are executed, the agent should report:

```
Phase 1: Sidebar nav — [N] files modified: [list]
Phase 2: Campaign Group card + entity ID displays — complete
Phase 3: Connections tables + field lists — complete
Phase 4: Visual redesign — complete

Files touched: [full list]
Files untouched (per DO NOT TOUCH): [confirmation line]
Console errors on load: [None / listed]
Open questions / ambiguities: [list or None]
```

---

**End of plan.**
