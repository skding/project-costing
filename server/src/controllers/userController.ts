import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key';

export const register = async (req: Request, res: Response) => {
    const { email, password, name } = req.body;
    const normalizedEmail = email.toLowerCase();
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await prisma.user.create({
            data: {
                email: normalizedEmail,
                password: hashedPassword,
                name
            }
        });
        res.json({ message: 'User created successfully', user: { id: user.id, email: user.email, name: user.name } });
    } catch (error) {
        res.status(500).json({ error: 'Failed to create user' });
    }
};

export const login = async (req: Request, res: Response) => {
    const { email, password } = req.body;
    const normalizedEmail = email.toLowerCase();
    console.log(`Login attempt for: ${normalizedEmail}`);
    try {
        const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
        if (!user) {
            console.log(`User not found: ${normalizedEmail}`);
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        console.log(`User found: ${user.email}, verifying password...`);
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            console.log(`Invalid password for user: ${email}`);
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        console.log(`Password valid, generating token for: ${email}`);
        const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '24h' });
        res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
};
