<?php
/* Clear activity log - supports GET and POST */
header('Content-Type: application/json');

// Require Unraid WebGUI authentication
$docroot = $docroot ?? $_SERVER['DOCUMENT_ROOT'] ?? '/usr/local/emhttp';
require_once "$docroot/webGui/include/Wrappers.php";

$logFile = '/boot/config/plugins/unraidclaw/activity.jsonl';

if (file_exists($logFile)) {
    file_put_contents($logFile, '');
    echo json_encode(['success' => true]);
} else {
    echo json_encode(['success' => true, 'message' => 'Log file does not exist']);
}
