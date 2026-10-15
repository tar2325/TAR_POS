# POS System (Point of Sale)

ระบบจัดการหน้าร้าน (Point of Sale) ครบวงจร ประกอบด้วย:
- **Frontend**: Angular 22 + TypeScript + Angular Material
- **Backend API**: Java 21 + Spring Boot 3 + Spring Data JPA + Springdoc OpenAPI (Swagger)
- **Database**: PostgreSQL 16 + pgAdmin 4 (ผ่าน Docker Compose)

---

## 🛠️ เครื่องมือที่ต้องติดตั้งในเครื่อง (Prerequisites)

| เครื่องมือ | คำสั่งติดตั้งผ่าน `winget` (PowerShell) | ลิงก์ดาวน์โหลดตรง |
| :--- | :--- | :--- |
| **Java 21 (JDK)** | `winget install EclipseAdoptium.Temurin.21.JDK` | [Adoptium Temurin 21](https://adoptium.net/temurin/releases/?version=21) |
| **Git** | `winget install Git.Git` | [Git for Windows](https://git-scm.com/download/win) |
| **Docker Desktop** | `winget install Docker.DockerDesktop` | [Docker Desktop](https://www.docker.com/products/docker-desktop/) |
| **Node.js** | *(ติดตั้งเรียบร้อยแล้ว: v24.18.0)* | [Node.js](https://nodejs.org/) |

> หรือรันสคริปต์ตรวจสอบอัตโนมัติใน PowerShell:
> ```powershell
> .\install-tools.ps1
> ```

---

## 🚀 วิธีเริ่มต้นใช้งาน (Quick Start)

### 1. สตาร์ทฐานข้อมูล (Database)
เปิด Terminal ที่โฟลเดอร์หลักของโปรเจกต์:
```powershell
docker compose up -d
```
- **PostgreSQL**: `localhost:5432` (DB: `pos_db`, User: `pos_user`, Pass: `pos_password`)
- **pgAdmin**: `http://localhost:5050` (Email: `admin@pos.local`, Pass: `admin`)

---

### 2. สตาร์ท Backend API (Spring Boot 3)
```powershell
cd backend
.\mvnw.cmd spring-boot:run
```
- **API Base URL**: `http://localhost:8080/api/v1`
- **Swagger UI (Interactive API Docs)**: [http://localhost:8080/api/v1/swagger-ui.html](http://localhost:8080/api/v1/swagger-ui.html)
- **Health Check**: [http://localhost:8080/api/v1/health](http://localhost:8080/api/v1/health)
- **Products API**: [http://localhost:8080/api/v1/products](http://localhost:8080/api/v1/products)

---

### 3. สตาร์ท Frontend (Angular 22)
เปิดอีก Terminal หนึ่ง:
```powershell
cd frontend
npm start
```
- **Web App**: [http://localhost:4200](http://localhost:4200)
- เชื่อมต่อกับ Backend อัตโนมัติ พร้อมตั้งค่า CORS และ Proxy เรียบร้อยแล้ว

---

## 📂 โครงสร้างโปรเจกต์ (Project Structure)

```
project _pos/
├── docker-compose.yml          # คอนฟิกเกอเรชัน PostgreSQL 16 + pgAdmin
├── install-tools.ps1           # สคริปต์ตรวจเช็คสภาพแวดล้อมและแนะนำการติดตั้ง
├── backend/                    # โครงการ Spring Boot 3 (Java 21)
│   ├── pom.xml                 # รายการ Dependencies (Web, JPA, Postgres, Swagger, Lombok)
│   ├── mvnw.cmd                # Maven Wrapper สำหรับรันได้ทันทีโดยไม่ต้องลง Maven
│   └── src/main/
│       ├── java/com/pos/backend/
│       │   ├── config/         # CORS, OpenAPI/Swagger, DataInitializer (Seeder)
│       │   ├── controller/     # HealthController, ProductController
│       │   ├── model/          # Product JPA Entity
│       │   ├── repository/     # ProductRepository
│       │   └── service/        # ProductService
│       └── resources/
│           ├── application.yml
│           └── application-dev.yml
└── frontend/                   # โครงการ Angular 22
    ├── proxy.conf.json         # Proxy forward API requests
    └── src/
        ├── app/
        └── environments/
```
