const express = require('express');
const { auth } = require('../middleware/auth');
const notificationService = require('../services/notificationService');
const Utilisateur = require('../models/Utilisateur');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Notifications
 *   description: Gestion des notifications et alertes
 */

/**
 * @swagger
 * /api/notifications/check:
 *   post:
 *     summary: Déclencher une vérification manuelle des alertes
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Vérification déclenchée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Vérification des alertes déclenchée
 *       401:
 *         description: Token invalide ou manquant
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// Déclencher une vérification manuelle des alertes
router.post('/check', auth, async (req, res, next) => {
  try {
    // Déclencher la vérification en arrière-plan
    setImmediate(async () => {
      try {
        await notificationService.verifierMaintenant();
      } catch (error) {
        console.error('Erreur lors de la vérification manuelle:', error);
      }
    });

    res.json({
      message: 'Vérification des alertes déclenchée'
    });
  } catch (erreur) {
    next(erreur);
  }
});

/**
 * @swagger
 * /api/notifications/check-user:
 *   post:
 *     summary: Vérifier les alertes pour l'utilisateur connecté
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Alertes vérifiées avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 alertes:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       type:
 *                         type: string
 *                         enum: [danger, warning, info]
 *                       message:
 *                         type: string
 *                       severite:
 *                         type: string
 *                         enum: [high, medium, low]
 *                 emailSent:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       401:
 *         description: Token invalide ou manquant
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// Vérifier les alertes pour l'utilisateur connecté
router.post('/check-user', auth, async (req, res, next) => {
  try {
    const { envoyerEmail = false } = req.body;
    
    // Récupérer l'utilisateur connecté
    const utilisateur = await Utilisateur.trouverParId(req.utilisateur_id);
    
    if (!utilisateur) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    // Vérifier les alertes pour cet utilisateur avec option d'envoi d'email
    const resultat = await notificationService.verifierAlertesUtilisateur(utilisateur, envoyerEmail);
    
    res.json({
      alertes: resultat.alertes || [],
      emailSent: resultat.emailSent || false,
      message: envoyerEmail ? 'Vérification des alertes terminée et email envoyé' : 'Vérification des alertes terminée'
    });
  } catch (erreur) {
    next(erreur);
  }
});

/**
 * @swagger
 * /api/notifications/send-email:
 *   post:
 *     summary: Déclencher l'envoi d'email d'alertes pour l'utilisateur connecté
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               forceSend:
 *                 type: boolean
 *                 description: Forcer l'envoi même s'il n'y a pas d'alertes
 *                 default: false
 *     responses:
 *       200:
 *         description: Email envoyé avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 alertes:
 *                   type: array
 *                   items:
 *                     type: object
 *                 emailSent:
 *                   type: boolean
 *       401:
 *         description: Token invalide ou manquant
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// Déclencher l'envoi d'email d'alertes
router.post('/send-email', auth, async (req, res, next) => {
  try {
    const { forceSend = false } = req.body;
    
    // Récupérer l'utilisateur connecté
    const utilisateur = await Utilisateur.trouverParId(req.utilisateur_id);
    
    if (!utilisateur) {
      return res.status(404).json({ 
        success: false,
        message: 'Utilisateur non trouvé' 
      });
    }

    // Vérifier les alertes et envoyer l'email
    const resultat = await notificationService.verifierAlertesUtilisateur(utilisateur, true);
    
    if (resultat.alertes.length === 0 && !forceSend) {
      return res.json({
        success: true,
        message: 'Aucune alerte détectée, email non envoyé',
        alertes: [],
        emailSent: false
      });
    }

    res.json({
      success: true,
      message: resultat.emailSent ? 'Email d\'alertes envoyé avec succès' : 'Erreur lors de l\'envoi de l\'email',
      alertes: resultat.alertes,
      emailSent: resultat.emailSent
    });
  } catch (erreur) {
    console.error('Erreur envoi email alertes:', erreur);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'envoi de l\'email d\'alertes',
      error: erreur.message
    });
  }
});

/**
 * @swagger
 * /api/notifications/status:
 *   get:
 *     summary: Obtenir le statut du service de notifications
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statut récupéré avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 isRunning:
 *                   type: boolean
 *                   example: true
 *                 lastCheck:
 *                   type: string
 *                   format: date-time
 *                   example: "2024-08-26T10:30:00Z"
 *       401:
 *         description: Token invalide ou manquant
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// Obtenir le statut du service de notifications
router.get('/status', auth, async (req, res, next) => {
  try {
    res.json({
      isRunning: notificationService.isRunning,
      lastCheck: new Date().toISOString()
    });
  } catch (erreur) {
    next(erreur);
  }
});

module.exports = router;
