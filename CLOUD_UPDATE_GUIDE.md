# Cloud Update Guide - v1.0.0 Release (Clover Digital Branding & UI Enhancements)

This guide provides step-by-step instructions for deploying the latest updates to your Oracle Cloud instance.

---

### What's New in v1.0.0
1. **Clover Digital Sdn Bhd Branding & Logo**: Integrated company credentials (Address: 7A Jalan PP 2/1 47100 Puchong Selangor, BRN: 201501034912, Web, Email) across login, navigation, and exports.
2. **Version Reset**: Standardized application versioning to `v1.0.0`.
3. **Compact Modern Dashboard**: Reduced project card sizes and optimized grid to display more items per row.
4. **Total System I/O Aggregation**: Displays aggregate I/O metrics (DI, DO, AI, AO, RTD, HLI, and Total I/O) summed across all sections in the BOM System header.
5. **Independent Catalog Scrolling**: The Components & Packages side panel scrolls independently from the BOM list and remains sticky on the screen.
6. **In-Place Component Quantity Updates**: Material quantities increment/decrement without rearranging rows to the bottom.
7. **In-Place Section Preservation**: Sections in Services & Rates remain in place upon saving changes.
8. **Export Project to Markdown (.md)**: One-click export button generating a comprehensive engineering and pricing document.
9. **Mobile & Tablet Responsive**: Responsive hamburger menu drawer, touch-friendly scrolling tabs, and responsive form views.
10. **Dual Detached BOM Scrolling**: Center BOM hierarchy and right-hand catalog each feature their own dedicated vertical scrollbars, operating completely detached from one another.
11. **Multi-Column Compact BOM Cards**: Component items in BOM are arranged in a 2-to-3 column grid per section/system, drastically reducing vertical page height while keeping 1 item per row in the catalog.

---

## 1. Pull Latest Changes
Navigate to the project root on your Oracle Cloud server and pull the latest code:
```bash
cd /var/www/project-costing
git pull origin main
```

---

## 2. Update Backend (Server)
1. **Navigate to the server directory**:
   ```bash
   cd /var/www/project-costing/server
   ```
2. **Install dependencies**:
   ```bash
   npm install
   ```
3. **Generate Prisma Client & Check Migrations**:
   ```bash
   npx prisma generate
   npx prisma migrate deploy
   ```
4. **Rebuild the Backend**:
   ```bash
   npm run build
   ```
5. **Restart the Server Service with PM2**:
   ```bash
   pm2 restart costing-api
   ```

---

## 3. Update Frontend (Client)
1. **Navigate to the client directory**:
   ```bash
   cd /var/www/project-costing/client
   ```
2. **Install dependencies**:
   ```bash
   npm install
   ```
3. **Rebuild the Production Bundle**:
   Replace `<YOUR_CLOUD_IP>` with your instance's public IP (e.g. port 3002 or your production API port):
   ```bash
   VITE_API_URL="http://<YOUR_CLOUD_IP>:3003/api" npm run build
   ```
4. **Restart the Frontend Service with PM2** (or reload Nginx):
   ```bash
   pm2 restart costing-frontend
   ```
   *If serving static files via Nginx:*
   ```bash
   sudo systemctl reload nginx
   ```

---

## 4. Verification Checklist
- [ ] Log in with user credentials; verify the Clover Digital logo and `v1.0.0` in the header and login screen.
- [ ] Check Dashboard project cards: verify compact layout showing 4–5 cards per row on wide screens.
- [ ] Open a project and navigate to **Bill of Materials**:
  - [ ] Verify System Header displays aggregate Total I/O badges.
  - [ ] Verify the right Components/Packages catalog bar scrolls independently with 1 item per row.
  - [ ] Click **+ Auto-Calc Item**: verify live calculated quantity from 6 I/O factors (DI, DO, AI, AO, RTD, HLI) and presets.
  - [ ] Add an item: verify quantity is initialized to calculated value and can be manually adjusted anytime.
  - [ ] In catalog items with auto-calc configured, verify `⚡ Auto` badge and click `Recalc` button to recompute if I/O counts change.
  - [ ] Click `+` or `-` on item quantity: verify row stays in position.
- [ ] Open **Component Library**:
  - [ ] Click **+ Add Component**: verify `⚡ Automatic Quantity Calculation (I/O Factor Formula)` toggle, 6 factor inputs, and presets.
- [ ] Open **Services & Rates**:
  - [ ] Edit a section and click **Save Changes**: verify section stays in position and shows "Saved!".
- [ ] Click **Export MD** in the top action bar: verify the Markdown file downloads with company header, BOM table, and financial summary.
- [ ] View on a mobile screen or resize browser window: verify hamburger menu opens drawer navigation and tabs scroll smoothly.

---

## 5. Troubleshooting
- **API URL mismatch**: If the frontend cannot communicate with the backend, verify `VITE_API_URL` during `npm run build` matches your cloud public IP and firewall port (default: `3002`).
- **PM2 process list**: Run `pm2 list` and `pm2 logs` to inspect any startup issues.
- **Firewall**: Ensure ports `3002` (backend) and `5173` (or port `80`/`443` for Nginx) are permitted in Oracle Cloud Security Lists and `iptables` / `firewalld`.
