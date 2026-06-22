$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$port = 4187
$url = "http://127.0.0.1:$port/"
$bundledPython = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe'

if (Test-Path -LiteralPath $bundledPython) {
  $python = $bundledPython
} elseif (Get-Command py -ErrorAction SilentlyContinue) {
  $python = (Get-Command py).Source
} elseif (Get-Command python -ErrorAction SilentlyContinue) {
  $python = (Get-Command python).Source
} else {
  throw 'Python is required to run the local checkout preview.'
}

Write-Host "Manny Enterprise is running at $url"
Write-Host 'Press Ctrl+C to stop.'
Start-Process $url
& $python -m http.server $port --directory $root
