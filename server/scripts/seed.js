const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Seeding components...');

    const components = [
        {
            model: 'TM3DM24R',
            description: '24 IO Digital Mix Module (16DI/8DO)',
            brand: 'Schneider Electric',
            listPrice: 150.00,
            category: 'PLC',
            ioSpecs: { DI: 16, DO: 8, AI: 0, AO: 0, RTD: 0, HLI: 0 }
        },
        {
            model: 'TM221CE40R',
            description: 'Modicon M221 PLC 40 IO Relay',
            brand: 'Schneider Electric',
            listPrice: 450.00,
            category: 'PLC',
            ioSpecs: { DI: 24, DO: 16, AI: 2, AO: 0, RTD: 0, HLI: 0 }
        },
        {
            model: 'GXU3512',
            description: 'Magelis Easy GXU 7" HMI',
            brand: 'Schneider Electric',
            listPrice: 320.00,
            category: 'HMI',
            ioSpecs: { DI: 0, DO: 0, AI: 0, AO: 0, RTD: 0, HLI: 0 }
        },
        {
            model: 'ABL8REM24030',
            description: 'Phaseo Power Supply 100..240V AC, 24V DC, 3A',
            brand: 'Schneider Electric',
            listPrice: 85.00,
            category: 'NETWORK',
            ioSpecs: {}
        },
        {
            model: 'MCSESM083F23F0',
            description: 'Modicon Managed Switch 8 Ports',
            brand: 'Schneider Electric',
            listPrice: 550.00,
            category: 'NETWORK',
            ioSpecs: {}
        }
    ];

    for (const comp of components) {
        await prisma.componentCatalog.upsert({
            where: { model: comp.model },
            update: comp,
            create: comp
        });
    }

    console.log('Seeding finished.');
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
