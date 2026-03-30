param(
  [string]$Path = '.',
  [switch]$Strict,
  [switch]$IncludeBuildArtifacts
)

$resolvedPath = Resolve-Path -Path $Path -ErrorAction Stop

$allowedExtensions = @('.ts', '.tsx', '.js', '.jsx', '.css')
$ignoredPathFragments = @(
  '\.next\',
  '\node_modules\',
  '\dist\',
  '\build\',
  '\coverage\',
  '\android\app\build\',
  '\ios\build\'
)

$rules = @(
  @{
    Name = 'console.log'
    Pattern = 'console\.log\('
    Severity = 'error'
    Hint = 'Remove production logging.'
  },
  @{
    Name = 'TODO comment'
    Pattern = 'TODO'
    Severity = 'error'
    Hint = 'Finish the UI instead of shipping TODO markers.'
  },
  @{
    Name = 'Full-page loading return'
    Pattern = 'if\s*\(\s*isLoading\s*\)\s*return'
    Severity = 'error'
    Hint = 'Render the page shell first and replace content with shimmer placeholders.'
  },
  @{
    Name = 'Heavy glow effect'
    Pattern = 'opacity-(50|60)|blur-xl'
    Severity = 'error'
    Hint = 'Keep glow effects subtle: low opacity and blur-lg max.'
  },
  @{
    Name = 'Bare web button'
    Pattern = '<button\b'
    Severity = 'warning'
    Hint = 'Check whether this should use the shared Button component with isLoading.'
  },
  @{
    Name = 'Bare CTA link'
    Pattern = '<Link\b|<a\b'
    Severity = 'warning'
    Hint = 'Check whether this is a plain-text CTA that should become a card or pill action.'
  },
  @{
    Name = 'Mobile touchable review'
    Pattern = '<TouchableOpacity\b'
    Severity = 'warning'
    Hint = 'Verify loading state, disabled behavior, hit target size, and accessibility labels.'
  }
)

$files = Get-ChildItem -Path $resolvedPath -Recurse -File | Where-Object {
  $extensionAllowed = $allowedExtensions -contains $_.Extension.ToLowerInvariant()
  if (-not $extensionAllowed) {
    return $false
  }

  if ($IncludeBuildArtifacts) {
    return $true
  }

  foreach ($fragment in $ignoredPathFragments) {
    if ($_.FullName -match $fragment) {
      return $false
    }
  }

  return $true
}

if (-not $files) {
  Write-Host "No matching source files found under $resolvedPath"
  exit 0
}

$findings = @()

foreach ($rule in $rules) {
  $matches = Select-String -Path $files.FullName -Pattern $rule.Pattern -AllMatches
  foreach ($match in $matches) {
    $findings += [pscustomobject]@{
      Rule = $rule.Name
      Severity = $rule.Severity
      File = $match.Path
      Line = $match.LineNumber
      Snippet = $match.Line.Trim()
      Hint = $rule.Hint
    }
  }
}

if (-not $findings) {
  Write-Host 'Premium UI validator: no heuristic issues found.' -ForegroundColor Green
  exit 0
}

$errorCount = ($findings | Where-Object Severity -eq 'error').Count
$warningCount = ($findings | Where-Object Severity -eq 'warning').Count

Write-Host "Premium UI validator found $errorCount error(s) and $warningCount warning(s)." -ForegroundColor Yellow

foreach ($group in ($findings | Group-Object Rule)) {
  $first = $group.Group[0]
  $severityColor = if ($first.Severity -eq 'error') { 'Red' } else { 'Yellow' }
  Write-Host "`n[$($first.Severity.ToUpperInvariant())] $($group.Name)" -ForegroundColor $severityColor
  Write-Host "Hint: $($first.Hint)" -ForegroundColor DarkGray

  foreach ($finding in $group.Group) {
    Write-Host ("  {0}:{1}" -f $finding.File, $finding.Line)
    Write-Host ("    {0}" -f $finding.Snippet)
  }
}

if ($Strict -and $warningCount -gt 0) {
  exit 1
}

if ($errorCount -gt 0) {
  exit 1
}

exit 0
