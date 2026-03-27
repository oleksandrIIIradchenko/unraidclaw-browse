<?php
error_reporting(E_ALL);
ini_set('display_errors', '0');

ob_start();
header('Content-Type: application/json');

function respond(array $data, int $code = 200): void {
    http_response_code($code);
    if (ob_get_level() > 0) {
        ob_end_clean();
    }
    echo json_encode($data);
    exit;
}

try {
    $plugin = 'unraidclaw-browse';
    $cfgFile = '/boot/config/plugins/' . $plugin . '/' . $plugin . '.cfg';

    if ($action !== 'generate' && $action !== 'custom') {
        respond(['success' => false, 'error' => 'Unsupported action'], 400);
    }

    $cfg = [];
    if (file_exists($cfgFile)) {
        $raw = @file_get_contents($cfgFile);
        if ($raw === false) {
            respond(['success' => false, 'error' => 'Cannot read config: ' . $cfgFile], 500);
        }

        foreach (explode("\n", $raw) as $line) {
            $line = trim($line);
            if ($line === '' || $line[0] === '#') {
                continue;
            }

            $eqPos = strpos($line, '=');
            if ($eqPos === false) {
                continue;
            }

            $key = trim(substr($line, 0, $eqPos));
            $val = trim(substr($line, $eqPos + 1), " \t\n\r\0\x0B\"'");
            $cfg[$key] = $val;
        }
    }

    if ($action === 'custom') {
        $customKey = trim($_GET['key'] ?? $_POST['key'] ?? '');
        if ($customKey === '') {
            respond(['success' => false, 'error' => 'No key provided'], 400);
        }
        if (strlen($customKey) < 16) {
            respond(['success' => false, 'error' => 'Key too short (min 16 chars)'], 400);
        }

        $plainKey = $customKey;
        $hash = hash('sha256', $customKey);
    } else {
        $plainKey = bin2hex(random_bytes(32));
        $hash = hash('sha256', $plainKey);
    }

    $cfg['API_KEY_HASH'] = $hash;

    $dir = dirname($cfgFile);
    if (!is_dir($dir) && !@mkdir($dir, 0755, true)) {
        respond(['success' => false, 'error' => 'Cannot create dir: ' . $dir], 500);
    }

    $content = '';
    foreach ($cfg as $key => $value) {
        $content .= $key . '="' . $value . '"' . "\n";
    }

    if (@file_put_contents($cfgFile, $content) === false) {
        respond(['success' => false, 'error' => 'Cannot write: ' . $cfgFile], 500);
    }

    if ($action === 'custom') {
        respond([
            'success' => true,
            'message' => 'Custom key saved',
            'hash_prefix' => substr($hash, 0, 16),
        ]);
    }

    respond([
        'success' => true,
        'key' => $plainKey,
        'hash_prefix' => substr($hash, 0, 16),
    ]);
} catch (Throwable $e) {
    respond(['success' => false, 'error' => $e->getMessage()], 500);
}
