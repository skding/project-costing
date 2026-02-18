import { Request, Response } from 'express';
import prisma from '../prisma';

export const getComponents = async (req: Request, res: Response) => {
    const { category } = req.query;
    try {
        const where = category ? { category: String(category) } : {};
        const components = await prisma.componentCatalog.findMany({
            where,
            orderBy: { model: 'asc' }
        });
        res.json(components);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch components' });
    }
};

export const createComponent = async (req: Request, res: Response) => {
    const { model, description, brand, listPrice, category, ioSpecs } = req.body;
    try {
        const component = await prisma.componentCatalog.create({
            data: {
                model,
                description,
                brand,
                listPrice,
                category,
                ioSpecs
            }
        });
        res.json(component);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create component' });
    }
};

export const deleteComponent = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        await prisma.componentCatalog.delete({ where: { id: id as string } });
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete component' });
    }
};

export const updateComponent = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { model, description, brand, listPrice, category, ioSpecs } = req.body;
    try {
        const component = await prisma.componentCatalog.update({
            where: { id: id as string },
            data: {
                model,
                description,
                brand,
                listPrice,
                category,
                ioSpecs
            }
        });
        res.json(component);
    } catch (error) {
        console.error('Error updating component:', error);
        res.status(500).json({ error: 'Failed to update component' });
    }
};
