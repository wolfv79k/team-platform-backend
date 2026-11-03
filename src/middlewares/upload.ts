import multer from "multer"
import { AppError } from "../utils/AppError.js"

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"]

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 4 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (ALLOWED_TYPES.includes(file.mimetype)) {
            cb(null, true)
        } else {
            cb(new AppError("Допустимы только JPEG, PNG или WebP", 400))
        }
    }
})

export default upload