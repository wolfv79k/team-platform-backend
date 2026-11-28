import prisma from "../config/db.js"

export async function isAdmin(userId: number) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true }
    })

    return user?.role === "ADMIN"
}
