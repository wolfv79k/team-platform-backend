import express from 'express'
import healthRouter from './routes/health.routes.js'
import authRouter from './routes/auth.routes.js'
import dictionaryRouter from './routes/dictionary.routes.js'
import userRouter from "./routes/user.routes.js"
import projectRouter from "./routes/project.routes.js"
import communityRouter from "./routes/community.routes.js"
import ideaRouter from "./routes/idea.routes.js"
import applicationRouter from "./routes/application.routes.js"
import adminRouter from "./routes/admin.routes.js"
import notificationRouter from "./routes/notification.routes.js"
import hackathonRouter from "./routes/hackathon.routes.js"
import teamRouter from "./routes/team.routes.js"
import notFound from './middlewares/notFound.js'
import errorHandler from './middlewares/errorHandler.js'
import cors from 'cors'

const app = express()
const CLIENT_URL = process.env.CLIENT_URL

if (!CLIENT_URL) {
    throw new Error('CLIENT_URL не задан в .env')
}

app.use(cors({ origin: CLIENT_URL }))
app.use(express.json())
app.use('/api', healthRouter)
app.use('/api', dictionaryRouter)
app.use('/api/auth', authRouter)
app.use('/api/users', userRouter)
app.use('/api/projects', projectRouter)
app.use('/api/communities', communityRouter)
app.use('/api/ideas', ideaRouter)
app.use('/api/applications', applicationRouter)
app.use('/api/notifications', notificationRouter)
app.use('/api/hackathons', hackathonRouter)
app.use('/api/teams', teamRouter)
app.use('/api/admin', adminRouter)
app.use(notFound)
app.use(errorHandler)

export default app
