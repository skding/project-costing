import { Request, Response } from 'express';
import prisma from '../prisma';

export const addEquipment = async (req: Request, res: Response) => {
    const { sectionId } = req.params;
    const { name, quantity, io } = req.body; // io: Array of { ioType, quantity }
    try {
        const equipment = await (prisma as any).equipment.create({
            data: {
                name,
                quantity: quantity || 1,
                sectionId,
                io: {
                    create: io ? io.map((i: any) => ({
                        ioType: i.ioType,
                        quantity: i.quantity
                    })) : []
                }
            },
            include: { io: true }
        });
        res.json(equipment);
    } catch (error) {
        res.status(500).json({ error: 'Failed to add equipment' });
    }
};

export const updateEquipment = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, quantity, io } = req.body;
    try {
        const result = await prisma.$transaction(async (tx) => {
            // Update equipment fields
            const equipment = await (tx as any).equipment.update({
                where: { id },
                data: {
                    name,
                    quantity: quantity !== undefined ? quantity : undefined
                }
            });

            // Update IO if provided
            if (io) {
                await (tx as any).equipmentIO.deleteMany({ where: { equipmentId: id } });
                await (tx as any).equipmentIO.createMany({
                    data: io.map((i: any) => ({
                        equipmentId: id,
                        ioType: i.ioType,
                        quantity: i.quantity
                    }))
                });
            }

            return (tx as any).equipment.findUnique({
                where: { id },
                include: { io: true }
            });
        });
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update equipment' });
    }
};

export const deleteEquipment = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        await (prisma as any).equipment.delete({ where: { id } });
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete equipment' });
    }
};
