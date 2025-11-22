const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const Utilisateur = require('../models/Utilisateur');
const PasswordResetToken = require('../models/PasswordResetToken');
const EmailVerificationToken = require('../models/EmailVerificationToken');
const emailService = require('../services/emailService');
const CloudinaryService = require('../services/cloudinaryService');
const { auth } = require('../middleware/auth');
const { query } = require('../config/database');

// Configuration multer pour l'upload de photos
const multer = require('multer');

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

// Middleware pour uploader une photo de profil (choix automatique)
const uploadPhotoProfil = (req, res, next) => {
  // Utiliser Cloudinary en production si configuré
  if (process.env.NODE_ENV === 'production' && CloudinaryService.isConfigured()) {
    return uploadCloudinary.single('photo_profil')(req, res, next);
  } else {
    // Utiliser le stockage local en développement
    return uploadLocal.single('photo_profil')(req, res, next);
  }
};

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Authentification
 *   description: Gestion de l'authentification des utilisateurs
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Utilisateur:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         email:
 *           type: string
 *           format: email
 *           example: user@example.com
 *         prenom:
 *           type: string
 *           example: Jean
 *         nom:
 *           type: string
 *           example: Dupont
 *         email_verifie:
 *           type: boolean
 *           example: false

 *         date_creation:
 *           type: string
 *           format: date-time
 *           example: "2024-01-01T00:00:00.000Z"
 *         date_modification:
 *           type: string
 *           format: date-time
 *           example: "2024-01-01T00:00:00.000Z"
 *     Error:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           example: Message d'erreur
 *     TokenResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           example: Opération réussie
 *         utilisateur:
 *           $ref: '#/components/schemas/Utilisateur'
 *         token:
 *           type: string
 *           example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Inscription d'un nouvel utilisateur
 *     tags: [Authentification]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - firstName
 *               - lastName
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 example: password123
 *               firstName:
 *                 type: string
 *                 example: Jean
 *               lastName:
 *                 type: string
 *                 example: Dupont
 *     responses:
 *       201:
 *         description: Utilisateur créé avec succès et email de vérification envoyé
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Inscription réussie ! Veuillez vérifier votre email pour activer votre compte.
 *                 utilisateur:
 *                   $ref: '#/components/schemas/Utilisateur'
 *       500:
 *         description: Erreur lors de l'envoi de l'email de vérification
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       400:
 *         description: Données invalides
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: Email déjà utilisé
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// Inscription d'un nouvel utilisateur
router.post('/register', uploadPhotoProfil, async (req, res, next) => {
  try {
    const { email, password, firstName, lastName } = req.body;

    // Validation des données
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({
        message: 'Tous les champs sont requis'
      });
    }

    // Vérifier si l'utilisateur existe déjà
    const utilisateurExistant = await Utilisateur.trouverParEmail(email);
    if (utilisateurExistant) {
      return res.status(409).json({
        message: 'Un utilisateur avec cet email existe déjà'
      });
    }

    // Créer le nouvel utilisateur (non vérifié)
    const nouvelUtilisateur = await Utilisateur.creer({
      email,
      mot_de_passe: password,
      prenom: firstName,
      nom: lastName
    });

    // Gérer l'upload de photo de profil si fournie
    if (req.file) {
      try {
        let photoUrl, photoData;

        // Gestion selon l'environnement
        if (process.env.NODE_ENV === 'production' && CloudinaryService.isConfigured()) {
          // Upload vers Cloudinary
          const cloudinaryResult = await CloudinaryService.uploadImage(req.file.buffer);
          photoUrl = cloudinaryResult.url;
          photoData = {
            url: photoUrl,
            public_id: cloudinaryResult.public_id
          };

          await nouvelUtilisateur.mettreAJourPhotoProfilCloudinary(photoUrl, cloudinaryResult.public_id);
        } else {
          // Stockage local
          const cheminPhoto = `uploads/profiles/${req.file.filename}`;
          await nouvelUtilisateur.mettreAJourPhotoProfil(cheminPhoto);
          photoUrl = cheminPhoto;
          photoData = { url: photoUrl, type: 'local' };
        }

        // Mettre à jour l'utilisateur avec les données de photo
        nouvelUtilisateur.photo_profil = JSON.stringify(photoData);
      } catch (photoError) {
        console.error('Erreur lors de l\'upload de la photo de profil:', photoError);
        // Continuer sans la photo si l'upload échoue
      }
    }

    // Créer le token de vérification d'email
    const verificationToken = await EmailVerificationToken.creer(nouvelUtilisateur.id);

    // Envoyer l'email de vérification (ne pas bloquer l'inscription si l'email échoue)
    try {
      const emailResult = await emailService.envoyerEmailVerificationInscription({
        email: nouvelUtilisateur.email,
        prenom: nouvelUtilisateur.prenom,
        nom: nouvelUtilisateur.nom,
        token: verificationToken.token
      });
      
      // Si l'email a été ignoré (configuration manquante), continuer quand même
      if (emailResult && emailResult.skipped) {
        console.warn('⚠️ Email de vérification non envoyé (configuration manquante)');
      }
    } catch (emailError) {
      console.error('Erreur lors de l\'envoi de l\'email de vérification:', emailError);
      // Ne pas supprimer l'utilisateur - il pourra demander un nouvel email plus tard
      // L'inscription est réussie même si l'email échoue
      console.warn('⚠️ L\'utilisateur a été créé mais l\'email de vérification n\'a pas pu être envoyé.');
      console.warn('💡 L\'utilisateur pourra demander un nouvel email de vérification depuis l\'interface.');
    }

    res.status(201).json({
      message: 'Inscription réussie ! Veuillez vérifier votre email pour activer votre compte.',
      utilisateur: nouvelUtilisateur.toJSON()
    });
  } catch (erreur) {
    next(erreur);
  }
});

/**
 * @swagger
 * /api/auth/verify-email:
 *   post:
 *     summary: Vérifier l'email d'un utilisateur
 *     tags: [Authentification]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *                 description: Token de vérification reçu par email
 *                 example: "abc123def456"
 *     responses:
 *       200:
 *         description: Email vérifié avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Email vérifié avec succès"
 *                 utilisateur:
 *                   $ref: '#/components/schemas/Utilisateur'
 *       400:
 *         description: Token invalide ou expiré
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Token non trouvé
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// Vérification d'email
router.post('/verify-email', async (req, res, next) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        message: 'Token de vérification requis'
      });
    }

    // Trouver le token de vérification
    const verificationToken = await EmailVerificationToken.trouverParToken(token);
    if (!verificationToken) {
      return res.status(404).json({
        message: 'Token de vérification invalide ou expiré'
      });
    }

    // Trouver l'utilisateur
    const utilisateur = await Utilisateur.trouverParId(verificationToken.utilisateur_id);
    if (!utilisateur) {
      return res.status(404).json({
        message: 'Utilisateur non trouvé'
      });
    }

    // Vérifier l'email
    await utilisateur.verifierEmail();
    
    // Marquer le token comme utilisé
    await verificationToken.marquerCommeUtilise();

    // Générer le token JWT
    const jwtToken = jwt.sign(
      { utilisateur_id: utilisateur.id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(200).json({
      message: 'Email vérifié avec succès ! Votre compte est maintenant actif.',
      utilisateur: utilisateur.toJSON(),
      token: jwtToken
    });
  } catch (erreur) {
    next(erreur);
  }
});

/**
 * @swagger
 * /api/auth/resend-verification:
 *   post:
 *     summary: Renvoyer l'email de vérification
 *     tags: [Authentification]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *     responses:
 *       200:
 *         description: Email de vérification renvoyé
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Email de vérification renvoyé
 *       400:
 *         description: Email manquant
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Utilisateur non trouvé ou déjà vérifié
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
/**
 * @swagger
 * /api/auth/resend-verification:
 *   post:
 *     summary: Renvoyer l'email de vérification
 *     tags: [Authentification]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email de l'utilisateur non vérifié
 *                 example: "user@example.com"
 *     responses:
 *       200:
 *         description: Email de vérification renvoyé avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Email de vérification renvoyé avec succès"
 *       400:
 *         description: Email requis
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Utilisateur non trouvé ou email déjà vérifié
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Erreur lors de l'envoi de l'email
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// Renvoyer l'email de vérification
router.post('/resend-verification', async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        message: 'Email requis'
      });
    }

    // Trouver l'utilisateur non vérifié
    const utilisateur = await Utilisateur.trouverParEmailNonVerifie(email);
    if (!utilisateur) {
      return res.status(404).json({
        message: 'Utilisateur non trouvé ou email déjà vérifié'
      });
    }

    // Supprimer les anciens tokens
    await EmailVerificationToken.supprimerTokensUtilisateur(utilisateur.id);

    // Créer un nouveau token
    const verificationToken = await EmailVerificationToken.creer(utilisateur.id);

    // Envoyer l'email de vérification
    try {
      await emailService.envoyerEmailVerificationInscription({
        email: utilisateur.email,
        prenom: utilisateur.prenom,
        nom: utilisateur.nom,
        token: verificationToken.token
      });
    } catch (emailError) {
      console.error('Erreur lors de l\'envoi de l\'email de vérification:', emailError);
      return res.status(500).json({
        message: 'Erreur lors de l\'envoi de l\'email de vérification. Veuillez réessayer.'
      });
    }

    res.status(200).json({
      message: 'Email de vérification renvoyé avec succès'
    });
  } catch (erreur) {
    next(erreur);
  }
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Connexion utilisateur
 *     tags: [Authentification]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 example: password123
 *     responses:
 *       200:
 *         description: Connexion réussie
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Connexion réussie
 *                 utilisateur:
 *                   $ref: '#/components/schemas/Utilisateur'
 *                 token:
 *                   type: string
 *                   example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *       400:
 *         description: Données invalides
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Email ou mot de passe incorrect
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Email non vérifié
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Veuillez vérifier votre email avant de vous connecter. Vérifiez votre boîte de réception.
 *                 emailNonVerifie:
 *                   type: boolean
 *                   example: true
 */
// Connexion utilisateur
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validation des données
    if (!email || !password) {
      return res.status(400).json({
        message: 'Email et mot de passe requis'
      });
    }

    // Trouver l'utilisateur
    const utilisateur = await Utilisateur.trouverParEmail(email);
    if (!utilisateur) {
      return res.status(401).json({
        message: 'Email ou mot de passe incorrect'
      });
    }

    // Vérifier le mot de passe
    const motDePasseValide = await utilisateur.comparerMotDePasse(password);
    if (!motDePasseValide) {
      return res.status(401).json({
        message: 'Email ou mot de passe incorrect'
      });
    }

    // Vérifier que l'email est vérifié
    if (!utilisateur.email_verifie) {
      return res.status(403).json({
        message: 'Veuillez vérifier votre email avant de vous connecter. Vérifiez votre boîte de réception.',
        emailNonVerifie: true
      });
    }

    // Générer le token JWT
    const token = jwt.sign(
      { utilisateur_id: utilisateur.id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Connexion réussie',
      utilisateur: utilisateur.toJSON(),
      token
    });
  } catch (erreur) {
    next(erreur);
  }
});

/**
 * @swagger
 * /api/auth/profile:
 *   get:
 *     summary: Obtenir le profil utilisateur
 *     tags: [Authentification]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profil utilisateur récupéré avec succès
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Utilisateur'
 *       401:
 *         description: Token invalide ou manquant
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// Obtenir le profil utilisateur
router.get('/profile', auth, async (req, res, next) => {
  try {
    res.json({
      utilisateur: req.utilisateur.toJSON()
    });
  } catch (erreur) {
    next(erreur);
  }
});

/**
 * @swagger
 * /api/auth/profile:
 *   put:
 *     summary: Modifier le profil utilisateur
 *     tags: [Authentification]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - firstName
 *               - lastName
 *             properties:
 *               firstName:
 *                 type: string
 *                 example: Jean
 *               lastName:
 *                 type: string
 *                 example: Dupont
 *     responses:
 *       200:
 *         description: Profil mis à jour avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Profil mis à jour avec succès
 *                 utilisateur:
 *                   $ref: '#/components/schemas/Utilisateur'
 *       400:
 *         description: Données invalides
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Token invalide ou manquant
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// Modifier le profil utilisateur
router.put('/profile', auth, async (req, res, next) => {
  try {
    const { firstName, lastName } = req.body;

    // Validation des données
    if (!firstName || !lastName) {
      return res.status(400).json({
        message: 'Prénom et nom requis'
      });
    }

    // Mettre à jour le profil
    await req.utilisateur.mettreAJourProfil({
      prenom: firstName,
      nom: lastName
    });

    res.json({
      message: 'Profil mis à jour avec succès',
      utilisateur: req.utilisateur.toJSON()
    });
  } catch (erreur) {
    next(erreur);
  }
});



/**
 * @swagger
 * /api/auth/change-password:
 *   put:
 *     summary: Changer le mot de passe de l'utilisateur connecté
 *     tags: [Authentification]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 example: "ancienMotDePasse123"
 *               newPassword:
 *                 type: string
 *                 minLength: 6
 *                 example: "nouveauMotDePasse123"
 *     responses:
 *       200:
 *         description: Mot de passe modifié avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Mot de passe modifié avec succès
 *       400:
 *         description: Données invalides
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Mot de passe actuel incorrect
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// Changer le mot de passe
router.put('/change-password', auth, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Validation des données
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        message: 'Mot de passe actuel et nouveau mot de passe requis'
      });
    }

    // Vérifier le mot de passe actuel
    const motDePasseValide = await req.utilisateur.comparerMotDePasse(currentPassword);
    if (!motDePasseValide) {
      return res.status(401).json({
        message: 'Mot de passe actuel incorrect'
      });
    }

    // Changer le mot de passe
    await req.utilisateur.changerMotDePasse(newPassword);

    res.json({
      message: 'Mot de passe modifié avec succès'
    });
  } catch (erreur) {
    next(erreur);
  }
});

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: Demander la récupération de mot de passe
 *     tags: [Authentification]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *     responses:
 *       200:
 *         description: Email de récupération envoyé
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Email de récupération envoyé
 *       400:
 *         description: Email requis
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Aucun utilisateur trouvé
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       429:
 *         description: Trop de tentatives
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// Récupération de mot de passe
router.post('/forgot-password', async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        message: 'Email requis'
      });
    }

    // Vérifier si l'utilisateur existe
    const utilisateur = await Utilisateur.trouverParEmail(email);
    if (!utilisateur) {
      return res.status(404).json({
        message: 'Aucun utilisateur trouvé avec cet email'
      });
    }

    // Vérifier les tentatives (max 3 par 24h)
    const tentatives = await PasswordResetToken.compterTentativesUtilisateur(utilisateur.id);
    if (tentatives >= 3) {
      return res.status(429).json({
        message: 'Trop de tentatives de récupération. Réessayez dans 24 heures.'
      });
    }

    // Supprimer les anciens tokens de cet utilisateur
    await PasswordResetToken.supprimerTokensUtilisateur(utilisateur.id);

    // Générer un token sécurisé
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expires_at = new Date(Date.now() + 60 * 60 * 1000); // 1 heure

    // Sauvegarder le token en base
    await PasswordResetToken.creer(utilisateur.id, resetToken, expires_at);

    // Envoyer l'email
    try {
      await emailService.envoyerEmailRecuperation(email, utilisateur.prenom, resetToken);
      
      res.json({
        message: 'Email de récupération envoyé'
      });
    } catch (emailError) {
      // Si l'email échoue, supprimer le token et retourner une erreur
      await PasswordResetToken.supprimerTokensUtilisateur(utilisateur.id);
      
      console.error('Erreur envoi email:', emailError);
      res.status(500).json({
        message: 'Erreur lors de l\'envoi de l\'email. Réessayez plus tard.'
      });
    }
  } catch (erreur) {
    next(erreur);
  }
});

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: Réinitialiser le mot de passe avec un token
 *     tags: [Authentification]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - newPassword
 *             properties:
 *               token:
 *                 type: string
 *                 example: "abc123def456..."
 *               newPassword:
 *                 type: string
 *                 minLength: 6
 *                 example: "nouveauMotDePasse123"
 *     responses:
 *       200:
 *         description: Mot de passe réinitialisé avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Mot de passe réinitialisé avec succès
 *       400:
 *         description: Token ou mot de passe invalide
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Token non trouvé ou expiré
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// Réinitialisation de mot de passe
router.post('/reset-password', async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        message: 'Token et nouveau mot de passe requis'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        message: 'Le mot de passe doit contenir au moins 6 caractères'
      });
    }

    // Trouver le token en base
    const resetToken = await PasswordResetToken.trouverParToken(token);
    if (!resetToken) {
      return res.status(404).json({
        message: 'Token invalide ou expiré'
      });
    }

    // Trouver l'utilisateur
    const utilisateur = await Utilisateur.trouverParId(resetToken.utilisateur_id);
    if (!utilisateur) {
      return res.status(404).json({
        message: 'Utilisateur non trouvé'
      });
    }

    // Marquer le token comme utilisé
    await resetToken.marquerCommeUtilise();

    // Changer le mot de passe
    await utilisateur.changerMotDePasse(newPassword);

    // Envoyer un email de confirmation
    try {
      await emailService.envoyerEmailConfirmation(utilisateur.email, utilisateur.prenom);
    } catch (emailError) {
      console.error('Erreur envoi email de confirmation:', emailError);
      // Ne pas faire échouer le processus si l'email de confirmation échoue
    }

    res.json({
      message: 'Mot de passe réinitialisé avec succès'
    });
  } catch (erreur) {
    next(erreur);
  }
});



module.exports = router;
