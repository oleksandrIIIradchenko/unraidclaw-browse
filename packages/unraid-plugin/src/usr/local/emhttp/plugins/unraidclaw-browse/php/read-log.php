<?php
header('Content-Type: application/json');

$docroot = $docroot ?? $_SERVER['DOCUMENT_ROOT'] ?? '/usr/local/emhttp';
require_once "$docroot/webGui/include/Wrappers.php";

$logFile = '/boot/config/plugins/unraidclaw-browse/activity.jsonl';
$limit = isset($_GET['limit']) ? (int) $_GET['limit'] : 100;
$limit = max(1, min(1000, $limit));

if (!file_exists($logFile)) {
    echo json_encode([
        'success' => true,
        'entries' => [],
        'state' => 'empty',
        'message' => 'Log file has not been created yet.',
    ]);
    exit;
}

$lines = [];
$fp = @fopen($logFile, 'r');
if (!$fp) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'entries' => [],
        'state' => 'error',
        'message' => 'Unable to open log file.',
    ]);
    exit;
}

while (($line = fgets($fp)) !== false) {
    $line = trim($line);
    if ($line === '') {
        continue;
    }

    $lines[] = $line;
    if (count($lines) > $limit) {
        array_shift($lines);
    }
}
fclose($fp);

$entries = [];
foreach ($lines as $line) {
    $entry = json_decode($line, true);
    if (is_array($entry)) {
        $entries[] = $entry;
    }
}

$state = count($entries) > 0 ? 'ready' : 'empty';
$message = $state === 'ready' ? null : 'No activity has been recorded yet.';

echo json_encode([
    'success' => true,
    'entries' => $entries,
    'state' => $state,
    'message' => $message,
]);
