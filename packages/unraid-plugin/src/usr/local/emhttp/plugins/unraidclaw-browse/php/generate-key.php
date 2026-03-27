<?php
/* Generate or set a custom API key - supports GET and POST */
error_reporting(E_ALL);
ini_set('display_errors', '0');

// Ensure we always output JSON
ob_start();
header('Content-Type: application/json');

function respond($data) {
    ob_end_clean();
    echo json_encode($data);
    exit;
}

try {
    $plugin = 'unraidclaw-browse';
    $cfgFile = '/boot/config/plugins/' . $plugin . '/' . $plugin . '.cfg';

    // Get action
    $action = isset($_GET['action']) ? $_GET['action'] : (isset($_POST['action']) ? $_POST['action'] : 'generate');

    if ($action === 'custom') {
        // Use custom key provided by user
        $customKey = isset($_GET['key']) ? $_GET['key'] : (isset($_POST['key']) ? $_POST['key'] : '');
        $customKey = trim($customKey);

        if (empty($customKey)) {
            respond(['error' => 'No key provided', 'success' => false]);
        }

        if (strlen($customKey) < 16) {
            respond(['error' => 'Key too short (min 16 chars)', 'success' => false]);
        }

        $hash = hash('sha256', $customKey);
    } else {
        // Generate a 32-byte random key
        $rawKey = bin2hex(random_bytes(32));
        $hash = hash('sha256', $rawKey);
    }

    // Read current config
    $cfg = [];
    if (file_exists($cfgFile)) {
        $raw = @file_get_contents($cfgFile);
        if ($raw === false) {
            respond(['error' => 'Cannot read config: ' . $cfgFile]);
        }
        $lines = explode("\n", $raw);
        foreach ($lines as $line) {
            $line = trim($line);
            if (empty($line) || $line[0] === '#') continue;
            $eqPos = strpos($line, '=');
            if ($eqPos !== false) {
                $key = trim(substr($line, 0, $eqPos));
                $val = trim(substr($line, $eqPos + 1), " \t\n\r\0\x0B\"'");
                $cfg[$key] = $val;
            }
        }
    }

    // Update hash
    $cfg['API_KEY_HASH'] = $hash;

    // Write back
    $content = '';
    foreach ($cfg as $key => $value) {
        $content .= $key . '="' . $value . '"' . "\n";
    }

    $dir = dirname($cfgFile);
    if (!is_dir($dir)) {
        if (!@mkdir($dir, 0755, true)) {
            respond(['error' => 'Cannot create dir: ' . $dir, 'success' => false]);
        }
    }

    $result = @file_put_contents($cfgFile, $content);
    if ($result === false) {
        respond(['error' => 'Cannot write: ' . $cfgFile . ' (perms: ' . decoct(@fileperms($dir) & 0777) . ')', 'success' => false]);
    }

    if ($action === 'custom') {
        respond(['success' => true, 'message' => 'Custom key saved']);
    } else {
        respond(['key' => $rawKey, 'hash_prefix' => substr($hash, 0, 16)]);
    }

} catch (Exception $e) {
    respond(['error' => 'Exception: ' . $e->getMessage(), 'success' => false]);
} catch (Error $e) {
    respond(['error' => 'PHP Error: ' . $e->getMessage(), 'success' => false]);
}

// Fallback - should never reach here
ob_end_clean();
echo json_encode(['error' => 'Unexpected flow', 'success' => false]);
