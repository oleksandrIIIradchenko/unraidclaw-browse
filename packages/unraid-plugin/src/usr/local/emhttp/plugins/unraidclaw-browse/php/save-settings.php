<?php
$plugin = 'unraidclaw-browse';
$cfgFile = "/boot/config/plugins/${plugin}/${plugin}.cfg";
$fields = ['SERVICE', 'PORT', 'HOST', 'GRAPHQL_URL', 'UNRAID_API_KEY', 'MAX_LOG_SIZE'];
$input = !empty($_GET) ? $_GET : $_POST;
$isAjax = isset($input['ajax']);

function readCfgFile(string $cfgFile): array {
    $cfg = [];
    if (!file_exists($cfgFile)) {
        return $cfg;
    }

    $lines = @file($cfgFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if (!$lines) {
        return $cfg;
    }

    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || $line[0] === '#') {
            continue;
        }

        $parts = explode('=', $line, 2);
        if (count($parts) !== 2) {
            continue;
        }

        $key = trim($parts[0]);
        $val = trim($parts[1], " \t\n\r\0\x0B\"'");
        $cfg[$key] = $val;
    }

    return $cfg;
}

function getServiceState(string $plugin): array {
    $statusOutput = [];
    $statusCode = 0;
    exec("/etc/rc.d/rc.{$plugin} status 2>&1", $statusOutput, $statusCode);
    $rawStatus = trim(implode("\n", $statusOutput));
    $isRunning = $rawStatus === 'running';

    return [
        'isRunning' => $isRunning,
        'statusText' => $isRunning ? 'running' : ($rawStatus !== '' ? $rawStatus : 'stopped'),
        'statusCode' => $statusCode,
    ];
}

if ($isAjax) {
    header('Content-Type: application/json');
}

$cfg = readCfgFile($cfgFile);
foreach ($fields as $field) {
    if (!isset($input[$field])) {
        continue;
    }

    if ($field === 'UNRAID_API_KEY' && $input[$field] === '') {
        continue;
    }

    $cfg[$field] = $input[$field];
}

if (isset($cfg['PORT'])) {
    $port = (int) $cfg['PORT'];
    if ($port < 1024 || $port > 65535) {
        $cfg['PORT'] = '9876';
    }
}

if (isset($input['UNRAID_WEBUI_PORT'])) {
    $webPort = (int) $input['UNRAID_WEBUI_PORT'];
    if ($webPort > 0 && $webPort <= 65535) {
        $cfg['GRAPHQL_URL'] = $webPort === 80
            ? 'http://localhost/graphql'
            : "http://localhost:{$webPort}/graphql";
    }
}

$dir = dirname($cfgFile);
if (!is_dir($dir)) {
    @mkdir($dir, 0755, true);
}

$content = '';
foreach ($cfg as $key => $value) {
    $content .= "{$key}=\"{$value}\"\n";
}

$writeResult = @file_put_contents($cfgFile, $content);
if ($writeResult !== false) {
    @chmod($cfgFile, 0600);
}

$serviceOutput = [];
$serviceCode = 0;
if (($cfg['SERVICE'] ?? 'disable') === 'enable') {
    exec("/etc/rc.d/rc.{$plugin} restart 2>&1", $serviceOutput, $serviceCode);
} else {
    exec("/etc/rc.d/rc.{$plugin} stop 2>&1", $serviceOutput, $serviceCode);
}

$serviceState = getServiceState($plugin);

if ($isAjax) {
    echo json_encode([
        'success' => $writeResult !== false,
        'service' => $serviceState,
        'serviceOutput' => implode("\n", $serviceOutput),
        'serviceCode' => $serviceCode,
        'hasUnraidApiKey' => !empty($cfg['UNRAID_API_KEY']),
        'hasPluginApiKey' => !empty($cfg['API_KEY_HASH']),
        'message' => $writeResult !== false ? 'Settings saved successfully' : 'Failed to write configuration file',
    ]);
} else {
    header("Location: /Settings/{$plugin}.settings");
}
