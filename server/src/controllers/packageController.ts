import { Request, Response } from 'express';
import prisma from '../prisma';

export const getAllPackages = async (req: Request, res: Response) => {
    try {
        const packages = await prisma.hardwarePackage.findMany({
            include: {
                items: {
                    include: {
                        catalog: true
                    }
                }
            }
        });
        res.json(packages);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch packages' });
    }
};

export const createPackage = async (req: Request, res: Response) => {
    const { name, description, items } = req.body;
    try {
        const pkg = await prisma.hardwarePackage.create({
            data: {
                name,
                description,
                items: {
                    create: (items || []).map((item: any) => ({
                        catalogId: item.catalogId,
                        quantity: item.quantity || 1
                    }))
                }
            },
            include: {
                items: {
                    include: {
                        catalog: true
                    }
                }
            }
        });
        res.json(pkg);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create package' });
    }
};

export const updatePackage = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, description, items } = req.body;
    try {
        const result = await prisma.$transaction(async (tx: any) => {
            // Update basic info
            await tx.hardwarePackage.update({
                where: { id },
                data: { name, description }
            });

            // Replace items
            await tx.hardwarePackageItem.deleteMany({
                where: { packageId: id }
            });

            if (items && items.length > 0) {
                await tx.hardwarePackageItem.createMany({
                    data: items.map((item: any) => ({
                        packageId: id,
                        catalogId: item.catalogId,
                        quantity: item.quantity || 1
                    }))
                });
            }

            return tx.hardwarePackage.findUnique({
                where: { id },
                include: {
                    items: {
                        include: {
                            catalog: true
                        }
                    }
                }
            });
        });
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update package' });
    }
};

export const deletePackage = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        await prisma.hardwarePackage.delete({
            where: { id }
        });
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete package' });
    }
};

export const addPackageToVersion = async (req: Request, res: Response) => {
    const { versionId, packageId } = req.params;
    const { systemId, sectionId } = req.body;

    try {
        const pkg = await prisma.hardwarePackage.findUnique({
            where: { id: packageId },
            include: { items: { include: { catalog: true } } }
        });

        if (!pkg) return res.status(404).json({ error: 'Package not found' });

        // Expand items into ProjectComponents
        const componentsData = pkg.items.map(item => ({
            projectVersionId: versionId,
            catalogId: item.catalogId,
            quantity: item.quantity,
            snapshottedPrice: item.catalog.listPrice,
            componentName: item.catalog.model,
            systemId: systemId || null,
            sectionId: sectionId || null
        }));

        await prisma.projectComponent.createMany({
            data: componentsData
        });

        res.json({ message: `Successfully added package ${pkg.name} to version` });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to add package to version' });
    }
};
