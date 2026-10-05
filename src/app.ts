import express from 'express'
import healthRouter from './routes/health.routes.js'
import notFound from './middlewares/notFound.js'
import errorHandler from './middlewares/errorHandler.js'

const app = express()

app.use('/api', healthRouter)
app.use(notFound)
app.use(errorHandler)

export default app