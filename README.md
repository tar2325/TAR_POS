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

---

## ☁️ การนำขึ้น Cloud (Render Deployment)

โปรเจกต์นี้รองรับการ Deploy ขึ้น **Render.com** (Free Tier):

### ตัวเลือกที่ 1: Deploy ผ่าน Blueprint (แนะนำ - ง่ายที่สุด)
1. ใน Render Dashboard กด **New +** -> **Blueprint**
2. เลือก Repository นี้ -> Render จะอ่าน [`render.yaml`](file:///d:/project%20_pos/render.yaml) และสร้าง Database (`pos-db`), Backend API (`pos-backend`), และ Frontend (`pos-frontend`) ให้โดยอัตโนมัติ 100%

### ตัวเลือกที่ 2: ติดตั้งแบบแยก Service ด้วยตนเอง (Manual)
1. **สร้าง PostgreSQL Database**:
   - กด **New +** -> **PostgreSQL** (ชื่อ: `pos-db`, Database: `pos_db`, Region: Singapore, Plan: Free)
   - คัดลอก **Internal Database URL** (เช่น `postgres://pos_user:...@dpg-.../pos_db`)
2. **สร้าง Web Service สำหรับ Backend**:
   - กด **New +** -> **Web Service** เชื่อมต่อ GitHub repo
   - เลือก Runtime: **Docker** (Dockerfile path: `backend/Dockerfile`, Context: `backend`)
   - ไปที่แท็บ **Environment** แล้วเพิ่มตัวแปร:
     - `SPRING_DATASOURCE_URL`: *(วาง Internal Database URL จากข้อ 1)*
     - `APP_JWT_SECRET`: *(กำหนดรหัสผ่านสุ่ม >= 32 ตัวอักษร)*
     - *(หรือตั้งค่า `ALLOW_IN_MEMORY_DB=true` หากต้องการทดสอบระบบแบบ Demo โดยยังไม่ต่อ Postgres)*

---

## 🧪 การรันชุดทดสอบอัตโนมัติ (Automated Local Tests)

โปรเจกต์มีชุดทดสอบครอบคลุมทั้ง Backend (JUnit 5 / Spring Boot Test / MockMvc) และ Frontend (Angular 22 / Vitest):

### รันการทดสอบทั้งหมดในคำสั่งเดียว (PowerShell)
```powershell
.\scripts\test-local.ps1
```
*(หรือเลือกข้าม: `.\scripts\test-local.ps1 -SkipFrontend` หรือ `.\scripts\test-local.ps1 -SkipBackend`)*

### รันเฉพาะ Backend Tests
```powershell
cd backend
.\mvnw.cmd test -Dspring.profiles.active=test
```
ครอบคลุม:
- `JwtServiceTest`: ตรวจสอบการ Issue / Validate JWT Token และขนาด Secret Key
- `DatabaseConfigTest`: ตรวจสอบ URL Parser, H2 Fallback, และ Driver Auto-Selection
- `StockServiceTest`: ตรวจสอบตรรกะการตัดสต็อก, Ledger movement, และ Oversell prevention
- `AuthControllerTest`: ตรวจสอบการ Login, Validation, และ Authentication Filter
- `ProductSecurityTest`: ตรวจสอบ Role-based Access Control (401 สำหรับผู้ไม่ได้ล็อกอิน และ 403 สำหรับ Cashier แก้ไขสินค้า)

### รันเฉพาะ Frontend Tests
```powershell
cd frontend
npm test -- --watch=false
```
ครอบคลุม:
- `app.spec.ts`: ตรวจสอบการเรนเดอร์ Root Component และ Router Outlet
- `auth.service.spec.ts`: ตรวจสอบการเข้าสู่ระบบ, การเก็บ Token ใน `localStorage`, และ Signal state
- `auth.guard.spec.ts`: ตรวจสอบการ Route Guard ป้องกันหน้า Dashboard และ Admin-only routes
- `cart.service.spec.ts`: ตรวจสอบระบบตะกร้าสินค้า, การเช็คสต็อกก่อนเพิ่มสินค้า, คำนวณยอดเงิน
- `product-store.service.spec.ts`: ตรวจสอบ Product CRUD, Barcode Generator, การตัด/เติมสต็อก
- `sale-store.service.spec.ts`: ตรวจสอบการบันทึกบิลขาย, Snapshot ต้นทุน, คำนวณกำไร, และสรุปยอดตามช่วงเวลา
- `sales-report.component.spec.ts`: ตรวจสอบการเปลี่ยนแท็บช่วงเวลา, ฟิลเตอร์ค้นหา, และฟังก์ชัน Export CSV


