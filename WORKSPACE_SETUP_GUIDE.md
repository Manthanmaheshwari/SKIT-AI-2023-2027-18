# Enterprise Workspace Setup & Database Connectivity Guide

**Target Audience:** Enterprise Full-Stack Engineers, AI Specialists, and DevOps Engineers  
**Platform:** Enterprise Multi-Tenant AI Research Assistant Platform  
**Runtimes:** .NET 8 (C# 12), React 18 (Vite 5), Python 3.12+ (FastAPI), MS SQL Server (LocalDB / Express / 2022)  

---

## 1. Architecture & Database Landscape

The platform utilizes **Microsoft SQL Server** as its primary relational store for tenant boundaries, organizational metadata, role-based access control (ASP.NET Identity), and refresh token rotation.

```
+----------------------------------------------------------------------------------+
|                              LOCAL DEVELOPER MACHINE                             |
|                                                                                  |
|   +--------------------------+          +------------------------------------+   |
|   |   Antigravity / VS Code  |          |      Entity Framework Core 8       |   |
|   |  SQLTools / mssql ext    |          |    (ApplicationDbContext.cs)       |   |
|   +------------+-------------+          +-----------------+------------------+   |
|                |                                          |                      |
|                | ADO.NET / TDS Protocol                   | Direct Connection    |
|                v                                          v                      |
|   +--------------------------------------------------------------------------+   |
|   |                  Microsoft SQL Server LocalDB Instance                   |   |
|   |                 Named Instance: (localdb)\mssqllocaldb                   |   |
|   |                 Database Name:  EnterpriseAiPlatformDb                   |   |
|   +--------------------------------------------------------------------------+   |
+----------------------------------------------------------------------------------+
```

---

## 2. Standard Connection Strings

The default, production-grade connection string is configured in [`backend-api/appsettings.json`](file:///c:/Users/ASUS/Desktop/SKIT-AI-2023-2027-18/backend-api/appsettings.json):

### A. Windows LocalDB (Default Developer Environment)
```json
"ConnectionStrings": {
  "DefaultConnection": "Server=(localdb)\\mssqllocaldb;Database=EnterpriseAiPlatformDb;Trusted_Connection=True;MultipleActiveResultSets=true;TrustServerCertificate=True"
}
```

### B. SQL Server Express Edition (Alternative)
```json
"ConnectionStrings": {
  "DefaultConnection": "Server=localhost\\SQLEXPRESS;Database=EnterpriseAiPlatformDb;Trusted_Connection=True;MultipleActiveResultSets=true;TrustServerCertificate=True"
}
```

### C. Dockerized SQL Server on Linux Container (Alternative)
```json
"ConnectionStrings": {
  "DefaultConnection": "Server=localhost,1433;Database=EnterpriseAiPlatformDb;User Id=sa;Password=YourStrongPassword2026!;MultipleActiveResultSets=true;TrustServerCertificate=True"
}
```

---

## 3. Step-by-Step IDE SQL Visualizer Configuration

Our workspace recommends two top-tier SQL extensions in [`.vscode/extensions.json`](file:///c:/Users/ASUS/Desktop/SKIT-AI-2023-2027-18/.vscode/extensions.json):
1. **SQLTools** (`mtxr.sqltools`) + **MSSQL Driver** (`mtxr.sqltools-driver-mssql`)
2. **Microsoft SQL Server (mssql)** (`ms-mssql.mssql`)

---

### Option 1: SQLTools Extension (Pre-Configured in Workspace)

The workspace has already provisioned pre-configured connection settings inside [`.vscode/settings.json`](file:///c:/Users/ASUS/Desktop/SKIT-AI-2023-2027-18/.vscode/settings.json).

#### Setup Steps:
1. Open the **Extensions View** (`Ctrl+Shift+X` or `Cmd+Shift+X`).
2. Search `@recommended` and install **SQLTools** and **SQLTools Driver for MSSQL**.
3. Click the **Database / SQLTools icon** in the left Activity Bar.
4. You will see **`EnterpriseAiPlatformDb (LocalDB)`** already listed under Connections.
5. Click **Connect** (Plug icon).
6. Expand **Schemas > Tables** to inspect relational structures (`Tenants`, `AspNetUsers`, `TenantDocuments`).

#### Manual Parameter Reference (if recreating manually):
* **Connection Name:** `EnterpriseAiPlatformDb (LocalDB)`
* **Dialect:** `MSSQL`
* **Connect using:** `Server and Port` or `Socket/Named Pipe`
* **Server:** `(localdb)\mssqllocaldb`
* **Database:** `EnterpriseAiPlatformDb`
* **Authentication:** `Windows Authentication`
* **Trust Server Certificate:** `true`
* **Request Timeout:** `30`

---

### Option 2: Official Microsoft SQL Server Extension (`ms-mssql.mssql`)

For deep integration with T-SQL IntelliSense, execution plans, and schema generation:

#### Setup Steps:
1. Install **SQL Server (mssql)** (`ms-mssql.mssql`) from the Extensions Marketplace.
2. Open the Command Palette (`Ctrl+Shift+P`).
3. Type and select: `MS SQL: Add Connection`.
4. Enter the connection parameters sequentially:
   - **Server name:** `(localdb)\mssqllocaldb`
   - **Database name:** `EnterpriseAiPlatformDb`
   - **Authentication type:** `Integrated` (Windows Authentication)
   - **Profile name:** `Enterprise AI LocalDB`
5. Press `Enter`. The connection will connect and list all tables in the **SQL Server** side panel.

---

## 4. LocalDB CLI Diagnostics & Management

If SQL Server LocalDB is not running or reports a socket connection error, use the following PowerShell commands:

### Verify LocalDB Installation
```powershell
sqllocaldb info
# Expected output:
# MSSQLLocalDB
```

### Start the Instance
```powershell
sqllocaldb start MSSQLLocalDB
# Expected output:
# LocalDB instance "MSSQLLocalDB" started.
```

### Create Fresh Instance (If corrupted or missing)
```powershell
sqllocaldb create MSSQLLocalDB -s
```

### Get Pipe Name / Diagnostic Status
```powershell
sqllocaldb status MSSQLLocalDB
```

---

## 5. Applying Database Migrations & Verification

To initialize or update the relational schema via Entity Framework Core:

```powershell
# Navigate to backend API directory
cd backend-api

# Update database schema
dotnet ef database update

# Or run the API gateway which seeds initial default tenant and admin roles
dotnet run
```

### Verification Query

Run this query directly in the SQL visualizer to verify connectivity and engine version:

```sql
SELECT 
    SERVERPROPERTY('ServerName') AS [ServerName],
    SERVERPROPERTY('ProductVersion') AS [ProductVersion],
    SERVERPROPERTY('ProductLevel') AS [ProductLevel],
    SERVERPROPERTY('Edition') AS [Edition],
    DB_NAME() AS [CurrentDatabase];
```

---

## 6. Multi-Tenant Relational Isolation Verification

In our architecture, all tenant queries are filtered via `ICurrentTenantService` and EF Core Global Query Filters:

```sql
-- Diagnostic query to verify tenant partitioning:
SELECT 
    t.Id AS TenantGuid,
    t.Name AS TenantName,
    t.Slug AS TenantSlug,
    COUNT(d.Id) AS DocumentCount
FROM Tenants t
LEFT JOIN TenantDocuments d ON t.Id = d.TenantId
GROUP BY t.Id, t.Name, t.Slug;
```

---

## 7. Summary of Workspace Automation Assets

| Asset | Path | Purpose |
| :--- | :--- | :--- |
| **Workspace Settings** | [`.vscode/settings.json`](file:///c:/Users/ASUS/Desktop/SKIT-AI-2023-2027-18/.vscode/settings.json) | Enforces format-on-save, organize imports, SQLTools definitions, and linters. |
| **Extension Pack** | [`.vscode/extensions.json`](file:///c:/Users/ASUS/Desktop/SKIT-AI-2023-2027-18/.vscode/extensions.json) | 1-click install for .NET, Python, React, Tailwind, and Database tooling. |
| **One-Click Automation** | [`.vscode/tasks.json`](file:///c:/Users/ASUS/Desktop/SKIT-AI-2023-2027-18/.vscode/tasks.json) | High-speed task pipeline for multi-service launch. |
| **Compound Debugger** | [`.vscode/launch.json`](file:///c:/Users/ASUS/Desktop/SKIT-AI-2023-2027-18/.vscode/launch.json) | Compound F5 runner: "🚀 Run Enterprise RAG Platform". |
