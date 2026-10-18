const secret = process.env.JWT_SECRET

if (!secret) {
    throw new Error('JWT_SECRET не задан в .env')
}

const JWT_SECRET: string = secret

export default JWT_SECRET