import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const email = process.argv[2]?.toLowerCase();
    const newPassword = process.argv[3] || 'Password123!';

    if (!email) {
        console.error('Usage: npx ts-node src/reset-password.ts <email> [newPassword]');
        process.exit(1);
    }

    const user = await prisma.user.findUnique({
        where: { email }
    });

    if (!user) {
        console.error(`User not found: ${email}`);
        process.exit(1);
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword }
    });

    console.log(`Password reset for ${email}: ${newPassword}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
