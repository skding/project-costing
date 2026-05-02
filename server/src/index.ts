import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 3002;

import projectRoutes from './routes/projectRoutes';
import versionRoutes from './routes/versionRoutes';
import componentRoutes from './routes/componentRoutes';
import clientRoutes from './routes/clientRoutes';
import userRoutes from './routes/userRoutes';
import equipmentRoutes from './routes/equipmentRoutes';
import packageRoutes from './routes/packageRoutes';
import { authMiddleware } from './middleware/authMiddleware';

app.use(cors());
app.use(express.json());

app.use('/api/user', userRoutes);
app.use('/api/projects', authMiddleware, projectRoutes);
app.use('/api/versions', authMiddleware, versionRoutes);
app.use('/api/components', authMiddleware, componentRoutes);
app.use('/api/clients', authMiddleware, clientRoutes);
app.use('/api/equipment', authMiddleware, equipmentRoutes);
app.use('/api/packages', authMiddleware, packageRoutes);

app.get('/', (req, res) => {
    res.send('Project Costing API is running');
});

app.listen(Number(port), '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${port}`);
});
