<?php
header('Content-Type: application/json');

$plugin = 'unraidclaw-browse';
$action = $_GET['action'] ?? $_POST['action'] ?? '';
$allowed = ['start', 'stop', 'restart'];

function getServiceState(string $plugin): array {
    $statusOutput = [];
    $statusCode = 0;
    exec("/etc/rc.d/rc.{$plugin} status 2>&1", $statusOutput, $statusCode);
    $statusText = trim(implode("\n", $statusOutput));
    $isRunning = $statusText === 'running';

    return [
        'isRunning' => $isRunning,
        'statusText' => $isRunning ? 'running' : ($statusText !== '' ? $statusText : 'stopped'),
        'statusCode' => $statusCode,
        'rawStatus' => $statusText,
    ];
}

if (!in_array($action, $allowed, true)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid action: ' . $action]);
    exit;
}

$output = [];
$returnCode = 0;
exec("/etc/rc.d/rc.{$plugin} {$action} 2>&1", $output, $returnCode);
$serviceState = getServiceState($plugin);

$success = $returnCode === 0;
if (!$success) {
    http_response_code(500);
}

echo json_encode([
    'success' => $success,
    'action' => $action,
    'returnCode' => $returnCode,
    'output' => implode("\n", $output),
    'service' => $serviceState,
]);
