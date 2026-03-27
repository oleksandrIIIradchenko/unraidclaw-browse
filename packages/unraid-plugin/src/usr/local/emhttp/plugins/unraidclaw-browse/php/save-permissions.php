<?php
header('Content-Type: application/json');

$permFile = '/boot/config/plugins/unraidclaw-browse/permissions.json';
$raw = $_GET['data'] ?? file_get_contents('php://input');
$input = json_decode($raw ?? '', true);

if (!is_array($input)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid input']);
    exit;
}

$clean = [];
foreach ($input as $key => $value) {
    if (preg_match('/^[a-z_]+:[a-z]+$/', $key) && is_bool($value)) {
        $clean[$key] = $value;
    }
}

$dir = dirname($permFile);
if (!is_dir($dir) && !@mkdir($dir, 0755, true)) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Failed to create permissions directory']);
    exit;
}

$result = @file_put_contents($permFile, json_encode($clean, JSON_PRETTY_PRINT));
if ($result === false) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Failed to write permissions file']);
    exit;
}

@chmod($permFile, 0600);
$enabledCount = count(array_filter($clean));

echo json_encode([
    'success' => true,
    'count' => $enabledCount,
    'total' => count($clean),
    'message' => 'Permissions saved successfully',
]);
