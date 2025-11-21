const express = require('express');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { uploadPhotoProfil, handleUploadError } = require('../middleware/upload');
const Utilisateur = require('../models/Utilisateur');
const CloudinaryService = require('../services/cloudinaryService');

/**
 * @swagger
 * /api/profil/photo:
 *   post:
 *     summary: Uploader une photo de profil
 *     description: |
 *       Upload d'une photo de profil pour l'utilisateur connecté.
 *       - **Développement** : Stockage local dans le dossier uploads/profiles/
 *       - **Production** : Upload vers Cloudinary avec transformation automatique
 *       - Formats supportés : JPG, PNG, GIF, etc.
 *       - Taille maximale : 5MB
 *       - L'ancienne photo est automatiquement supprimée lors du remplacement
 *     tags: [Profil]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - photo_profil
 *             properties:
 *               photo_profil:
 *                 type: string
 *                 format: binary
 *                 description: "Image de profil (max 5MB, formats supportés : JPG, PNG, GIF, etc.)"
 *     responses:
 *       200:
 *         description: Photo de profil uploadée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UploadPhotoResponse'
 *       400:
 *         description: Erreur de validation
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Le fichier est trop volumineux. Taille maximale : 5MB"
 *       401:
 *         description: Token d'authentification manquant ou invalide
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Token d'authentification requis"
 *       404:
 *         description: Utilisateur non trouvé
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Utilisateur non trouvé"
 *       500:
 *         description: Erreur serveur ou erreur Cloudinary
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Erreur lors de l'upload de la photo de profil"
 */
router.post('/photo', auth, async (req, res, next) => {
        // Gestion des erreurs d'upload
        if (req.fileValidationError) {
            return res.status(400).json({
                success: false,
                message: req.fileValidationError
            });
        }
        
        if (req.fileError) {
            return res.status(400).json({
                success: false,
                message: req.fileError
            });
        }
        
        try {
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: 'Aucun fichier fourni'
                });
            }

            const utilisateur = await Utilisateur.trouverParId(req.utilisateur_id);
            if (!utilisateur) {
                return res.status(404).json({
                    success: false,
                    message: 'Utilisateur non trouvé'
                });
            }

            let photoUrl, photoData;

            // Gestion selon l'environnement
            if (process.env.NODE_ENV === 'production' && CloudinaryService.isConfigured()) {
                // Upload vers Cloudinary
                try {
                    const cloudinaryResult = await CloudinaryService.uploadImage(req.file.buffer);
                    photoUrl = cloudinaryResult.url;
                    photoData = {
                        url: photoUrl,
                        public_id: cloudinaryResult.public_id
                    };

                    // Supprimer l'ancienne photo de Cloudinary si elle existe
                    const anciennePhotoData = utilisateur.getPhotoProfilData();
                    if (anciennePhotoData && anciennePhotoData.public_id) {
                        await CloudinaryService.deleteImage(anciennePhotoData.public_id);
                    }

                    await utilisateur.mettreAJourPhotoProfilCloudinary(photoUrl, cloudinaryResult.public_id);
                } catch (cloudinaryError) {
                    console.error('Erreur Cloudinary:', cloudinaryError);
                    return res.status(500).json({
                        success: false,
                        message: 'Erreur lors de l\'upload vers Cloudinary'
                    });
                }
            } else {
                // Stockage local
                // Supprimer l'ancienne photo si elle existe
                const anciennePhotoData = utilisateur.getPhotoProfilData();
                if (anciennePhotoData && anciennePhotoData.type === 'local') {
                    const anciennePhotoPath = path.join(__dirname, '../../', anciennePhotoData.url);
                    if (fs.existsSync(anciennePhotoPath)) {
                        fs.unlinkSync(anciennePhotoPath);
                    }
                }

                const cheminPhoto = `uploads/profiles/${req.file.filename}`;
                await utilisateur.mettreAJourPhotoProfil(cheminPhoto);
                photoUrl = cheminPhoto;
                photoData = { url: photoUrl, type: 'local' };
            }

            res.json({
                success: true,
                message: 'Photo de profil mise à jour avec succès',
                photo_profil: photoData,
                photo_url: photoUrl
            });

        } catch (error) {
            console.error('Erreur lors de l\'upload de la photo de profil:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur lors de l\'upload de la photo de profil'
            });
        }
    }
);

/**
 * @swagger
 * /api/profil/photo:
 *   delete:
 *     summary: Supprimer la photo de profil
 *     description: |
 *       Supprime la photo de profil de l'utilisateur connecté.
 *       - **Développement** : Supprime le fichier local
 *       - **Production** : Supprime l'image de Cloudinary
 *       - Met à jour la base de données
 *     tags: [Profil]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Photo de profil supprimée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Photo de profil supprimée avec succès"
 *       400:
 *         description: Aucune photo de profil à supprimer
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Aucune photo de profil à supprimer"
 *       401:
 *         description: Token d'authentification manquant ou invalide
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Token d'authentification requis"
 *       404:
 *         description: Utilisateur non trouvé
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Utilisateur non trouvé"
 *       500:
 *         description: Erreur serveur
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Erreur lors de la suppression de la photo de profil"
 */
router.delete('/photo', auth, async (req, res) => {
    try {
        const utilisateur = await Utilisateur.trouverParId(req.utilisateur_id);
        if (!utilisateur) {
            return res.status(404).json({
                success: false,
                message: 'Utilisateur non trouvé'
            });
        }

        const photoData = utilisateur.getPhotoProfilData();
        if (!photoData) {
            return res.status(400).json({
                success: false,
                message: 'Aucune photo de profil à supprimer'
            });
        }

        // Supprimer selon le type de stockage
        if (process.env.NODE_ENV === 'production' && CloudinaryService.isConfigured() && photoData.public_id) {
            // Supprimer de Cloudinary
            try {
                await CloudinaryService.deleteImage(photoData.public_id);
            } catch (cloudinaryError) {
                console.error('Erreur lors de la suppression Cloudinary:', cloudinaryError);
                // Continuer même si la suppression Cloudinary échoue
            }
        } else if (photoData.type === 'local') {
            // Supprimer le fichier local
            const photoPath = path.join(__dirname, '../../', photoData.url);
            if (fs.existsSync(photoPath)) {
                fs.unlinkSync(photoPath);
            }
        }

        // Mettre à jour la base de données
        await utilisateur.mettreAJourPhotoProfil(null);

        res.json({
            success: true,
            message: 'Photo de profil supprimée avec succès'
        });

    } catch (error) {
        console.error('Erreur lors de la suppression de la photo de profil:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la suppression de la photo de profil'
        });
    }
});

/**
 * @swagger
 * /api/profil/photo/{filename}:
 *   get:
 *     summary: Récupérer une photo de profil
 *     description: |
 *       Récupère une photo de profil par son nom de fichier.
 *       - **Développement** : Sert le fichier depuis le stockage local
 *       - **Production** : Retourne un message indiquant que les photos sont servies depuis Cloudinary
 *       - Les photos en production sont accessibles directement via les URLs Cloudinary
 *     tags: [Profil]
 *     parameters:
 *       - in: path
 *         name: filename
 *         required: true
 *         schema:
 *           type: string
 *         description: "Nom du fichier de la photo (ex: profile-1234567890.jpg)"
 *         example: "profile-1234567890.jpg"
 *     responses:
 *       200:
 *         description: Photo de profil (développement uniquement)
 *         content:
 *           image/*:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: Photo non trouvée ou service non disponible en production
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Photos servies directement depuis Cloudinary"
 */
router.get('/photo/:filename', (req, res) => {
    const filename = req.params.filename;
    
    // En production avec Cloudinary, rediriger vers l'URL Cloudinary
    if (process.env.NODE_ENV === 'production' && CloudinaryService.isConfigured()) {
        return res.status(404).json({
            success: false,
            message: 'Photos servies directement depuis Cloudinary'
        });
    }
    
    // En développement, servir depuis le stockage local
    const photoPath = path.join(__dirname, '../../uploads/profiles', filename);

    if (!fs.existsSync(photoPath)) {
        return res.status(404).json({
            success: false,
            message: 'Photo non trouvée'
        });
    }

    res.sendFile(photoPath);
});

/**
 * @swagger
 * /api/profil:
 *   get:
 *     summary: Récupérer les informations du profil utilisateur
 *     description: |
 *       Récupère les informations complètes du profil de l'utilisateur connecté.
 *       - Inclut les données de la photo de profil (si configurée)
 *       - Les données de photo_profil sont au format JSON string
 *       - Exclut le mot de passe des données retournées
 *     tags: [Profil]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Informations du profil récupérées avec succès
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProfilResponse'
 *       401:
 *         description: Token d'authentification manquant ou invalide
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Token d'authentification requis"
 *       404:
 *         description: Utilisateur non trouvé
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Utilisateur non trouvé"
 *       500:
 *         description: Erreur serveur
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Erreur lors de la récupération du profil"
 */
router.get('/', auth, async (req, res) => {
    try {
        const utilisateur = await Utilisateur.trouverParId(req.utilisateur_id);
        if (!utilisateur) {
            return res.status(404).json({
                success: false,
                message: 'Utilisateur non trouvé'
            });
        }

        res.json({
            success: true,
            utilisateur: utilisateur.toJSON()
        });

    } catch (error) {
        console.error('Erreur lors de la récupération du profil:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération du profil'
        });
    }
});

module.exports = router;
