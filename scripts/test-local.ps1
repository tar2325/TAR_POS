<#
.SYNOPSIS
  Runs all local automated unit and integration tests for POS system (Backend & Frontend).

.DESCRIPTION
  Backend: Spring Boot 3 JUnit 5 & Mockito test suite via Maven wrapper (H2 In-Memory DB).
  Frontend: Angular 22 unit tests via Vitest runner.

.PARAMETER SkipBackend
  Skips running backend tests.

.PARAMETER SkipFrontend
  Skips running frontend tests.

.EXAMPLE
  .\scripts\test-local.ps1
  .\scripts\test-local.ps1 -SkipFrontend
#>

param(
  [switch]$SkipBackend,
  [switch]$SkipFrontend
)

$ErrorActionPreference = "Continue"
$projectRoot = Split-Path -Parent $PSScriptRoot

Write-Host "======================================================" -ForegroundColor Cyan
Write-Host " POS SYSTEM - LOCAL AUTOMATED TEST RUNNER " -ForegroundColor Cyan
Write-Host " Root: $projectRoot" -ForegroundColor Gray
Write-Host "======================================================`n" -ForegroundColor Cyan

$backendSuccess = $true
$frontendSuccess = $true

# -----------------------------------------------------------------------------
# 1. Backend Tests (Spring Boot / Maven / JUnit 5)
# -----------------------------------------------------------------------------
if (-not $SkipBackend) {
  Write-Host "[1/2] Running Backend Tests (Spring Boot + JUnit 5)..." -ForegroundColor Yellow
  $backendDir = Join-Path $projectRoot "backend"

  if (Test-Path $backendDir) {
    Push-Location $backendDir
    try {
      if (Test-Path ".\mvnw.cmd") {
        & .\mvnw.cmd clean test
      } elseif (Get-Command mvn -ErrorAction SilentlyContinue) {
        mvn clean test
      } else {
        Write-Host "ERROR: Neither mvnw.cmd nor mvn found in PATH." -ForegroundColor Red
        $backendSuccess = $false
      }

      if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Backend tests FAILED (Exit Code: $LASTEXITCODE)" -ForegroundColor Red
        $backendSuccess = $false
      } else {
        Write-Host "✅ Backend tests PASSED!" -ForegroundColor Green
      }
    } finally {
      Pop-Location
    }
  } else {
    Write-Host "ERROR: Backend directory not found at $backendDir" -ForegroundColor Red
    $backendSuccess = $false
  }
} else {
  Write-Host "[1/2] Backend tests SKIPPED by flag." -ForegroundColor DarkGray
}

Write-Host ""

# -----------------------------------------------------------------------------
# 2. Frontend Tests (Angular 22 / Vitest)
# -----------------------------------------------------------------------------
if (-not $SkipFrontend) {
  Write-Host "[2/2] Running Frontend Tests (Angular + Vitest)..." -ForegroundColor Yellow
  $frontendDir = Join-Path $projectRoot "frontend"

  if (Test-Path $frontendDir) {
    Push-Location $frontendDir
    try {
      # Use npm test with --watch=false for one-shot run
      npm test -- --watch=false

      if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Frontend tests FAILED (Exit Code: $LASTEXITCODE)" -ForegroundColor Red
        $frontendSuccess = $false
      } else {
        Write-Host "✅ Frontend tests PASSED!" -ForegroundColor Green
      }
    } finally {
      Pop-Location
    }
  } else {
    Write-Host "ERROR: Frontend directory not found at $frontendDir" -ForegroundColor Red
    $frontendSuccess = $false
  }
} else {
  Write-Host "[2/2] Frontend tests SKIPPED by flag." -ForegroundColor DarkGray
}

# -----------------------------------------------------------------------------
# Final Summary
# -----------------------------------------------------------------------------
Write-Host "`n======================================================" -ForegroundColor Cyan
Write-Host " TEST RUN SUMMARY " -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan

if (-not $SkipBackend) {
  $statusText = if ($backendSuccess) { "PASSED" } else { "FAILED" }
  $statusColor = if ($backendSuccess) { "Green" } else { "Red" }
  Write-Host " Backend Suite  : $statusText" -ForegroundColor $statusColor
}
if (-not $SkipFrontend) {
  $statusText = if ($frontendSuccess) { "PASSED" } else { "FAILED" }
  $statusColor = if ($frontendSuccess) { "Green" } else { "Red" }
  Write-Host " Frontend Suite : $statusText" -ForegroundColor $statusColor
}

Write-Host "======================================================`n" -ForegroundColor Cyan

if ($backendSuccess -and $frontendSuccess) {
  Write-Host "🎉 All suites passed successfully!" -ForegroundColor Green
  exit 0
} else {
  Write-Host "⚠️ Some test suites failed. Please check the logs above." -ForegroundColor Red
  exit 1
}
