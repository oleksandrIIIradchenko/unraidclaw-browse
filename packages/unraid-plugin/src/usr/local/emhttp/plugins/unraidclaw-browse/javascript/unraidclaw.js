/* UnraidClaw Browse - WebGUI JavaScript v3 */

var OCC_PRESETS = {
  'read-only': [
    'docker:read','vms:read','array:read','disk:read','share:read',
    'info:read','services:read','notification:read',
    'network:read','me:read','logs:read'
  ],
  'docker-manager': [
    'docker:read','docker:create','docker:update','docker:delete',
    'info:read','logs:read'
  ],
  'vm-manager': [
    'vms:read','vms:update','vms:delete',
    'info:read','logs:read'
  ],
  'full-admin': null,
  'none': []
};

var OCC_CATEGORIES = {
  'docker': ['docker:read','docker:create','docker:update','docker:delete'],
  'vms': ['vms:read','vms:update','vms:delete'],
  'storage': ['array:read','array:update','disk:read','share:read','share:update'],
  'system': ['info:read','os:update','services:read'],
  'notification': ['notification:read','notification:create','notification:update','notification:delete'],
  'network': ['network:read'],
  'users': ['me:read'],
  'logs': ['logs:read']
};

function occGetCsrf() {
  var el = document.getElementById('occ-app');
  return el ? el.getAttribute('data-csrf') || '' : '';
}

function occEscapeHtml(text) {
  if (text === null || text === undefined) return '';
  var div = document.createElement('div');
  div.appendChild(document.createTextNode(String(text)));
  return div.innerHTML;
}

function occSetInlineStatus(id, kind, message, autoDismissMs) {
  var el = typeof id === 'string' ? document.getElementById(id) : id;
  if (!el) return;
  el.className = 'occ-inline-status occ-inline-status-' + kind;
  el.textContent = message;
  if (el._occTimer) clearTimeout(el._occTimer);
  if (autoDismissMs) {
    el._occTimer = setTimeout(function() {
      el.textContent = '';
      el.className = 'occ-inline-status';
    }, autoDismissMs);
  }
}

function occRenderServiceActions(isRunning) {
  var actions = document.getElementById('occ-service-actions');
  if (!actions) return;
  if (isRunning) {
    actions.innerHTML = '<button class="occ-btn occ-btn-danger" onclick="occServiceControl(\'stop\', event)">Stop</button>' +
      '<button class="occ-btn occ-btn-warning" onclick="occServiceControl(\'restart\', event)">Restart</button>';
  } else {
    actions.innerHTML = '<button class="occ-btn occ-btn-success" onclick="occServiceControl(\'start\', event)">Start</button>';
  }
}

function occApplyServiceState(service) {
  if (!service) return;
  var badge = document.getElementById('occ-service-status');
  if (badge) {
    badge.textContent = service.isRunning ? 'Running' : 'Stopped';
    badge.className = service.isRunning ? 'occ-badge occ-badge-ok' : 'occ-badge occ-badge-stopped';
    if (!service.isRunning && service.statusText && service.statusText !== 'stopped') {
      badge.title = service.statusText;
    } else {
      badge.removeAttribute('title');
    }
  }
  occRenderServiceActions(service.isRunning);
}

function occUpdateKeyStatus(hashPrefix, hintText) {
  var currentKey = document.getElementById('occ-current-key-status');
  var dashboardKey = document.getElementById('occ-dashboard-key-status');
  if (currentKey) {
    if (hashPrefix) {
      currentKey.innerHTML = '<span class="occ-badge occ-badge-ok">Active</span><span class="occ-hint">' + occEscapeHtml(hintText || ('SHA-256: ' + hashPrefix + '...')) + '</span>';
    } else {
      currentKey.innerHTML = '<em>No key configured</em>';
    }
  }
  if (dashboardKey) {
    dashboardKey.innerHTML = hashPrefix ? 'Configured' : '<em>Not configured</em>';
  }
}

function occResetGeneratedKeyDisplay() {
  var display = document.getElementById('occ-key-display');
  var keyInput = document.getElementById('occ-new-key');
  if (keyInput) {
    keyInput.value = '';
    keyInput.style.color = '#51cf66';
  }
  if (display) display.style.display = 'none';
}

function occServiceControl(action, evt) {
  var btn = evt && evt.target ? evt.target : null;
  var originalText = btn ? btn.textContent : '';
  if (btn) {
    btn.disabled = true;
    btn.textContent = action === 'restart' ? 'Restarting...' : (action.charAt(0).toUpperCase() + action.slice(1) + 'ing...');
  }
  occSetInlineStatus('occ-service-feedback', 'info', 'Checking live service state...', 0);

  var xhr = new XMLHttpRequest();
  xhr.open('GET', '/plugins/unraidclaw-browse/php/service-control.php?action=' + encodeURIComponent(action), true);
  xhr.onreadystatechange = function() {
    if (xhr.readyState !== 4) return;
    if (btn) {
      btn.disabled = false;
      btn.textContent = originalText;
    }

    var resp = null;
    try {
      resp = xhr.responseText ? JSON.parse(xhr.responseText) : null;
    } catch (e) {}

    if (xhr.status === 200 && resp && resp.success) {
      occApplyServiceState(resp.service);
      occSetInlineStatus('occ-service-feedback', 'success', 'Service ' + action + ' completed. Live state: ' + (resp.service && resp.service.isRunning ? 'running' : 'stopped') + '.', 5000);
      return;
    }

    occApplyServiceState(resp && resp.service ? resp.service : null);
    var message = resp && resp.error ? resp.error : (resp && resp.output ? resp.output : 'Service ' + action + ' failed');
    occSetInlineStatus('occ-service-feedback', 'error', message, 5000);
  };
  xhr.send();
}

function occGenerateKey() {
  if (!confirm('Generate a new API key? The old key will be invalidated.')) return;

  var display = document.getElementById('occ-key-display');
  var keyInput = document.getElementById('occ-new-key');
  var customStatus = document.getElementById('occ-custom-key-status');
  var customKeyInput = document.getElementById('occ-custom-key');

  if (display) display.style.display = 'block';
  if (keyInput) {
    keyInput.value = 'Generating...';
    keyInput.style.color = '#aaa';
  }
  if (customKeyInput) customKeyInput.value = '';
  if (customStatus) {
    customStatus.textContent = '';
    customStatus.className = 'occ-inline-status';
  }

  var xhr = new XMLHttpRequest();
  xhr.open('GET', '/plugins/unraidclaw-browse/php/generate-key.php?action=generate&csrf_token=' + encodeURIComponent(occGetCsrf()), true);
  xhr.onreadystatechange = function() {
    if (xhr.readyState !== 4) return;

    var raw = xhr.responseText || '';
    var resp = null;
    try {
      resp = raw ? JSON.parse(raw) : null;
    } catch (e) {}

    if (xhr.status === 200 && resp && resp.success && resp.key) {
      if (keyInput) {
        keyInput.value = resp.key;
        keyInput.style.color = '#51cf66';
      }
      occUpdateKeyStatus(resp.hash_prefix, 'SHA-256: ' + resp.hash_prefix + '...');
      occSetInlineStatus('occ-custom-key-status', 'success', 'New key generated and saved. Copy it now; it will not be shown again.', 5000);
      return;
    }

    if (keyInput) {
      keyInput.value = 'Error: ' + ((resp && resp.error) || ('HTTP ' + xhr.status));
      keyInput.style.color = '#ff6b6b';
    }
    occSetInlineStatus('occ-custom-key-status', 'error', (resp && resp.error) || 'Failed to generate key', 5000);
  };
  xhr.send();
}

function occCopyKey() {
  var input = document.getElementById('occ-new-key');
  if (!input || !input.value) return;
  input.select();
  document.execCommand('copy');
}

function occSaveCustomKey() {
  var customKeyInput = document.getElementById('occ-custom-key');
  var customKey = customKeyInput ? customKeyInput.value.trim() : '';

  if (!customKey) {
    occSetInlineStatus('occ-custom-key-status', 'error', 'Please enter a key.', 5000);
    return;
  }
  if (customKey.length < 16) {
    occSetInlineStatus('occ-custom-key-status', 'error', 'Key seems too short.', 5000);
    return;
  }

  occSetInlineStatus('occ-custom-key-status', 'info', 'Saving custom key...', 0);

  var xhr = new XMLHttpRequest();
  xhr.open('GET', '/plugins/unraidclaw-browse/php/generate-key.php?action=custom&key=' + encodeURIComponent(customKey) + '&csrf_token=' + encodeURIComponent(occGetCsrf()), true);
  xhr.onreadystatechange = function() {
    if (xhr.readyState !== 4) return;

    var resp = null;
    try {
      resp = xhr.responseText ? JSON.parse(xhr.responseText) : null;
    } catch (e) {}

    if (xhr.status === 200 && resp && resp.success) {
      if (customKeyInput) customKeyInput.value = '';
      occResetGeneratedKeyDisplay();
      occUpdateKeyStatus(resp.hash_prefix, 'SHA-256: ' + resp.hash_prefix + '...');
      occSetInlineStatus('occ-custom-key-status', 'success', 'Custom key saved successfully.', 5000);
      return;
    }

    occSetInlineStatus('occ-custom-key-status', 'error', (resp && resp.error) || ('HTTP ' + xhr.status), 5000);
  };
  xhr.send();
}

function occApplyPreset(name) {
  var preset = OCC_PRESETS[name];
  var checkboxes = document.querySelectorAll('#occ-permissions-form input[type="checkbox"]');
  for (var i = 0; i < checkboxes.length; i++) {
    checkboxes[i].checked = preset === null ? true : preset.indexOf(checkboxes[i].name) !== -1;
  }
  occUpdatePermissionSummaries();
}

function occSetCategory(cat, value) {
  var keys = OCC_CATEGORIES[cat];
  if (!keys) return;
  for (var i = 0; i < keys.length; i++) {
    var cb = document.querySelector('input[name="' + keys[i] + '"]');
    if (cb) cb.checked = value;
  }
  occUpdatePermissionSummaries();
}

function occToggleCategory(header) {
  header.classList.toggle('expanded');
  var body = header.nextElementSibling;
  body.style.display = body.style.display === 'none' ? 'block' : 'none';
}

function occUpdatePermissionSummaries() {
  for (var cat in OCC_CATEGORIES) {
    var keys = OCC_CATEGORIES[cat];
    var enabled = 0;
    for (var i = 0; i < keys.length; i++) {
      var cb = document.querySelector('input[name="' + keys[i] + '"]');
      if (cb && cb.checked) enabled++;
    }
    var summaryEl = document.querySelector('[data-category="' + cat + '"]');
    if (summaryEl) summaryEl.textContent = enabled + '/' + keys.length;
  }
}

function occSavePermissions() {
  var permissions = {};
  var checkboxes = document.querySelectorAll('#occ-permissions-form input[type="checkbox"]');
  for (var i = 0; i < checkboxes.length; i++) {
    permissions[checkboxes[i].name] = checkboxes[i].checked;
  }

  occSetInlineStatus('occ-perm-status', 'info', 'Saving permissions...', 0);

  var xhr = new XMLHttpRequest();
  xhr.open('GET', '/plugins/unraidclaw-browse/php/save-permissions.php?data=' + encodeURIComponent(JSON.stringify(permissions)), true);
  xhr.onreadystatechange = function() {
    if (xhr.readyState !== 4) return;
    var resp = null;
    try {
      resp = xhr.responseText ? JSON.parse(xhr.responseText) : null;
    } catch (e) {}

    if (xhr.status === 200 && resp && resp.success) {
      occSetInlineStatus('occ-perm-status', 'success', resp.message + ' (' + resp.count + ' enabled)', 5000);
      return;
    }

    occSetInlineStatus('occ-perm-status', 'error', (resp && resp.error) || ('Error saving permissions (HTTP ' + xhr.status + ')'), 5000);
  };
  xhr.send();
}

function occRenderLogRows(entries) {
  var tbody = document.getElementById('occ-log-body');
  if (!tbody) return;
  var html = '';
  for (var i = entries.length - 1; i >= 0; i--) {
    var e = entries[i] || {};
    var statusCode = typeof e.statusCode === 'number' ? e.statusCode : 0;
    var statusClass = '';
    if (statusCode >= 200 && statusCode < 300) statusClass = 'occ-status-2xx';
    else if (statusCode >= 400 && statusCode < 500) statusClass = 'occ-status-4xx';
    else if (statusCode >= 500) statusClass = 'occ-status-5xx';

    html += '<tr class="occ-log-row">' +
      '<td>' + occEscapeHtml(e.timestamp) + '</td>' +
      '<td>' + occEscapeHtml(e.method) + '</td>' +
      '<td>' + occEscapeHtml(e.path) + '</td>' +
      '<td>' + occEscapeHtml(e.resource) + '</td>' +
      '<td class="' + statusClass + '">' + occEscapeHtml(statusCode || '-') + '</td>' +
      '<td>' + occEscapeHtml((e.durationMs || 0) + 'ms') + '</td>' +
      '<td>' + occEscapeHtml(e.ip) + '</td>' +
      '</tr>';
  }
  tbody.innerHTML = html;
}

function occRenderLogState(kind, message) {
  var tbody = document.getElementById('occ-log-body');
  if (!tbody) return;
  var cls = 'occ-log-state occ-log-state-' + kind;
  tbody.innerHTML = '<tr><td colspan="7"><div class="' + cls + '">' + message + '</div></td></tr>';
}

function occRefreshLog() {
  var limit = document.getElementById('occ-log-limit');
  var maxLines = limit ? parseInt(limit.value, 10) : 100;
  occRenderLogState('loading', 'Loading activity log...');

  var xhr = new XMLHttpRequest();
  xhr.open('GET', '/plugins/unraidclaw-browse/php/read-log.php?limit=' + maxLines, true);
  xhr.onreadystatechange = function() {
    if (xhr.readyState !== 4) return;

    var resp = null;
    try {
      resp = xhr.responseText ? JSON.parse(xhr.responseText) : null;
    } catch (e) {}

    if (xhr.status === 200 && resp && resp.success) {
      if (!resp.entries || !resp.entries.length) {
        occRenderLogState('empty', occEscapeHtml(resp.message || 'No log entries yet.'));
        return;
      }
      occRenderLogRows(resp.entries);
      return;
    }

    occRenderLogState('error', occEscapeHtml((resp && resp.message) || ('Error loading log (HTTP ' + xhr.status + ')')));
  };
  xhr.send();
}

function occClearLog() {
  if (!confirm('Clear the activity log?')) return;
  occRenderLogState('loading', 'Clearing activity log...');

  var xhr = new XMLHttpRequest();
  xhr.open('GET', '/plugins/unraidclaw-browse/php/clear-log.php', true);
  xhr.onreadystatechange = function() {
    if (xhr.readyState !== 4) return;
    if (xhr.status === 200) {
      occRefreshLog();
      return;
    }
    occRenderLogState('error', 'Failed to clear activity log (HTTP ' + xhr.status + ').');
  };
  xhr.send();
}

function occFilterLog() {
  var filterInput = document.getElementById('occ-log-filter');
  var filter = filterInput ? filterInput.value.toLowerCase() : '';
  var rows = document.querySelectorAll('.occ-log-row');
  for (var i = 0; i < rows.length; i++) {
    rows[i].style.display = rows[i].textContent.toLowerCase().indexOf(filter) !== -1 ? '' : 'none';
  }
}

function occLoadRecentActivity() {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', '/plugins/unraidclaw-browse/php/read-log.php?limit=10', true);
  xhr.onreadystatechange = function() {
    if (xhr.readyState !== 4) return;
    var container = document.getElementById('occ-recent-activity');
    if (!container) return;

    var resp = null;
    try {
      resp = xhr.responseText ? JSON.parse(xhr.responseText) : null;
    } catch (e) {}

    if (xhr.status !== 200 || !resp || !resp.success) {
      container.innerHTML = '<em>Unable to load recent activity</em>';
      return;
    }

    var entries = resp.entries || [];
    if (!entries.length) {
      container.innerHTML = '<em>No recent activity</em>';
      return;
    }

    var html = '<table class="occ-recent-table"><thead><tr><th>Time</th><th>Method</th><th>Path</th><th>Status</th></tr></thead><tbody>';
    for (var i = entries.length - 1; i >= 0; i--) {
      var e = entries[i];
      var t = e.timestamp || '';
      var m = t.match(/T(\d{2}:\d{2}:\d{2})/);
      var shortT = m ? m[1] : t.substring(11, 19);
      var statusCls = e.statusCode >= 200 && e.statusCode < 300 ? 'occ-status-2xx' : (e.statusCode >= 400 ? 'occ-status-4xx' : '');
      html += '<tr><td>' + occEscapeHtml(shortT) + '</td><td>' + occEscapeHtml(e.method) + '</td><td>' + occEscapeHtml(e.path) + '</td><td class="' + statusCls + '">' + occEscapeHtml(e.statusCode) + '</td></tr>';
    }
    html += '</tbody></table>';
    container.innerHTML = html;
  };
  xhr.send();
}

function occSaveSettings(e) {
  e.preventDefault();
  var form = document.getElementById('occ-settings-form');
  var btn = document.getElementById('occ-apply-btn');

  btn.disabled = true;
  btn.textContent = 'Saving...';
  occSetInlineStatus('occ-settings-status', 'info', 'Saving settings...', 0);

  var params = ['ajax=1'];
  var inputs = form.querySelectorAll('input[name], select[name]');
  for (var i = 0; i < inputs.length; i++) {
    var inp = inputs[i];
    if (inp.name && inp.name !== 'csrf_token' && inp.name !== 'UNRAID_WEBUI_PORT') {
      params.push(encodeURIComponent(inp.name) + '=' + encodeURIComponent(inp.value));
    }
  }
  var webUiPort = form.querySelector('input[name="UNRAID_WEBUI_PORT"]');
  if (webUiPort) params.push('UNRAID_WEBUI_PORT=' + encodeURIComponent(webUiPort.value));

  var xhr = new XMLHttpRequest();
  xhr.open('GET', '/plugins/unraidclaw-browse/php/save-settings.php?' + params.join('&'), true);
  xhr.onreadystatechange = function() {
    if (xhr.readyState !== 4) return;

    btn.disabled = false;
    btn.textContent = 'Apply';

    var resp = null;
    try {
      resp = xhr.responseText ? JSON.parse(xhr.responseText) : null;
    } catch (e2) {}

    if (xhr.status === 200 && resp && resp.success) {
      occApplyServiceState(resp.service);
      var unraidApiInput = document.getElementById('occ-unraid-api-key');
      var unraidApiBadge = document.getElementById('occ-unraid-api-key-badge');
      if (unraidApiInput) {
        unraidApiInput.value = '';
        unraidApiInput.placeholder = resp.hasUnraidApiKey ? '(key configured - leave blank to keep)' : 'Enter Unraid API key';
      }
      if (unraidApiBadge) {
        unraidApiBadge.innerHTML = resp.hasUnraidApiKey ? '<span class="occ-badge occ-badge-ok" style="margin-left:8px">Configured</span>' : '';
      }
      occSetInlineStatus('occ-settings-status', 'success', resp.message + ' Service is now ' + (resp.service && resp.service.isRunning ? 'running.' : 'stopped.'), 5000);
      return;
    }

    occApplyServiceState(resp && resp.service ? resp.service : null);
    occSetInlineStatus('occ-settings-status', 'error', (resp && resp.message) || ('Error saving settings (HTTP ' + xhr.status + ')'), 5000);
  };
  xhr.send();
  return false;
}

function occResetDefaults() {
  if (!confirm('Reset all settings to defaults?')) return;
  var form = document.getElementById('occ-settings-form');
  if (form) form.reset();
  occResetGeneratedKeyDisplay();
  occSetInlineStatus('occ-custom-key-status', 'info', 'Form reset. Defaults are shown locally until you save.', 5000);
}
