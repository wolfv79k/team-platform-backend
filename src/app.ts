import express from 'express'
import healthRouter from './routes/health.routes.js'
import authRouter from './routes/auth.routes.js'
import dictionaryRouter from './routes/dictionary.routes.js'
import userRouter from "./routes/user.routes.js"
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
app.use(notFound)
app.use(errorHandler)

export default app
