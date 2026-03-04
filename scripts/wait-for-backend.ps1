Write-Host "Waiting for backend..."

for ($i=0; $i -lt 30; $i++) {
  try {
    $response = Invoke-WebRequest http://localhost:4000/health -UseBasicParsing -TimeoutSec 2
    if ($response.StatusCode -eq 200) {
      Write-Host "Backend ready!"
      exit 0
    }
  } catch {}

  Start-Sleep -Seconds 2
}

Write-Host "Backend failed to start"
exit 1
