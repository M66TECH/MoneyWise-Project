const multer = require('multer');
const path = require('path');
const fs = require('fs');
const CloudinaryService = require('../services/cloudinaryService');

// Configuration du stockage local (pour développement)
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '../../uploads/profiles');
        
        // Créer le dossier s'il n'existe pas
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // Générer un nom de fichier unique avec timestamp
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const extension = path.extname(file.originalname);
        cb(null, 'profile-' + uniqueSuffix + extension);
    }
});

// Configuration du stockage mémoire (pour Cloudinary)
const memoryStorage = multer.memoryStorage();

// Filtre pour les types de fichiers autorisés
const fileFilter = (req, file, cb) => {
    // Vérifier le type MIME
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Seules les images sont autorisées'), false);
    }
};

// Configuration de multer pour stockage local
const uploadLocal = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB max
    }
});

// Configuration de multer pour Cloudinary (stockage en mémoire)
const uploadCloudinary = multer({
    storage: memoryStorage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB max
    }
});

// Middleware pour uploader une seule image de profil (choix automatique)
const uploadPhotoProfil = (req, res, next) => {
    // Utiliser Cloudinary en production si configuré
    if (process.env.NODE_ENV === 'production' && CloudinaryService.isConfigured()) {
        return uploadCloudinary.single('photo_profil')(req, res, next);
    } else {
        // Utiliser le stockage local en développement
        return uploadLocal.single('photo_profil')(req, res, next);
    }
};

// Middleware pour gérer les erreurs d'upload
const handleUploadError = (error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                message: 'Le fichier est trop volumineux. Taille maximale : 5MB'
            });
        }
        return res.status(400).json({
            success: false,
            message: 'Erreur lors de l\'upload du fichier'
        });
    }
    
    if (error.message === 'Seules les images sont autorisées') {
        return res.status(400).json({
            success: false,
            message: 'Seules les images sont autorisées'
        });
    }
    
    next(error);
};

module.exports = {
    uploadPhotoProfil,
    handleUploadError
};
