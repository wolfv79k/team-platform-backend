import { createClient } from "@supabase/supabase-js"

const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url) {
    throw new Error("SUPABASE_URL не указан в .env")
}

if (!key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY не указан в .env")
}

const supabase = createClient(url, key, {
    auth: { persistSession: false }
})

export default supabase