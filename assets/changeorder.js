/**
 * Change Order Management Module
 * Provides functions for creating, reading, updating, and deleting change orders
 */

const CHANGE_ORDERS_KEY = 'change_orders_data';

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttr(value) {
  return escapeHtml(value);
}

function escapeJsString(value) {
  return String(value == null ? '' : value)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n')
    .replace(/</g, '\\x3C')
    .replace(/>/g, '\\x3E');
}

// ==================== STORAGE FUNCTIONS ====================

/**
 * Get all change orders from localStorage
 * @returns {Array} Array of change order objects
 */
function getChangeOrders() {
  try {
    const data = localStorage.getItem(CHANGE_ORDERS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Error reading change orders:', e);
    return [];
  }
}

/**
 * Get a single change order by ID
 * @param {string} id - The change order ID
 * @returns {Object|null} The change order object or null if not found
 */
function getChangeOrder(id) {
  const orders = getChangeOrders();
  return orders.find(co => co.id === id) || null;
}

/**
 * Save a change order (create or update)
 * @param {Object} co - The change order object to save
 */
function saveChangeOrder(co) {
  try {
    const orders = getChangeOrders();
    const existingIndex = orders.findIndex(o => o.id === co.id);
    
    co.modifiedDate = new Date().toISOString();
    
    if (existingIndex !== -1) {
      orders[existingIndex] = co;
    } else {
      co.createdDate = co.createdDate || new Date().toISOString();
      orders.push(co);
    }
    
    localStorage.setItem(CHANGE_ORDERS_KEY, JSON.stringify(orders));
    
    // Dispatch storage event for other tabs/windows
    window.dispatchEvent(new StorageEvent('storage', {
      key: CHANGE_ORDERS_KEY
    }));
    
    return true;
  } catch (e) {
    console.error('Error saving change order:', e);
    return false;
  }
}

/**
 * Delete a change order by ID
 * @param {string} id - The change order ID to delete
 * @returns {boolean} True if deleted, false otherwise
 */
function deleteChangeOrder(id) {
  try {
    const orders = getChangeOrders();
    const filteredOrders = orders.filter(co => co.id !== id);
    
    if (filteredOrders.length === orders.length) {
      return false; // Not found
    }
    
    localStorage.setItem(CHANGE_ORDERS_KEY, JSON.stringify(filteredOrders));
    return true;
  } catch (e) {
    console.error('Error deleting change order:', e);
    return false;
  }
}

/**
 * Generate a unique Change Order ID
 * @returns {string} A unique CO ID like "CO-A8X2K1"
 */
function generateCOId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let id = 'CO-';
  for (let i = 0; i < 6; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

// ==================== MODAL FUNCTIONS ====================

/**
 * Open the Change Order Picker Modal
 * This modal allows users to create a new change order or add items to an existing one
 */
function openCOPickerModal() {
  try {
    // Check if modal already exists
    let modal = document.getElementById('coPickerModal');
    
    if (!modal) {
      // Create modal if it doesn't exist
      modal = createCOPickerModal();
      document.body.appendChild(modal);
    }
    
    // Populate existing change orders
    populateCOPickerList();
    
    // Show modal (class + inline display for cross-page reliability)
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    modal.style.display = 'flex';
  } catch (error) {
    console.error('Failed to open Change Order picker modal:', error);
    coShowToast('Unable to open Change Order modal', 'error');
  }
}

/**
 * Close the Change Order Picker Modal
 */
function closeCOPickerModal() {
  const modal = document.getElementById('coPickerModal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    modal.style.display = 'none';
  }
}

/**
 * Create the CO Picker Modal HTML
 * @returns {HTMLElement} The modal element
 */
function createCOPickerModal() {
  const modal = document.createElement('div');
  modal.id = 'coPickerModal';
  modal.className = 'fixed inset-0 z-50 items-center justify-center bg-black bg-opacity-50 hidden';
  
  modal.innerHTML = `
    <div class="bg-white rounded-lg shadow-lg w-full max-w-lg mx-4 overflow-hidden">
      <!-- Modal Header -->
      <div class="bg-gradient-to-r from-green-600 to-green-700 px-6 py-4">
        <div class="flex items-center justify-between">
          <h2 class="text-xl font-semibold text-white">Change Order</h2>
          <button onclick="closeCOPickerModal()" class="text-white hover:text-green-200 transition-colors" aria-label="Close modal">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
      </div>
      
      <!-- Modal Body -->
      <div class="p-6">
        <!-- Create New Option -->
        <div class="mb-6">
          <button onclick="createNewChangeOrder()" class="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
            </svg>
            Create New Change Order
          </button>
        </div>
        
        <!-- Divider -->
        <div class="flex items-center gap-4 mb-6">
          <div class="flex-1 border-t border-gray-200"></div>
          <span class="text-sm text-gray-500">or add to existing</span>
          <div class="flex-1 border-t border-gray-200"></div>
        </div>
        
        <!-- Existing Change Orders List -->
        <div id="coPickerList" class="space-y-2 max-h-64 overflow-y-auto">
          <p class="text-sm text-gray-500 text-center py-4">No existing change orders</p>
        </div>
      </div>
      
      <!-- Modal Footer -->
      <div class="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end">
        <button onclick="closeCOPickerModal()" class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
          Cancel
        </button>
      </div>
    </div>
  `;
  
  // Close on backdrop click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeCOPickerModal();
    }
  });
  
  return modal;
}

/**
 * Populate the Change Order picker list with existing COs
 */
function populateCOPickerList() {
  const listEl = document.getElementById('coPickerList');
  if (!listEl) return;
  
  const orders = getChangeOrders().filter(co => 
    (co.status || 'draft').toLowerCase() === 'draft'
  );
  
  if (orders.length === 0) {
    listEl.innerHTML = '<p class="text-sm text-gray-500 text-center py-4">No draft change orders available</p>';
    return;
  }
  
  listEl.innerHTML = orders.map(co => `
    <button type="button" class="w-full flex items-center justify-between p-3 text-left border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors" data-co-id="${escapeAttr(co.id)}">
      <div>
        <p class="text-sm font-medium text-gray-900">${escapeHtml(co.name || co.id)}</p>
        <p class="text-xs text-gray-500">${escapeHtml(co.id)} • ${escapeHtml(formatDate(co.modifiedDate))}</p>
      </div>
      <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
      </svg>
    </button>
  `).join('');

  listEl.querySelectorAll('button[data-co-id]').forEach(btn => {
    btn.addEventListener('click', () => {
      const coId = btn.getAttribute('data-co-id') || '';
      addToChangeOrder(coId);
    });
  });
}

/**
 * Create a new change order and navigate to it
 * Now opens the Entity Select modal (Step 2) before redirecting
 */
function createNewChangeOrder() {
  console.log('createNewChangeOrder called');
  
  // Get advertiser info from localStorage
  let advData = null;
  try {
    const raw = localStorage.getItem('adv_selected_data');
    if (raw) advData = JSON.parse(raw);
  } catch (e) {}

  console.log('Advertiser data:', advData);

  // Create advertiser entity
  const advertiserEntity = advData ? {
    type: 'advertiser',
    id: advData.id || advData.advertiserId || 'unknown',
    name: advData.name || 'Unknown Advertiser',
    fields: {}
  } : null;

  const newCO = {
    id: generateCOId(),
    name: 'New Change Order',
    status: 'draft',
    createdDate: new Date().toISOString(),
    modifiedDate: new Date().toISOString(),
    owner: 'Current User', // Would be replaced with actual user
    entities: advertiserEntity ? [advertiserEntity] : [],
    advertiserId: getSelectedAdvertiserId()
  };
  
  console.log('Created new CO:', newCO);
  
  // Store the new CO temporarily for the entity selection step
  window._pendingNewCO = newCO;
  
  console.log('Stored in window._pendingNewCO:', window._pendingNewCO);
  
  closeCOPickerModal();
  
  // Open the Entity Tree Selector (Step 2) instead of navigating directly
  console.log('Opening entity select modal...');
  openEntitySelectModal();
}

// ==================== ENTITY TREE SELECTOR (STEP 2) ====================

/**
 * Build the hierarchical entity tree HTML dynamically from localStorage
 * @returns {string} HTML string for the entity tree
 */
function buildEntityTreeHTML() {
  // 1. Get advertiser data
  let adv = null;
  try {
    const raw = localStorage.getItem('adv_selected_data');
    if (raw) adv = JSON.parse(raw);
  } catch (e) {}

  // Fallback to selectedAdvertiser if adv_selected_data not available
  if (!adv) {
    try {
      const raw = localStorage.getItem('selectedAdvertiser');
      if (raw) adv = JSON.parse(raw);
    } catch (e) {}
  }

  const advName = (adv && adv.name) ? adv.name : 'Unknown Advertiser';
  const advId = adv ? adv.id : null;

  // 2. Get all campaigns for this advertiser (filter by advertiserId)
  let campaigns = [];
  try {
    const tree = JSON.parse(localStorage.getItem('campaign_tree_groups') || '{}');
    let allCampaigns = [];
    if (tree.campaigns) allCampaigns = allCampaigns.concat(tree.campaigns);
    if (tree.groups) {
      tree.groups.forEach(g => {
        if (g.campaigns) allCampaigns = allCampaigns.concat(g.campaigns);
      });
    }
    // Filter campaigns to only those belonging to the current advertiser
    if (advId) {
      campaigns = allCampaigns.filter(c => String(c.advertiserId) === String(advId));
    } else {
      campaigns = allCampaigns;
    }
  } catch (e) {}

  // 3. Get all ad groups and build a map of campaignId → [adgroups]
  let adgroupsByCampaign = {};
  try {
    const allAdgroups = JSON.parse(localStorage.getItem('adgroups_data_v1') || '[]');
    const campaignIds = new Set(campaigns.map(c => c.id));
    allAdgroups.forEach(ag => {
      const camId = ag.campaign || ag.campaignId;
      if (camId && campaignIds.has(camId)) {
        if (!adgroupsByCampaign[camId]) adgroupsByCampaign[camId] = [];
        adgroupsByCampaign[camId].push(ag);
      }
    });
  } catch (e) {}

  // 4. Build the HTML tree
  let html = '<ul class="space-y-1">';

  // Advertiser row (always checked, disabled)
  html += `
    <li class="flex items-center gap-2 px-2 py-1.5 rounded-md opacity-60">
      <input type="checkbox" checked disabled class="w-4 h-4 accent-blue-600">
      <span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-blue-100 text-blue-900">ADV</span>
      <span class="text-sm font-semibold text-gray-800">${escapeHtml(advName)}</span>
      <span class="text-[10px] text-gray-400 ml-1">(always included)</span>
    </li>`;

  // Campaign rows with nested ad groups
  campaigns.forEach((cam, idx) => {
    const camChildrenId = 'entityTree-cam' + idx + '-children';
    const camName = cam.beaconCampaignName || cam.name || cam.id || 'Unnamed Campaign';
    const childAGs = adgroupsByCampaign[cam.id] || [];
    const safeCamId = escapeAttr(cam.id);
    const safeChildrenId = escapeAttr(camChildrenId);
    const safeCamName = escapeHtml(camName);

    html += `
    <li class="ml-5">
      <div class="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-gray-50">
        <input type="checkbox" checked class="w-4 h-4 accent-blue-600 entity-tree-cam-check"
               data-cam-id="${safeCamId}" data-children="${safeChildrenId}">
        <span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-purple-100 text-purple-800">CAM</span>
        <span class="text-sm text-gray-800">${safeCamName}</span>
      </div>
      <div id="${safeChildrenId}" class="ml-8 space-y-0.5">`;

    if (childAGs.length === 0) {
      html += `<div class="px-2 py-1 text-xs text-gray-400 italic">No ad groups</div>`;
    } else {
      childAGs.forEach(ag => {
        const agName = ag.name || ag.id || 'Unnamed Ad Group';
        const safeAgId = escapeAttr(ag.id);
        html += `
        <div class="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-gray-50">
          <input type="checkbox" checked class="w-4 h-4 accent-blue-600 entity-tree-ag-check" data-ag-id="${safeAgId}" data-cam-id="${safeCamId}">
          <span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-orange-100 text-orange-800">AG</span>
          <span class="text-xs text-gray-600">${escapeHtml(agName)}</span>
        </div>`;
      });
    }

    html += `</div></li>`;
  });

  // Handle case: no campaigns at all
  if (campaigns.length === 0) {
    html += `<li class="ml-5 px-2 py-3 text-sm text-gray-400 italic">No campaigns found for this advertiser.</li>`;
  }

  html += '</ul>';
  return html;
}

/**
 * Inject the Entity Select Modal HTML into the page if it doesn't already exist
 */
function ensureEntitySelectModal() {
  if (document.getElementById('entitySelectModal')) return;

  const modalHTML = `
  <div id="entitySelectModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 hidden">
    <div class="bg-white rounded-lg shadow-lg w-full max-w-xl mx-4 overflow-hidden">
      <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <h2 class="text-lg font-semibold text-gray-900">Select Records to Include</h2>
        <button class="text-gray-400 hover:text-gray-600 transition-colors"
          onclick="closeEntitySelectModal()" aria-label="Close">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>
      <div class="px-6 py-4 max-h-[60vh] overflow-y-auto">
        <p class="text-sm text-gray-500 mb-4">Choose which Campaigns and Ad Groups to include in this Change Order. The Advertiser is always included.</p>
        <div id="entityTreeContainer">
          <!-- Dynamically populated -->
        </div>
      </div>
      <div class="flex justify-end gap-2 px-6 py-3 bg-gray-50 border-t border-gray-200">
        <button class="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          onclick="closeEntitySelectModal()">Cancel</button>
        <button id="entityTreeConfirmBtn" class="px-4 py-2 text-sm text-white bg-green-600 border border-green-600 rounded-md hover:bg-green-700"
          onclick="confirmEntityTreeSelection()">Create Change Order</button>
      </div>
    </div>
  </div>`;

  document.body.insertAdjacentHTML('beforeend', modalHTML);
}

/**
 * Open the Entity Select Modal (Step 2)
 */
function openEntitySelectModal() {
  ensureEntitySelectModal();
  const container = document.getElementById('entityTreeContainer');
  container.innerHTML = buildEntityTreeHTML();
  const modal = document.getElementById('entitySelectModal');
  modal.classList.remove('hidden');
  modal.classList.add('flex');

  // Wire up campaign checkbox toggles
  document.querySelectorAll('.entity-tree-cam-check').forEach(cb => {
    cb.addEventListener('change', function() {
      const childrenId = this.getAttribute('data-children');
      if (childrenId) {
        document.querySelectorAll('#' + childrenId + ' input[type="checkbox"]').forEach(c => {
          c.checked = this.checked;
        });
      }
    });
  });
}

/**
 * Close the Entity Select Modal
 */
function closeEntitySelectModal() {
  const modal = document.getElementById('entitySelectModal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
  
  // Clear the pending CO if user cancels
  window._pendingNewCO = null;
}

/**
 * Collect selected entities from the tree and proceed with CO creation
 */
function confirmEntityTreeSelection() {
  console.log('confirmEntityTreeSelection called');
  console.log('window._pendingNewCO:', window._pendingNewCO);
  
  const selectedCampaigns = [];
  const selectedAdGroups = [];

  document.querySelectorAll('.entity-tree-cam-check:checked').forEach(cb => {
    selectedCampaigns.push(cb.getAttribute('data-cam-id'));
  });

  document.querySelectorAll('.entity-tree-ag-check:checked').forEach(cb => {
    selectedAdGroups.push({
      id: cb.getAttribute('data-ag-id'),
      campaignId: cb.getAttribute('data-cam-id')
    });
  });

  console.log('Selected campaigns:', selectedCampaigns);
  console.log('Selected ad groups:', selectedAdGroups);

  // Store selections in localStorage for ChangeOrderDetail.html to pick up
  localStorage.setItem('co_selected_entities', JSON.stringify({
    campaigns: selectedCampaigns,
    adgroups: selectedAdGroups
  }));

  // Don't close the modal here - we'll close it after saving
  // or let the redirect take care of it
  
  // Now proceed with the CO creation and redirect
  proceedWithCOCreation();
}

/**
 * Complete the CO creation process and redirect to ChangeOrderDetail
 */
function proceedWithCOCreation() {
  console.log('proceedWithCOCreation called');
  const newCO = window._pendingNewCO;
  
  console.log('newCO:', newCO);
  
  if (!newCO) {
    console.error('No pending CO found - this is the problem!');
    alert('Error: No pending Change Order found. Please try again.');
    return;
  }
  
  // Get selected entities from localStorage
  let selectedEntities = { campaigns: [], adgroups: [] };
  try {
    const raw = localStorage.getItem('co_selected_entities');
    if (raw) selectedEntities = JSON.parse(raw);
  } catch (e) {
    console.error('Error parsing selected entities:', e);
  }
  
  console.log('Selected entities:', selectedEntities);
  
  // Get campaign and ad group data for names
  let campaignMap = {};
  let adgroupMap = {};
  
  try {
    const tree = JSON.parse(localStorage.getItem('campaign_tree_groups') || '{}');
    let allCams = [];
    if (tree.campaigns) allCams = allCams.concat(tree.campaigns);
    if (tree.groups) tree.groups.forEach(g => { if (g.campaigns) allCams = allCams.concat(g.campaigns); });
    allCams.forEach(c => campaignMap[c.id] = c);
  } catch (e) {
    console.error('Error loading campaigns:', e);
  }
  
  try {
    const all = JSON.parse(localStorage.getItem('adgroups_data_v1') || '[]');
    all.forEach(ag => adgroupMap[ag.id] = ag);
  } catch (e) {
    console.error('Error loading ad groups:', e);
  }
  
  // Add selected campaigns as entities
  selectedEntities.campaigns.forEach(camId => {
    const cam = campaignMap[camId];
    newCO.entities.push({
      type: 'campaign',
      id: camId,
      name: cam ? (cam.beaconCampaignName || cam.name) : camId,
      fields: {}
    });
  });
  
  // Add selected ad groups as entities
  selectedEntities.adgroups.forEach(agInfo => {
    const ag = adgroupMap[agInfo.id];
    newCO.entities.push({
      type: 'adgroup',
      id: agInfo.id,
      name: ag ? ag.name : agInfo.id,
      campaignId: agInfo.campaignId,
      fields: {}
    });
  });
  
  console.log('Final CO with entities:', newCO);
  
  // Save the CO with all entities
  saveChangeOrder(newCO);
  
  // Clear pending data
  window._pendingNewCO = null;
  localStorage.removeItem('co_selected_entities');
  
  // Show success toast if available
  coShowToast('Change order created', 'success');
  
  console.log('Redirecting to:', `./ChangeOrderDetail.html?coId=${encodeURIComponent(newCO.id)}`);
  
  // Navigate to the new change order
  window.location.href = `./ChangeOrderDetail.html?coId=${encodeURIComponent(newCO.id)}`;
}

/**
 * Add current entity to an existing change order
 * @param {string} coId - The change order ID to add to
 */
function addToChangeOrder(coId) {
  const co = getChangeOrder(coId);
  if (!co) {
    coShowToast('Change order not found', 'error');
    return;
  }
  
  // Get current page context (campaign, ad group, etc.)
  const entity = getCurrentEntityContext();
  
  if (entity) {
    co.entities = co.entities || [];
    
    // Check if entity already exists
    const exists = co.entities.some(e => e.id === entity.id && e.type === entity.type);
    
    if (!exists) {
      co.entities.push(entity);
      saveChangeOrder(co);

      coShowToast(`Added to ${co.name || co.id}`, 'success');
    } else {
      coShowToast('Already in this change order', 'info');
    }
  }
  
  closeCOPickerModal();
}

/**
 * Get the current entity context based on the page
 * @returns {Object|null} Entity object with id, type, and name
 */
function getCurrentEntityContext() {
  const url = window.location.href;
  const params = new URLSearchParams(window.location.search);
  
  // Campaign detail page
  if (url.includes('CampaignDetails.html')) {
    const campaignId = params.get('campaignId');
    const campaignName = params.get('campaignName');
    if (campaignId) {
      return { id: campaignId, type: 'campaign', name: campaignName || campaignId };
    }
  }
  
  // Ad Group detail page
  if (url.includes('AdGroupDetails.html')) {
    const adGroupId = params.get('id');
    if (adGroupId) {
      return { id: adGroupId, type: 'adgroup', name: adGroupId };
    }
  }
  
  return null;
}

/**
 * Get the selected advertiser ID from various sources
 * @returns {string|null} The advertiser ID or null
 */
function getSelectedAdvertiserId() {
  // Try URL params
  const params = new URLSearchParams(window.location.search);
  if (params.get('advertiserId')) {
    return params.get('advertiserId');
  }
  
  // Try localStorage
  try {
    const advData = localStorage.getItem('adv_selected_data');
    if (advData) {
      const adv = JSON.parse(advData);
      return adv.id || null;
    }
  } catch (e) {}
  
  return null;
}

/**
 * Format a date string for display
 * @param {string} dateStr - ISO date string
 * @returns {string} Formatted date
 */
function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  } catch (e) {
    return dateStr;
  }
}

// ==================== TOAST HELPER ====================

/**
 * Show a toast notification without overriding the app-global toast API.
 * @param {string} message - The message to display
 * @param {string} type - The type: 'success', 'error', 'info', 'warning'
 */
function coShowToast(message, type = 'info') {
  if (typeof window.showToast === 'function') {
    window.showToast({ message, type });
    return;
  }

  if (typeof window.showToastCompat === 'function') {
    window.showToastCompat({ message, type });
    return;
  }

  // Fallback to console
  console.log(`[${type.toUpperCase()}] ${message}`);
}

// Attach click listeners so New Change Order still works when inline handlers
// are blocked/stripped by browser settings or page CSP.
function bindCOPickerTriggers() {
  const selectors = [
    '[data-open-co-picker]',
    '[onclick*="openCOPickerModal"]'
  ];

  document.querySelectorAll(selectors.join(',')).forEach((el) => {
    if (el.dataset.coPickerBound === '1') return;
    el.dataset.coPickerBound = '1';
    el.addEventListener('click', (event) => {
      event.preventDefault();
      openCOPickerModal();
    });
  });
}

// Make functions globally available
window.getChangeOrders = getChangeOrders;
window.getChangeOrder = getChangeOrder;
window.saveChangeOrder = saveChangeOrder;
window.deleteChangeOrder = deleteChangeOrder;
window.openCOPickerModal = openCOPickerModal;
window.closeCOPickerModal = closeCOPickerModal;
window.createNewChangeOrder = createNewChangeOrder;
window.addToChangeOrder = addToChangeOrder;
window.generateCOId = generateCOId;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bindCOPickerTriggers);
} else {
  bindCOPickerTriggers();
}

// Entity Tree Selector functions (Step 2 of CO creation)
window.buildEntityTreeHTML = buildEntityTreeHTML;
window.ensureEntitySelectModal = ensureEntitySelectModal;
window.openEntitySelectModal = openEntitySelectModal;
window.closeEntitySelectModal = closeEntitySelectModal;
window.confirmEntityTreeSelection = confirmEntityTreeSelection;
window.proceedWithCOCreation = proceedWithCOCreation;
