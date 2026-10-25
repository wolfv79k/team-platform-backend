import prisma from "../config/db.js"

export async function getSkills() {
    return await prisma.skill.findMany({ orderBy: { name: 'asc' } })
}

export async function getRoles() {
    return await prisma.role.findMany({ orderBy: { name: 'asc' } })
}

export async function getLocations() {
    return await prisma.location.findMany({ orderBy: { name: 'asc' } })
}