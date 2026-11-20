// Проверка заявок и приглашений целиком, через настоящие HTTP-запросы.
// Запуск с отдельным тестовым сервером и его изолированной БД:
//   npx tsx --env-file=.env.test scripts/test-applications.ts
// TEST_BASE_URL указывает на тестовый сервер, TEST_DATABASE_URL — на ту же БД,
// которая указана в DATABASE_URL тестового сервера.

import bcrypt from "bcryptjs"
import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "../src/generated/prisma/client.js"

const { TEST_BASE_URL: BASE, TEST_DATABASE_URL } = process.env
if (!BASE || !TEST_DATABASE_URL) {
    throw new Error("Укажите TEST_BASE_URL и TEST_DATABASE_URL для изолированного тестового окружения")
}
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: TEST_DATABASE_URL }) })
const PREFIX = `agent_test_${Date.now().toString(36)}`

let passed = 0
let failed = 0

function check(name: string, ok: boolean, details?: unknown) {
    if (ok) {
        passed++
        console.log(`  OK   ${name}`)
    } else {
        failed++
        console.log(`  FAIL ${name}`, details ?? "")
    }
}

async function api(method: string, path: string, token?: string, body?: unknown) {
    const headers: Record<string, string> = {}
    if (token) headers.Authorization = `Bearer ${token}`
    if (body !== undefined) headers["Content-Type"] = "application/json"

    const res = await fetch(BASE + path, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body)
    })
    const text = await res.text()
    let data: any = null
    try { data = text ? JSON.parse(text) : null } catch { data = text }
    return { status: res.status, data }
}

async function createUser(name: string, locationId: number) {
    const email = `${PREFIX}_${name}@example.com`
    const username = `${PREFIX}_${name}`
    const password = "test123456"
    await prisma.user.create({
        data: { email, username, passwordHash: await bcrypt.hash(password, 10), locationId, emailVerified: true }
    })
    const login = await api("POST", "/api/auth/login", undefined, { email, password })
    if (login.status !== 200) throw new Error(`Логин ${name} не удался: ${login.status} ${JSON.stringify(login.data)}`)
    return { id: login.data.user.id as number, token: login.data.token as string }
}

async function openRoleSlots(projectId: number, roleId: number) {
    const p = await api("GET", `/api/projects/${projectId}`)
    const role = p.data.projectOpenRoles.find((r: any) => r.roleId === roleId)
    return role ? role.slots as number : null
}

async function main() {
    console.log(`Сервер: ${BASE}`)
    const health = await api("GET", "/api/health").catch(() => null)
    if (!health || health.status !== 200) {
        throw new Error("Сервер не отвечает. Запусти npm run dev в другом терминале.")
    }

    const roles = (await api("GET", "/api/roles")).data as { id: number }[]
    const locations = (await api("GET", "/api/locations")).data as { id: number }[]
    if (roles.length < 2 || locations.length < 1) throw new Error("Справочники пустые: запусти npm run seed")
    const r1 = roles[0]!.id
    const r2 = roles[1]!.id
    const loc = locations[0]!.id

    const A = await createUser("author", loc)
    const B = await createUser("b", loc)
    const C = await createUser("c", loc)
    const D = await createUser("d", loc)
    const E = await createUser("e", loc)

    const created = await api("POST", "/api/projects", A.token, { name: `${PREFIX} project`, roleId: r1 })
    const projectId = created.data.id as number
    await api("PUT", `/api/projects/${projectId}/roles/${r2}`, A.token, { slots: 1 })

    console.log("\n1. Подать заявку")
    const noToken = await api("POST", `/api/projects/${projectId}/applications`, undefined, { roleId: r2 })
    check("без токена → 401", noToken.status === 401, noToken)
    const badRole = await api("POST", `/api/projects/${projectId}/applications`, B.token, { roleId: "x" })
    check("roleId не число → 400", badRole.status === 400, badRole)
    const notOpen = await api("POST", `/api/projects/${projectId}/applications`, B.token, { roleId: r1 })
    check("роль не открыта → 400", notOpen.status === 400, notOpen)
    const byAuthor = await api("POST", `/api/projects/${projectId}/applications`, A.token, { roleId: r2 })
    check("автор в свой проект → 400", byAuthor.status === 400, byAuthor)
    const noProject = await api("POST", `/api/projects/99999999/applications`, B.token, { roleId: r2 })
    check("несуществующий проект → 404", noProject.status === 404, noProject)
    const longMsg = await api("POST", `/api/projects/${projectId}/applications`, B.token, { roleId: r2, message: "a".repeat(1001) })
    check("сообщение длиннее 1000 → 400", longMsg.status === 400, longMsg)
    const applyB = await api("POST", `/api/projects/${projectId}/applications`, B.token, { roleId: r2, message: "Хочу в команду" })
    check("заявка B → 201 PENDING REQUEST", applyB.status === 201 && applyB.data.status === "PENDING" && applyB.data.type === "REQUEST", applyB)
    check("в ответе нет email и passwordHash", applyB.data?.user && !("email" in applyB.data.user) && !("passwordHash" in applyB.data.user), applyB.data?.user)
    const applyB2 = await api("POST", `/api/projects/${projectId}/applications`, B.token, { roleId: r2 })
    check("повторная заявка → 409", applyB2.status === 409, applyB2)
    const appB = applyB.data.id as number

    console.log("\n2. Списки")
    const listA = await api("GET", `/api/projects/${projectId}/applications`, A.token)
    check("автор видит заявки проекта", listA.status === 200 && listA.data.length === 1, listA)
    const listFiltered = await api("GET", `/api/projects/${projectId}/applications?status=ACCEPTED`, A.token)
    check("фильтр status=ACCEPTED → пусто", listFiltered.status === 200 && listFiltered.data.length === 0, listFiltered)
    const badFilter = await api("GET", `/api/projects/${projectId}/applications?status=WRONG`, A.token)
    check("неверный status → 400", badFilter.status === 400, badFilter)
    const listByB = await api("GET", `/api/projects/${projectId}/applications`, B.token)
    check("не автор не видит заявки проекта → 403", listByB.status === 403, listByB)
    const myB = await api("GET", "/api/users/me/applications", B.token)
    check("B видит свою заявку в /users/me/applications", myB.status === 200 && myB.data.length === 1 && myB.data[0].id === appB, myB)

    console.log("\n3. Принять заявку")
    const acceptByC = await api("POST", `/api/applications/${appB}/accept`, C.token)
    check("посторонний принимает → 403", acceptByC.status === 403, acceptByC)
    const acceptByB = await api("POST", `/api/applications/${appB}/accept`, B.token)
    check("заявитель принимает свою заявку → 403", acceptByB.status === 403, acceptByB)
    const accept = await api("POST", `/api/applications/${appB}/accept`, A.token)
    check("автор принимает → 200 ACCEPTED", accept.status === 200 && accept.data.status === "ACCEPTED", accept)
    const project1 = await api("GET", `/api/projects/${projectId}`)
    check("B стал участником с ролью r2", project1.data.projectMembers.some((m: any) => m.userId === B.id && m.roleId === r2), project1.data.projectMembers)
    check("роль осталась в проекте со slots 0", (await openRoleSlots(projectId, r2)) === 0)
    const acceptAgain = await api("POST", `/api/applications/${appB}/accept`, A.token)
    check("повторное принятие → 409", acceptAgain.status === 409, acceptAgain)
    const feed = await api("GET", `/api/projects?roleId=${r2}&limit=50`)
    check("лента ?roleId не показывает роль без мест", !feed.data.items.some((p: any) => p.id === projectId), feed.data)

    console.log("\n4. Приглашения")
    const inviteNoSlots = await api("POST", `/api/projects/${projectId}/invitations`, A.token, { userId: C.id, roleId: r2 })
    check("приглашение без мест → 409", inviteNoSlots.status === 409, inviteNoSlots)
    await api("PUT", `/api/projects/${projectId}/roles/${r2}`, A.token, { slots: 2 })
    const inviteByB = await api("POST", `/api/projects/${projectId}/invitations`, B.token, { userId: C.id, roleId: r2 })
    check("приглашает не автор → 403", inviteByB.status === 403, inviteByB)
    const inviteSelf = await api("POST", `/api/projects/${projectId}/invitations`, A.token, { userId: A.id, roleId: r2 })
    check("пригласить себя → 400", inviteSelf.status === 400, inviteSelf)
    const inviteGhost = await api("POST", `/api/projects/${projectId}/invitations`, A.token, { userId: 99999999, roleId: r2 })
    check("несуществующий пользователь → 404", inviteGhost.status === 404, inviteGhost)
    const inviteMember = await api("POST", `/api/projects/${projectId}/invitations`, A.token, { userId: B.id, roleId: r2 })
    check("пригласить участника → 409", inviteMember.status === 409, inviteMember)

    const inv1 = await api("POST", `/api/projects/${projectId}/invitations`, A.token, { userId: C.id, roleId: r2 })
    check("приглашение C → 201 INVITATION", inv1.status === 201 && inv1.data.type === "INVITATION", inv1)
    const applyC = await api("POST", `/api/projects/${projectId}/applications`, C.token, { roleId: r2 })
    check("заявка поверх висящего приглашения → 409", applyC.status === 409, applyC)
    const acceptInvByA = await api("POST", `/api/applications/${inv1.data.id}/accept`, A.token)
    check("автор принимает своё приглашение → 403", acceptInvByA.status === 403, acceptInvByA)
    const decline = await api("POST", `/api/applications/${inv1.data.id}/decline`, C.token)
    check("C отклоняет → 200 DECLINED", decline.status === 200 && decline.data.status === "DECLINED", decline)
    const acceptDeclined = await api("POST", `/api/applications/${inv1.data.id}/accept`, C.token)
    check("принять отклонённое → 409", acceptDeclined.status === 409, acceptDeclined)

    const inv2 = await api("POST", `/api/projects/${projectId}/invitations`, A.token, { userId: C.id, roleId: r2 })
    check("повторное приглашение после отказа → 201", inv2.status === 201, inv2)
    const withdrawByC = await api("DELETE", `/api/applications/${inv2.data.id}`, C.token)
    check("приглашённый не может отозвать приглашение → 403", withdrawByC.status === 403, withdrawByC)
    const withdraw = await api("DELETE", `/api/applications/${inv2.data.id}`, A.token)
    check("автор отзывает приглашение → 204", withdraw.status === 204, withdraw)
    const withdrawAgain = await api("DELETE", `/api/applications/${inv2.data.id}`, A.token)
    check("отозвать удалённое → 404", withdrawAgain.status === 404, withdrawAgain)

    const inv3 = await api("POST", `/api/projects/${projectId}/invitations`, A.token, { userId: C.id, roleId: r2, message: "Ждём тебя" })
    const acceptInv = await api("POST", `/api/applications/${inv3.data.id}/accept`, C.token)
    check("C принимает приглашение → 200", acceptInv.status === 200 && acceptInv.data.status === "ACCEPTED", acceptInv)
    check("места r2: 2 → 1", (await openRoleSlots(projectId, r2)) === 1)

    console.log("\n5. Одновременное принятие на последнее место")
    const applyD = await api("POST", `/api/projects/${projectId}/applications`, D.token, { roleId: r2 })
    const applyE = await api("POST", `/api/projects/${projectId}/applications`, E.token, { roleId: r2 })
    check("D и E подали заявки", applyD.status === 201 && applyE.status === 201, [applyD, applyE])
    const [accD, accE] = await Promise.all([
        api("POST", `/api/applications/${applyD.data.id}/accept`, A.token),
        api("POST", `/api/applications/${applyE.data.id}/accept`, A.token)
    ])
    const statuses = [accD.status, accE.status].sort()
    check("одна принята (200), вторая → 409", statuses[0] === 200 && statuses[1] === 409, [accD, accE])
    check("места не ушли в минус", (await openRoleSlots(projectId, r2)) === 0)
    const project2 = await api("GET", `/api/projects/${projectId}`)
    const joined = project2.data.projectMembers.filter((m: any) => m.userId === D.id || m.userId === E.id).length
    check("в проект попал ровно один из двух", joined === 1, project2.data.projectMembers)
    const loser = accD.status === 409 ? applyD.data.id : applyE.data.id
    const loserList = await api("GET", `/api/projects/${projectId}/applications?status=PENDING`, A.token)
    check("проигравшая заявка осталась PENDING (транзакция откатилась)", loserList.data.some((a: any) => a.id === loser), loserList.data)

    console.log("\n6. Проект не набирает команду")
    await api("PATCH", `/api/projects/${projectId}`, A.token, { status: "IN_PROGRESS" })
    const pendingLeft = loserList.data.find((a: any) => a.id === loser)
    const loserUser = pendingLeft ? (pendingLeft.userId === D.id ? D : E) : D
    await api("DELETE", `/api/applications/${loser}`, loserUser.token)
    const applyClosed = await api("POST", `/api/projects/${projectId}/applications`, loserUser.token, { roleId: r2 })
    check("заявка в проект IN_PROGRESS → 400", applyClosed.status === 400, applyClosed)
}

async function cleanup() {
    const users = await prisma.user.findMany({ where: { username: { startsWith: PREFIX } }, select: { id: true } })
    const ids = users.map(u => u.id)
    if (ids.length === 0) return
    await prisma.projectApplication.deleteMany({ where: { userId: { in: ids } } })
    await prisma.project.deleteMany({ where: { authorId: { in: ids } } })
    await prisma.projectMember.deleteMany({ where: { userId: { in: ids } } })
    await prisma.user.deleteMany({ where: { id: { in: ids } } })
    console.log(`\nУдалены тестовые данные: ${ids.length} пользователей и их проекты`)
}

main()
    .catch(err => {
        failed++
        console.error("\nТест остановился с ошибкой:", err instanceof Error ? err.message : err)
    })
    .finally(async () => {
        await cleanup().catch(err => console.error("Не удалось почистить тестовые данные:", err))
        await prisma.$disconnect()
        console.log(`\nИтог: ${passed} OK, ${failed} FAIL`)
        process.exitCode = failed === 0 ? 0 : 1
    })
