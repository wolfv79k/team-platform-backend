import prisma from "../src/config/db.js"

const locationArray = ["Москва", "Санкт-Петербург", "Мурманск", "Нижний Новгород", "Красноярск", "Краснодар", "Новосибирск", "Владивосток", "Челябинск", "Екатеринбург"]
const skillArray = [
    // Фронтенд
    "JavaScript", "TypeScript", "React", "Next.js", "Vue.js", "HTML/CSS", "Tailwind CSS",
    // Бэкенд
    "Node.js", "Express", "Python", "Django", "Java", "Spring", "Go", "C#", ".NET", "PHP",
    // Базы данных
    "PostgreSQL", "MySQL", "MongoDB", "Redis", "Prisma",
    // DevOps
    "Docker", "Kubernetes", "GitHub Actions", "Linux", "Nginx",
    // Мобильная разработка
    "Kotlin", "Swift", "Flutter", "React Native",
    // Дизайн
    "Figma", "UI/UX", "Photoshop",
    // Аналитика и Data
    "SQL", "Pandas", "Machine Learning", "Power BI",
    // Геймдев
    "Unity", "Unreal Engine", "C++",
    // Прочее
    "Git", "QA", "Project Management",
]
const roleArray = ["Backend разработчик", "Frontend разработчик", "Full-stack разработчик", "Mobile", "DevOps", "Designer", "QA", "Analyst", "Project Manager", "Team Lead"]

for (const location of locationArray) {
    await prisma.location.upsert({
        where: { name: location },
        create: { name: location },
        update: {}
    })
}

for (const skill of skillArray) {
    await prisma.skill.upsert({
        where: { name: skill },
        create: { name: skill },
        update: {}
    })
}

for (const role of roleArray) {
    await prisma.role.upsert({
        where: { name: role },
        create: { name: role },
        update: {}
    })
}

await prisma.$disconnect()
console.log("Добавление завершено")


