# Cloud Update Guide - Hardware Packages Feature

This guide explains how to update your Project Costing application on the Oracle Cloud instance to include the new **Hardware Packages** feature.

## 1. Pull Latest Changes
Navigate to your project root and pull the latest code from Git:
```bash
cd /var/www/project-costing
git pull origin main
```

## 2. Update Backend (Server)
The backend requires a database migration and a rebuild.

1.  **Navigate to the server directory**:
    ```bash
    cd server
    ```
2.  **Install any new dependencies** (if applicable):
    ```bash
    npm install
    ```
3.  **Run Database Migrations & Generate Client**:
    This step is CRITICAL to add the new `HardwarePackage` and `HardwarePackageItem` tables to your production database and update the Prisma Client types.
    ```bash
    npx prisma migrate deploy
    npx prisma generate
    ```
4.  **Rebuild the Backend**:
    ```bash
    npm run build
    ```
5.  **Restart the API with PM2**:
    ```bash
    pm2 restart costing-api
    ```

## 3. Update Frontend (Client)
The frontend needs to be rebuilt to include the new UI components.

1.  **Navigate to the client directory**:
    ```bash
    cd ../client
    ```
2.  **Install dependencies**:
    ```bash
    npm install
    ```
3.  **Rebuild the Frontend**:
    Ensure you use your cloud instance's IP address for the API URL.
    ```bash
    # Replace <YOUR_CLOUD_IP> with your instance IP
    VITE_API_URL="http://<YOUR_CLOUD_IP>:3003/api" npm run build
    ```
4.  **Restart the Frontend with PM2**:
    ```bash
    pm2 restart costing-frontend
    ```

## 4. Verification
Once updated, verify the following:
1.  Navigate to **Component Library**; you should see a new "Hardware Packages" tab.
2.  Navigate to a **Project -> BOM**; you should see the "Packages" tab in the right sidebar.
3.  Try creating a test package and adding it to a project to ensure the database link is working.

---
**Troubleshooting Database Migrations:**
If `npx prisma migrate deploy` fails, ensure your `DATABASE_URL` in the `.env` file is correct and the PostgreSQL service is running. If you encounter "relation already exists" errors, ensure you haven't manually created tables that Prisma is trying to manage.
