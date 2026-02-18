# Oracle Cloud Deployment Guide (Project Costing App)

This guide outlines the steps to deploy the Project Costing application on an Oracle Cloud Infrastructure (OCI) Compute Instance with a pre-installed PostgreSQL database.

## Prerequisites
- OCI Compute Instance (Ubuntu/Oracle Linux)
- PostgreSQL installed and running
- Node.js (v20+) and npm installed
- Nginx installed (for reverse proxy)

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
   *Note: Ensure `VITE_API_BASE_URL` in your production environment points to your cloud IP/domain.*

## 4. Nginx Reverse Proxy
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
2. Allow incoming traffic on port **80** (HTTP) and **443** (HTTPS if using SSL).
3. (Optional) Disable port 3003/3002 if Nginx is handling the traffic.

## 6. Initial User Creation
Since the app starts without users, you can run a script or use Prisma Studio to create the first admin user:
```bash
npx prisma studio
```
Navigate to the `User` table and add your initial credentials (reminder: passwords must be hashed if using SQL directly, use the app logic if possible).
