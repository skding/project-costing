---
description: how to run the project costing application
---

To run the Project Costing application, you need to start both the backend server and the frontend client.

### Prerequisites
- Node.js installed
- PostgreSQL database running locally

### 1. Server Setup (Backend)
Navigate to the `server` directory and perform the following:

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Database Configuration**:
   Ensure your `.env` file reflects your local PostgreSQL credentials:
   ```env
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/project_costing?schema=public"
   PORT=3002
   ```

3. **Prisma Setup**:
   Generate the client and push the schema to your database:
   ```bash
   npx prisma generate
   npx prisma migrate dev --name init
   ```

4. **Start Development Server**:
   // turbo
   ```bash
   npm run dev
   ```
   The server will start on `http://localhost:3002`.

### 2. Client Setup (Frontend)
Navigate to the `client` directory and perform the following:

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start Development Server**:
   // turbo
   ```bash
   npm run dev
   ```
   The client will start on `http://localhost:5173`.

### Accessing the App
Open your browser and navigate to `http://localhost:5173`.
