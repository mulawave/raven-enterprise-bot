Write-Host "Cleaning Next.js caches..."

Remove-Item -Recurse -Force -ErrorAction SilentlyContinue admin-console\.next
Remove-Item -Recurse -Force -ErrorAction SilentlyContinue dashboard\.next

Write-Host "Next.js caches cleaned"
