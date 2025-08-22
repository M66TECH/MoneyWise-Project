const express = require('express');
const jwt = require('jsonwebtoken');
const Utilisateur = require('../models/Utilisateur');
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

module.exports = router;
