import { Resend } from "resend"

export async function sendVerificationEmail(email: string, code: string, validForMinutes: number) {
    const RESEND_API_KEY = process.env.RESEND_API_KEY
    const EMAIL_FROM = process.env.EMAIL_FROM

    if (!RESEND_API_KEY || !EMAIL_FROM) {
        console.warn("Отправка кода недоступна: требуется RESEND_API_KEY и EMAIL_FROM")
        return false
    }

    try {
        const resend = new Resend(RESEND_API_KEY)
        const { data, error } = await resend.emails.send({
            from: EMAIL_FROM,
            to: [email],
            subject: "Подтверждение email на IT Team Platform",
            text: `Код подтверждения: ${code}\nКод действует ${validForMinutes} минут.`
        }, { signal: AbortSignal.timeout(10_000) })

        if (!error && data?.id) {
            return true
        }
    } catch {
        // Ошибка провайдера может содержать данные письма.
    }

    console.warn("Resend не принял письмо с кодом подтверждения")
    return false
}
