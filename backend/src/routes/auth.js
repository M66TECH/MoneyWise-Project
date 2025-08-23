const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const Utilisateur = require('../models/Utilisateur');
const PasswordResetToken = require('../models/PasswordResetToken');
const emailService = require('../services/emailService');
const { auth } = require('../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Authentification
 *   description: Gestion de l'authentification des utilisateurs
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
 *         description: Utilisateur créé avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Utilisateur créé avec succès
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
 *       409:
 *         description: Email déjà utilisé
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// Inscription d'un nouvel utilisateur
router.post('/register', async (req, res, next) => {
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

    // Créer le nouvel utilisateur
    const nouvelUtilisateur = await Utilisateur.creer({
      email,
      mot_de_passe: password,
      prenom: firstName,
      nom: lastName
    });

    // Générer le token JWT
    const token = jwt.sign(
      { utilisateur_id: nouvelUtilisateur.id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'Utilisateur créé avec succès',
      utilisateur: nouvelUtilisateur.toJSON(),
      token
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
 * /api/auth/profile/theme:
 *   put:
 *     summary: Changer le thème de l'utilisateur
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
 *               - theme
 *             properties:
 *               theme:
 *                 type: string
 *                 enum: [light, dark]
 *                 example: dark
 *     responses:
 *       200:
 *         description: Thème mis à jour avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Thème mis à jour avec succès
 *                 utilisateur:
 *                   $ref: '#/components/schemas/Utilisateur'
 *       400:
 *         description: Données invalides
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// Changer le thème
router.put('/profile/theme', auth, async (req, res, next) => {
  try {
    const { theme } = req.body;

    if (!theme || !['light', 'dark'].includes(theme)) {
      return res.status(400).json({
        message: 'Thème doit être "light" ou "dark"'
      });
    }

    // Mettre à jour le thème (à implémenter dans le modèle Utilisateur)
    await req.utilisateur.mettreAJourTheme(theme);

    res.json({
      message: 'Thème mis à jour avec succès',
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

/**
 * @swagger
 * /api/auth/test-email:
 *   post:
 *     summary: Test de configuration email (développement uniquement)
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
 *                 example: test@example.com
 *     responses:
 *       200:
 *         description: Test email envoyé
 *       500:
 *         description: Erreur de configuration email
 */
// Test de configuration email (à supprimer en production)
if (process.env.NODE_ENV === 'development') {
  router.post('/test-email', async (req, res, next) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: 'Email requis' });
      }

      // Test de connexion
      const configValide = await emailService.testerConnexion();
      if (!configValide) {
        return res.status(500).json({ message: 'Configuration email invalide' });
      }

      // Envoyer un email de test
      await emailService.envoyerEmailRecuperation(email, 'Test', 'test_token_123');
      
      res.json({ message: 'Test email envoyé avec succès' });
    } catch (erreur) {
      next(erreur);
    }
  });
}

module.exports = router;
