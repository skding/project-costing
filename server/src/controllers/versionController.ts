import { Request, Response } from 'express';
import prisma from '../prisma';

// Get full details of a specific version
export const getVersionDetails = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const version = await prisma.projectVersion.findUnique({
            where: { id: id as string },
            include: {
                project: {
                    include: {
                        client: true
                    }
                },
                systems: {
                    include: {
                        sections: {
                            include: {
                                ioRequirements: true
                            }
                        }
                    }
                },
                components: {
                    include: {
                        system: true,
                        section: true,
                        catalog: true
                    }
                },
                costSettings: true
            }
        });
        if (!version) return res.status(404).json({ error: 'Version not found' });
        res.json(version);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch version details' });
    }
};

// Create a new version from existing (Save As)
export const createNewVersion = async (req: Request, res: Response) => {
    const { id: sourceVersionId } = req.params;
    try {
        const source = await prisma.projectVersion.findUnique({
            where: { id: sourceVersionId as string },
            include: {
                systems: { include: { sections: { include: { ioRequirements: true } } } },
                components: true,
                costSettings: true
            }
        });

        if (!source) return res.status(404).json({ error: 'Source version not found' });

        // Get max version number for this project
        const maxVersion = await prisma.projectVersion.findFirst({
            where: { projectId: source.projectId },
            orderBy: { versionNumber: 'desc' }
        });

        // Create new version with mapping
        const newVersion = await prisma.projectVersion.create({
            data: {
                projectId: source.projectId,
                versionNumber: (maxVersion?.versionNumber || 0) + 1,
                status: 'Draft',
                markup: source.markup,
                costSettings: source.costSettings ? {
                    create: {
                        engRateDigital: source.costSettings.engRateDigital,
                        engRateAnalog: source.costSettings.engRateAnalog,
                        engRateHLI: source.costSettings.engRateHLI,
                        cablingCostPerIO: source.costSettings.cablingCostPerIO,
                        siteWorkRates: source.costSettings.siteWorkRates as any
                    }
                } : undefined,
                systems: {
                    create: source.systems.map((sys: any) => ({
                        name: sys.name,
                        mandays: sys.mandays,
                        mobilization: sys.mobilization,
                        lodging: sys.lodging,
                        documentation: sys.documentation,
                        training: sys.training,
                        siteWorkDetails: sys.siteWorkDetails,
                        sections: {
                            create: sys.sections.map((sec: any) => ({
                                name: sec.name,
                                mandays: sec.mandays,
                                mobilization: sec.mobilization,
                                lodging: sec.lodging,
                                documentation: sec.documentation,
                                training: sec.training,
                                siteWorkDetails: sec.siteWorkDetails,
                                ioRequirements: {
                                    create: sec.ioRequirements.map((io: any) => ({
                                        ioType: io.ioType,
                                        quantity: io.quantity
                                    }))
                                }
                            }))
                        }
                    }))
                }
            },
            include: {
                systems: { include: { sections: true } }
            }
        });

        // Now map old components to new system/section IDs
        // This is complex because we need to know which old ID corresponds to which new ID.
        // Let's simplify: components will be copied but hierarchical links might need re-assignment or a more complex mapping.
        // For now, let's just copy them without links to avoid breakage, OR implement the mapping.

        const systemMap = new Map();
        source.systems.forEach((sys, idx) => {
            const newSys = newVersion.systems[idx];
            systemMap.set(sys.id, newSys.id);
            sys.sections.forEach((sec, sIdx) => {
                systemMap.set(sec.id, newSys.sections[sIdx].id);
            });
        });

        await prisma.projectComponent.createMany({
            data: source.components.map((c: any) => ({
                projectVersionId: newVersion.id,
                catalogId: c.catalogId,
                quantity: c.quantity,
                snapshottedPrice: c.snapshottedPrice,
                componentName: c.componentName,
                systemId: c.systemId ? systemMap.get(c.systemId) : null,
                sectionId: c.sectionId ? systemMap.get(c.sectionId) : null
            }))
        });

        res.json(newVersion);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to clone version' });
    }
};


// Add a System to a Version
export const addSystem = async (req: Request, res: Response) => {
    const { versionId } = req.params;
    const { name } = req.body;
    try {
        const system = await prisma.system.create({
            data: {
                name,
                projectVersionId: versionId as string
            }
        });
        res.json(system);
    } catch (error) {
        res.status(500).json({ error: 'Failed to add system' });
    }
};

// Add Section to System
export const addSection = async (req: Request, res: Response) => {
    const { systemId } = req.params;
    const { name } = req.body;
    try {
        const section = await prisma.section.create({
            data: {
                name,
                systemId: systemId as string
            }
        });
        res.json(section);
    } catch (error) {
        res.status(500).json({ error: 'Failed to add section' });
    }
};

// Update IO Requirements for a Section
export const updateIORequirements = async (req: Request, res: Response) => {
    const { sectionId } = req.params;
    const { ioRequirements } = req.body; // Array of { ioType, quantity }

    try {
        // Transaction to replace IOs
        const result = await prisma.$transaction(async (tx: any) => {
            // Delete existing
            await tx.iORequirement.deleteMany({
                where: { sectionId }
            });

            // Create new
            if (ioRequirements && ioRequirements.length > 0) {
                await tx.iORequirement.createMany({
                    data: ioRequirements.map((io: any) => ({
                        sectionId: sectionId as string,
                        ioType: io.ioType,
                        quantity: io.quantity
                    }))
                });
            }

            return tx.section.findUnique({
                where: { id: sectionId as string },
                include: { ioRequirements: true }
            });
        });

        res.json(result);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update IO requirements' });
    }
};

// Add component to version (supports hierarchical assignment)
export const addComponentToVersion = async (req: Request, res: Response) => {
    const { versionId } = req.params;
    const { catalogId, quantity, systemId, sectionId } = req.body;
    try {
        const catalogItem = await prisma.componentCatalog.findUnique({ where: { id: catalogId } });
        if (!catalogItem) return res.status(404).json({ error: 'Catalog item not found' });

        const projectComp = await prisma.projectComponent.create({
            data: {
                projectVersionId: versionId as string,
                catalogId: catalogId as string,
                quantity: quantity,
                snapshottedPrice: catalogItem.listPrice,
                componentName: catalogItem.model,
                systemId: systemId || null,
                sectionId: sectionId || null
            }
        });
        res.json(projectComp);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to add component' });
    }
};

// Update Version Metadata (e.g., markup)
export const updateVersion = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { markup, status } = req.body;
    try {
        const version = await prisma.projectVersion.update({
            where: { id: id as string },
            data: {
                markup: markup !== undefined ? Number(markup) : undefined,
                status
            }
        });
        res.json(version);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update version metadata' });
    }
};

// Update Cost Settings
export const updateCostSettings = async (req: Request, res: Response) => {
    const { versionId } = req.params;
    const { engRateDigital, engRateAnalog, engRateHLI, cablingCostPerIO } = req.body;
    try {
        const settings = await prisma.costSettings.upsert({
            where: { projectVersionId: versionId as string },
            update: {
                engRateDigital: engRateDigital !== undefined ? engRateDigital : 100,
                engRateAnalog: engRateAnalog !== undefined ? engRateAnalog : 150,
                engRateHLI: engRateHLI !== undefined ? engRateHLI : 250,
                cablingCostPerIO: cablingCostPerIO !== undefined ? cablingCostPerIO : 600
            },
            create: {
                projectVersionId: versionId as string,
                engRateDigital: engRateDigital !== undefined ? engRateDigital : 100,
                engRateAnalog: engRateAnalog !== undefined ? engRateAnalog : 150,
                engRateHLI: engRateHLI !== undefined ? engRateHLI : 250,
                cablingCostPerIO: cablingCostPerIO !== undefined ? cablingCostPerIO : 600
            }
        });
        res.json(settings);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update settings' });
    }
};

// Update System Costs/Fields
export const updateSystem = async (req: Request, res: Response) => {
    const systemId = req.params.systemId as string;
    const { name, mandays, mobilization, lodging, documentation, training, siteWorkDetails } = req.body;
    try {
        const system = await prisma.system.update({
            where: { id: systemId },
            data: { name, mandays, mobilization, lodging, documentation, training, siteWorkDetails }
        });
        res.json(system);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update system' });
    }
};

// Update Section Costs/Fields
export const updateSectionFields = async (req: Request, res: Response) => {
    const sectionId = req.params.sectionId as string;
    const { name, mandays, mobilization, lodging, documentation, training, siteWorkDetails } = req.body;
    try {
        const section = await prisma.section.update({
            where: { id: sectionId },
            data: { name, mandays, mobilization, lodging, documentation, training, siteWorkDetails }
        });
        res.json(section);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update section' });
    }
};

export const deleteProjectComponent = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        await prisma.projectComponent.delete({ where: { id: id as string } });
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete component' });
    }
};

