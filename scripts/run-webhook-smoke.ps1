param(
  [string]$Secret = $env:LEMON_SQUEEZY_WEBHOOK_SECRET
)

if (-not $Secret) {
  throw "LEMON_SQUEEZY_WEBHOOK_SECRET is not set. Export it in your shell or pass -Secret explicitly."
}

$body = '{"meta":{"event_name":"subscription_created","custom_data":{"user_id":"550e8400-e29b-41d4-a716-446655440000"}},"data":{"attributes":{"first_subscription_item":{"interval":"yearly"}}}}'
$secretBytes = [Text.Encoding]::UTF8.GetBytes($Secret)
$bodyBytes = [Text.Encoding]::UTF8.GetBytes($body)
$hasher = [System.Security.Cryptography.HMACSHA256]::new($secretBytes)
$hmac = [System.BitConverter]::ToString($hasher.ComputeHash($bodyBytes)).Replace("-", "").ToLower()
$hasher.Dispose()

Write-Output "Use this against a running local server:"
Write-Output "POST /api/webhooks/lemon-squeezy"
Write-Output "x-signature: $hmac"
Write-Output $body
