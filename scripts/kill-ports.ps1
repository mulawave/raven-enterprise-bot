$ports = 3000,3001,4000

foreach ($port in $ports) {
  $process = netstat -ano | findstr :$port
  if ($process) {
    $processId = ($process -split "\s+")[-1]
    Write-Host "Killing process $processId on port $port"
    taskkill /PID $processId /F 2>$null | Out-Null
  }
}

Write-Host "Ports cleared"
