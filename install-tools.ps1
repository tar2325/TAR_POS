<#
.SYNOPSIS
    สคริปต์ตรวจสอบและติดตั้งเครื่องมือจำเป็นสำหรับโปรเจกต์ POS (Web & API Backend)
.DESCRIPTION
    ตรวจสอบสถานะของ Node.js, Java JDK 21, Git, และ Docker บน Windows
    พร้อมคำสั่งติดตั้งผ่าน winget อัตโนมัติ
#>

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "    POS Development Environment - Pre-flight Check       " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""

function Check-Tool {
    param (
        [string]$Name,
        [string]$Command,
        [string]$WingetPackageId,
        [string]$ManualUrl
    )

    Write-Host -NoNewline "[*] ตรวจสอบ $Name... "
    try {
        $version = Invoke-Expression "$Command" 2>$null
        if ($LASTEXITCODE -eq 0 -and $version) {
            Write-Host "พบแล้ว ($version)" -ForegroundColor Green
            return $true
        } else {
            Write-Host "ยังไม่ได้ติดตั้ง" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "ยังไม่ได้ติดตั้ง" -ForegroundColor Yellow
    }

    Write-Host "    -> แนะนำติดตั้งผ่าน winget:" -ForegroundColor Gray
    Write-Host "       winget install --id $WingetPackageId -e" -ForegroundColor White
    if ($ManualUrl) {
        Write-Host "    -> หรือดาวน์โหลดเองได้ที่: $ManualUrl" -ForegroundColor Gray
    }
    Write-Host ""
    return $false
}

# 1. Check Node.js
Check-Tool -Name "Node.js" -Command "node -v" -WingetPackageId "OpenJS.NodeJS.LTS" -ManualUrl "https://nodejs.org/"

# 2. Check Git
$hasGit = Check-Tool -Name "Git" -Command "git --version" -WingetPackageId "Git.Git" -ManualUrl "https://git-scm.com/download/win"

# 3. Check Java 21
$hasJava = Check-Tool -Name "Java JDK 21" -Command "java -version 2>&1 | Select-Object -First 1" -WingetPackageId "EclipseAdoptium.Temurin.21.JDK" -ManualUrl "https://adoptium.net/temurin/releases/?version=21"

# 4. Check Docker Desktop
$hasDocker = Check-Tool -Name "Docker Desktop" -Command "docker --version" -WingetPackageId "Docker.DockerDesktop" -ManualUrl "https://www.docker.com/products/docker-desktop/"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "                    สรุปและวิธีเริ่มใช้งาน               " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. สตาร์ทฐานข้อมูล (PostgreSQL 16 + pgAdmin):" -ForegroundColor Green
Write-Host "   docker compose up -d" -ForegroundColor White
Write-Host "   -> เข้า pgAdmin ได้ที่: http://localhost:5050 (User: admin@pos.local / Pass: admin)" -ForegroundColor Gray
Write-Host ""
Write-Host "2. สตาร์ท Backend API (Spring Boot 3 + Java 21):" -ForegroundColor Green
Write-Host "   cd backend" -ForegroundColor White
Write-Host "   .\mvnw.cmd spring-boot:run" -ForegroundColor White
Write-Host "   -> ทดสอบ API ผ่าน Swagger UI ได้ที่: http://localhost:8080/api/v1/swagger-ui.html" -ForegroundColor Gray
Write-Host "   -> ทดสอบ Health Check: http://localhost:8080/api/v1/health" -ForegroundColor Gray
Write-Host ""
Write-Host "3. สตาร์ท Frontend (Angular 22):" -ForegroundColor Green
Write-Host "   cd frontend" -ForegroundColor White
Write-Host "   npm start" -ForegroundColor White
Write-Host "   -> เข้าใช้งาน Web App ได้ที่: http://localhost:4200" -ForegroundColor Gray
Write-Host ""
Write-Host "==========================================================" -ForegroundColor Cyan
