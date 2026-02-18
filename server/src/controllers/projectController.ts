import { Request, Response } from 'express';
import prisma from '../prisma';

export const getProjects = async (req: Request, res: Response) => {
    try {
        const projects = await prisma.project.findMany({
            include: {
                client: true,
                versions: {
                    orderBy: { versionNumber: 'desc' },
                    take: 1
                }
            },
            orderBy: { updatedAt: 'desc' }
        });
        res.json(projects);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch projects' });
    }
};

export const createProject = async (req: Request, res: Response) => {
    const { name, clientId, location } = req.body;
    try {
        const project = await prisma.project.create({
            data: {
                name,
                clientId,
                location,
                versions: {
                    create: {
                        versionNumber: 1,
                        status: 'DRAFT',
                        systems: {
                            create: []
                        }
                    }
                }
            },
            include: {
                client: true,
                versions: true
            }
        });
        res.json(project);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create project' });
    }
};

export const getProjectDetails = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const project = await prisma.project.findUnique({
            where: { id: id as string },
            include: {
                client: true,
                versions: {
                    orderBy: { versionNumber: 'desc' }
                }
            }
        });
        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }
        res.json(project);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch project details' });
    }
};

export const updateProject = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, clientId, location } = req.body;
    try {
        const project = await prisma.project.update({
            where: { id: id as string },
            data: { name, clientId, location },
            include: { client: true }
        });
        res.json(project);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update project' });
    }
};
