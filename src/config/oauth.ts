const secret = process.env.AUTH_INTERNAL_SECRET

if (!secret) {
    throw new Error('AUTH_INTERNAL_SECRET не задан в .env')
}

const AUTH_INTERNAL_SECRET: string = secret

export default AUTH_INTERNAL_SECRET