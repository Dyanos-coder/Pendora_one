import multer from 'multer'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 Mo

/** Upload en mémoire (pas de dossier temporaire) — les octets vont directement en BLOB MySQL. */
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      cb(new Error('Seules les images sont acceptées.'))
      return
    }
    cb(null, true)
  }
})
