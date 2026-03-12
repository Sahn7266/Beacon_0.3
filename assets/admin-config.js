(function () {
  'use strict';

  const KEY = 'beacon_admin_config_v1';

  const DEFAULT_CONFIG = {
    dspPlatforms: ['The Trade Desk', 'DV360', 'Simpli.fi'],
    adServerPlatforms: ['Google Campaign Manager'],
    templates: [
      'Programmatic Display',
      'Programmatic Video',
      'Programmatic Audio',
      'Connected TV',
      'Paid Social',
      'Paid Search',
      'Event Targeting',
      'Native Video',
      'DOOH',
      'PLD Display',
      'PLD Video'
    ],
    mvClassifications: [
      'Programmatic Display',
      'Programmatic Video',
      'Programmatic Audio',
      'Connected TV',
      'Paid Social',
      'Paid Search',
      'Event Targeting',
      'Native Video',
      'DOOH',
      'PLD Display',
      'PLD Video'
    ],
    tactics: [
      'Persona',
      'Retargeting',
      'Data Onboarding',
      'Company Targeting',
      'IP Targeting',
      'Addressable',
      'Location Targeting',
      'Frequency Fencing',
      'Contextual',
      'Advanced ABM',
      'Sector'
    ]
  };

  function deepClone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function normalizeOptionList(value) {
    if (!Array.isArray(value)) return [];
    const seen = new Set();
    const out = [];
    value.forEach(function (item) {
      const text = String(item == null ? '' : item).trim();
      if (!text) return;
      const key = text.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      out.push(text);
    });
    return out;
  }

  function normalizeConfig(config) {
    const base = deepClone(DEFAULT_CONFIG);
    if (!config || typeof config !== 'object') return base;

    Object.keys(base).forEach(function (key) {
      if (Array.isArray(config[key])) {
        const normalized = normalizeOptionList(config[key]);
        if (normalized.length) base[key] = normalized;
      }
    });

    return base;
  }

  function loadConfig() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return deepClone(DEFAULT_CONFIG);
      const parsed = JSON.parse(raw);
      return normalizeConfig(parsed);
    } catch (error) {
      console.warn('Failed to load admin config, using defaults:', error);
      return deepClone(DEFAULT_CONFIG);
    }
  }

  function saveConfig(config) {
    const normalized = normalizeConfig(config);
    localStorage.setItem(KEY, JSON.stringify(normalized));
    window.dispatchEvent(new CustomEvent('beacon-admin-config-changed', {
      detail: { config: deepClone(normalized) }
    }));
    return normalized;
  }

  function ensureConfig() {
    const config = loadConfig();
    if (!localStorage.getItem(KEY)) {
      localStorage.setItem(KEY, JSON.stringify(config));
    }
    return config;
  }

  function getOptions(key) {
    const config = loadConfig();
    return Array.isArray(config[key]) ? deepClone(config[key]) : [];
  }

  function setOptions(key, options) {
    const config = loadConfig();
    config[key] = normalizeOptionList(options);
    return saveConfig(config);
  }

  function clearAndAppendPlaceholder(select, placeholder) {
    select.innerHTML = '';
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = placeholder;
    select.appendChild(opt);
  }

  function populateSelect(selectOrId, options, placeholder) {
    const select = typeof selectOrId === 'string' ? document.getElementById(selectOrId) : selectOrId;
    if (!select || select.tagName !== 'SELECT') return;

    const previousValue = select.value;
    clearAndAppendPlaceholder(select, placeholder || '-- Select --');

    options.forEach(function (optionText) {
      const option = document.createElement('option');
      option.value = optionText;
      option.textContent = optionText;
      select.appendChild(option);
    });

    if (previousValue && options.indexOf(previousValue) !== -1) {
      select.value = previousValue;
    }
  }

  function ensureDatalist(input, datalistId) {
    if (!input) return null;

    let datalist = document.getElementById(datalistId);
    if (!datalist) {
      datalist = document.createElement('datalist');
      datalist.id = datalistId;
      input.parentNode && input.parentNode.appendChild(datalist);
    }

    input.setAttribute('list', datalistId);
    return datalist;
  }

  function populateDatalist(inputOrId, options, datalistId) {
    const input = typeof inputOrId === 'string' ? document.getElementById(inputOrId) : inputOrId;
    if (!input) return;

    const listId = datalistId || (input.id ? input.id + '_options' : 'beacon_options');
    const datalist = ensureDatalist(input, listId);
    if (!datalist) return;

    datalist.innerHTML = '';
    options.forEach(function (optionText) {
      const option = document.createElement('option');
      option.value = optionText;
      datalist.appendChild(option);
    });
  }

  function normalizePlatformValue(label) {
    const value = String(label || '').trim().toLowerCase();
    if (!value) return '';
    if (value === 'the trade desk' || value === 'trade desk' || value === 'ttd') return 'trade-desk';
    if (value === 'google campaign manager' || value === 'gcm') return 'google-campaign-manager';
    if (value === 'simpli.fi') return 'simplifi';
    return value
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  function populateCustomPlatformMenu(menuId, hiddenInputId, options, placeholder) {
    const menu = document.getElementById(menuId);
    const trigger = menu ? menu.previousElementSibling : null;
    const hiddenInput = document.getElementById(hiddenInputId);
    if (!menu || !hiddenInput) return;

    const currentValue = hiddenInput.value;

    menu.innerHTML = '';

    const noneOption = document.createElement('div');
    noneOption.className = 'platform-select-option';
    noneOption.dataset.value = '';
    noneOption.dataset.connected = 'false';
    noneOption.role = 'option';
    noneOption.innerHTML = '<span>' + (placeholder || '-- Select --') + '</span>';
    menu.appendChild(noneOption);

    options.forEach(function (label) {
      const option = document.createElement('div');
      option.className = 'platform-select-option';
      option.dataset.value = normalizePlatformValue(label);
      option.dataset.connected = 'false';
      option.role = 'option';
      option.innerHTML = '<span>' + label + '</span>';
      menu.appendChild(option);
    });

    if (currentValue) {
      const selected = menu.querySelector('.platform-select-option[data-value="' + currentValue + '"]');
      if (selected) {
        selected.classList.add('selected');
        const valueSpan = trigger && trigger.querySelector('.platform-select-value');
        if (valueSpan) {
          valueSpan.textContent = selected.querySelector('span').textContent;
          valueSpan.classList.remove('text-gray-500');
          valueSpan.classList.add('text-gray-900');
        }
      } else {
        hiddenInput.value = '';
      }
    }
  }

  function bindFormOptions(root) {
    const scope = root || document;
    const config = loadConfig();

    scope.querySelectorAll('#beaconTemplate').forEach(function (select) {
      populateSelect(select, config.templates, '-- Select Template --');
    });

    scope.querySelectorAll('#beaconCampaignDspSelected').forEach(function (select) {
      populateSelect(select, config.dspPlatforms, '-- Select DSP --');
    });

    scope.querySelectorAll('#beaconCampaignAdServerSelected').forEach(function (select) {
      populateSelect(select, config.adServerPlatforms, '-- Select Ad Server --');
    });

    scope.querySelectorAll('#beaconMultiviewTactic').forEach(function (select) {
      populateSelect(select, config.tactics, '-- Select --');
    });

    scope.querySelectorAll('#beaconMultiviewClassification').forEach(function (field) {
      if (field.tagName === 'SELECT') {
        populateSelect(field, config.mvClassifications, '-- Select --');
      } else {
        populateDatalist(field, config.mvClassifications, 'beacon_mv_classification_options');
      }
    });

    scope.querySelectorAll('#dspDropdownMenu').forEach(function () {
      populateCustomPlatformMenu('dspDropdownMenu', 'dspDropdown', config.dspPlatforms, '-- Select DSP --');
    });

    scope.querySelectorAll('#adServerDropdownMenu').forEach(function () {
      populateCustomPlatformMenu('adServerDropdownMenu', 'adServerDropdown', config.adServerPlatforms, '-- Select Ad Server --');
    });
  }

  function renderDropdownValuesConsole() {
    const tab = document.getElementById('dropdown-values');
    if (!tab) return;

    tab.querySelectorAll('.content-card').forEach(function (card) {
      card.style.display = 'none';
    });

    let host = document.getElementById('beaconDropdownConfigHost');
    if (!host) {
      host = document.createElement('div');
      host.id = 'beaconDropdownConfigHost';
      tab.appendChild(host);
    }

    const categories = [
      { key: 'dspPlatforms', title: 'DSP Platforms', description: 'Used for platform selection in wizard flows' },
      { key: 'adServerPlatforms', title: 'Ad Server Platforms', description: 'Used for platform selection in wizard flows' },
      { key: 'templates', title: 'Templates', description: 'Campaign and Ad Group template choices' },
      { key: 'mvClassifications', title: 'MV Classifications', description: 'Classification options for Ad Groups' },
      { key: 'tactics', title: 'Tactics', description: 'Tactic options for Ad Groups' }
    ];

    function openEditor(category) {
      let overlay = document.getElementById('beaconDropdownEditorModal');
      if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'beaconDropdownEditorModal';
        overlay.className = 'modal-overlay active';
        overlay.innerHTML = [
          '<div class="modal" style="max-width:680px;">',
          '<div class="modal-header">',
          '<h2 id="beaconDropdownEditorTitle">Edit Options</h2>',
          '<button class="modal-close" id="beaconDropdownEditorClose"><i class="fas fa-times"></i></button>',
          '</div>',
          '<div class="modal-body">',
          '<p class="form-help" id="beaconDropdownEditorHelp" style="margin-bottom:12px;">Enter one option per line.</p>',
          '<textarea id="beaconDropdownEditorTextarea" class="form-input form-textarea" style="min-height:260px;"></textarea>',
          '</div>',
          '<div class="modal-footer">',
          '<button class="btn btn-secondary" id="beaconDropdownEditorCancel">Cancel</button>',
          '<button class="btn btn-primary" id="beaconDropdownEditorSave">Save Options</button>',
          '</div>',
          '</div>'
        ].join('');
        document.body.appendChild(overlay);

        overlay.addEventListener('click', function (event) {
          if (event.target === overlay) overlay.classList.remove('active');
        });

        overlay.querySelector('#beaconDropdownEditorClose').addEventListener('click', function () {
          overlay.classList.remove('active');
        });

        overlay.querySelector('#beaconDropdownEditorCancel').addEventListener('click', function () {
          overlay.classList.remove('active');
        });

        overlay.querySelector('#beaconDropdownEditorSave').addEventListener('click', function () {
          const targetKey = overlay.dataset.targetKey;
          const text = overlay.querySelector('#beaconDropdownEditorTextarea').value || '';
          const options = text.split('\n').map(function (line) { return line.trim(); }).filter(Boolean);
          setOptions(targetKey, options);
          overlay.classList.remove('active');
          render();
          if (typeof showToast === 'function') {
            showToast({ message: 'Saved ' + options.length + ' options.', type: 'success', duration: 2500 });
          }
        });
      }

      const config = loadConfig();
      overlay.dataset.targetKey = category.key;
      overlay.querySelector('#beaconDropdownEditorTitle').textContent = 'Edit ' + category.title;
      overlay.querySelector('#beaconDropdownEditorHelp').textContent = category.description + ' Enter one option per line.';
      overlay.querySelector('#beaconDropdownEditorTextarea').value = (config[category.key] || []).join('\n');
      overlay.classList.add('active');
    }

    function render() {
      const config = loadConfig();
      host.innerHTML = '';

      categories.forEach(function (category) {
        const card = document.createElement('div');
        card.className = 'content-card';

        const values = Array.isArray(config[category.key]) ? config[category.key] : [];
        const listItems = values.length
          ? values.map(function (value) {
              return '<div class="dropdown-value-item"><span>' + value + '</span></div>';
            }).join('')
          : '<div class="dropdown-value-item"><span class="text-gray-400">No options configured</span></div>';

        card.innerHTML = [
          '<div class="card-header">',
          '<div>',
          '<div class="card-title">' + category.title + '</div>',
          '<div class="card-description">' + category.description + '</div>',
          '</div>',
          '<button class="btn btn-primary btn-sm" data-edit-key="' + category.key + '"><i class="fas fa-edit"></i> Edit Options</button>',
          '</div>',
          '<div class="card-content" style="padding: 14px;">',
          '<div class="dropdown-values">',
          listItems,
          '</div>',
          '</div>'
        ].join('');

        const button = card.querySelector('button[data-edit-key]');
        button.addEventListener('click', function () {
          openEditor(category);
        });

        host.appendChild(card);
      });
    }

    render();
  }

  const api = {
    KEY: KEY,
    DEFAULT_CONFIG: deepClone(DEFAULT_CONFIG),
    ensureConfig: ensureConfig,
    loadConfig: loadConfig,
    saveConfig: saveConfig,
    getOptions: getOptions,
    setOptions: setOptions,
    bindFormOptions: bindFormOptions,
    renderDropdownValuesConsole: renderDropdownValuesConsole
  };

  window.beaconAdminConfig = api;

  document.addEventListener('DOMContentLoaded', function () {
    ensureConfig();
    bindFormOptions(document);
    if (window.location.pathname.indexOf('Admin_Configuration_Console.html') !== -1) {
      renderDropdownValuesConsole();
    }
  });

  window.addEventListener('beacon-admin-config-changed', function () {
    bindFormOptions(document);
  });
})();
