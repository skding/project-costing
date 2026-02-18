import { Request, Response } from 'express';
import prisma from '../prisma';

export const getClients = async (req: Request, res: Response) => {
    try {
        const clients = await prisma.client.findMany({
            include: {
                _count: {
                    select: { projects: true }
                }
            },
            orderBy: { name: 'asc' }
        });
        res.json(clients);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch clients' });
    }
};

export const createClient = async (req: Request, res: Response) => {
    const { name, company } = req.body;
    console.log('Creating client:', { name, company });
    try {
        const client = await prisma.client.create({
            data: { name, company }
        });
        res.json(client);
    } catch (error) {
        console.error('Error creating client:', error);
        res.status(500).json({ error: 'Failed to create client' });
    }
};

export const updateClient = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, company } = req.body;
    try {
        const client = await prisma.client.update({
            where: { id: id as string },
            data: { name, company }
        });
        res.json(client);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update client' });
    }
};

export const deleteClient = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const projectCount = await prisma.project.count({
            where: { clientId: id as string }
        });
        if (projectCount > 0) {
            return res.status(400).json({ error: `Cannot delete client with ${projectCount} associated projects.` });
        }
        await prisma.client.delete({
            where: { id: id as string }
        });
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete client' });
    }
};
