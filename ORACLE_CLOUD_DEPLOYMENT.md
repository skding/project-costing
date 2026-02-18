# Oracle Cloud Deployment Guide (Project Costing App)

This guide outlines the steps to deploy the Project Costing application on an Oracle Cloud Infrastructure (OCI) Compute Instance with a pre-installed PostgreSQL database.

## Prerequisites
- OCI Compute Instance (Ubuntu/Oracle Linux)
- PostgreSQL installed and running
- Node.js (v20+) and npm installed
- Nginx (Optional, if you prefer a domain name over IP:Port)

## 1. Database Configuration
Ensure your PostgreSQL database is accessible by the application.
1. Create a new database:
   ```sql
   CREATE DATABASE project_costing;
   ```
2. Create a user and grant permissions:
   ```sql
   CREATE USER costing_user WITH PASSWORD 'your_strong_password';
   GRANT ALL PRIVILEGES ON DATABASE project_costing TO costing_user;
   ```

## 2. Server Setup
1. Clone the repository to `/var/www/project-costing`.
2. Navigate to the `server` directory and install dependencies:
   ```bash
   cd server
   npm install
   ```
3. Create a `.env` file in the `server` directory:
   ```env
   DATABASE_URL="postgresql://costing_user:your_strong_password@localhost:5432/project_costing?schema=public"
   PORT=3003
   JWT_SECRET="your_secure_jwt_secret_key"
   ```
4. Run migrations and build:
   ```bash
   npx prisma migrate deploy
   npm run build
   ```
5. Use **PM2** to keep the server running:
   ```bash
   sudo npm install -g pm2
   pm2 start dist/index.js --name costing-api
   pm2 save
   pm2 startup
   ```

## 3. Client Setup
1. Navigate to the `client` directory and install dependencies:
   ```bash
   cd ../client
   npm install
   ```
2. Build the production bundle:
   ```bash
   npm run build
   ```
3. Serve the production build on port **5173**:
   Since you want to bypass Nginx and use port 5173 directly, install a simple static server like `serve`:
   ```bash
   sudo npm install -g serve
   # Use PM2 to keep the frontend running on port 5173
   pm2 start "serve -s dist -l 5173" --name costing-frontend
   ```
4. **Important**: Update the API connection. If your server is on port 3003, ensure the frontend can reach it at `http://your-cloud-ip:3003`.
   *Note: Ensure `VITE_API_BASE_URL` in your production environment points to your cloud IP/domain.*

## 4. Nginx Reverse Proxy (Optional)
This section is only needed if you want to use a domain name (e.g., `costing.yourdomain.com`) instead of `http://your-ip:5173`.
Configure Nginx to serve the frontend and proxy API requests.
1. Create a new configuration file `/etc/nginx/sites-available/project-costing`:
   ```nginx
   server {
       listen 80;
       server_name your_domain_or_ip;

       # Frontend (React Build)
       location / {
           root /var/www/project-costing/client/dist;
           index index.html;
           try_files $uri /index.html;
       }

       # Backend API Proxy
       location /api/ {
           proxy_pass http://localhost:3003;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```
2. Enable the site and restart Nginx:
   ```bash
   sudo ln -s /etc/nginx/sites-available/project-costing /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

## 5. Security (OCI Console)
1. Open the **Ingress Rules** in your VCN's Security List.
2. Allow incoming traffic on port **5173** (Frontend) and **3003** (Backend API).
3. (Optional) Allow port **80** only if you are using Nginx.

## 6. Initial User Creation
Since the app starts without users, the easiest way to create your first admin account is using the built-in seed script.

1.  **Navigate to the server directory**:
    ```bash
    cd /var/www/project-costing/server
    ```
2.  **Run the seed script**:
    ```bash
    npx ts-node src/seed.ts
    ```
    *This will create a default user:*
    - **Email**: `admin@example.com`
    - **Password**: `Password123!`

### Troubleshooting: "No database URL found"
If you see an error about the database URL when running Prisma commands:
- Ensure you are inside the `/var/www/project-costing/server` directory.
- Verify that your `.env` file exists in that directory and contains the correct `DATABASE_URL`.
- If you still have trouble, you can pass the URL directly to the command:
  ```bash
  DATABASE_URL="your_url_here" npx ts-node src/seed.ts
  ```

### Using Prisma Studio (Optional)
If you specifically want to use the UI:
1.  Run it from the server directory: `npx prisma studio`.
2.  By default, it uses port **5555**. You must open this port in your **OCI Security List** (Ingress Rules) to access it via your browser.
