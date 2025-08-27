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
 *         description: Vérification des alertes déclenchée
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Vérification des alertes déclenchée"
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
 * /api/notifications/send-custom-alert:
 *   post:
 *     summary: Envoyer une alerte personnalisée depuis le frontend
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - utilisateur_id
 *               - type
 *               - severite
 *               - message
 *             properties:
 *               utilisateur_id:
 *                 type: integer
 *                 description: ID de l'utilisateur concerné
 *               type:
 *                 type: string
 *                 enum: [danger, warning, info, success]
 *                 description: Type d'alerte
 *               severite:
 *                 type: string
 *                 enum: [critical, high, medium, low]
 *                 description: Niveau de sévérité
 *               message:
 *                 type: string
 *                 description: Message de l'alerte
 *               code:
 *                 type: string
 *                 description: Code unique de l'alerte (optionnel)
 *               envoyerEmail:
 *                 type: boolean
 *                 description: Envoyer un email avec cette alerte
 *                 default: true
 *     responses:
 *       200:
 *         description: Alerte envoyée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 alerte:
 *                   type: object
 *                   properties:
 *                     type:
 *                       type: string
 *                     severite:
 *                       type: string
 *                     message:
 *                       type: string
 *                     code:
 *                       type: string
 *                 emailSent:
 *                   type: boolean
 *                 utilisateur:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     email:
 *                       type: string
 *                     prenom:
 *                       type: string
 *       400:
 *         description: Paramètres invalides
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
 *       404:
 *         description: Utilisateur non trouvé
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
/**
 * @swagger
 * /api/notifications/send-custom-alert:
 *   post:
 *     summary: Envoyer une alerte personnalisée depuis le frontend
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AlertRequest'
 *     responses:
 *       200:
 *         description: Alerte envoyée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AlertResponse'
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
 *       404:
 *         description: Utilisateur non trouvé
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// Envoyer une alerte personnalisée depuis le frontend
router.post('/send-custom-alert', auth, async (req, res, next) => {
  try {
    const { 
      utilisateur_id, 
      type, 
      severite, 
      message, 
      code = 'CUSTOM_ALERT',
      envoyerEmail = true 
    } = req.body;

    // Validation des paramètres requis
    if (!utilisateur_id || !type || !severite || !message) {
      return res.status(400).json({
        success: false,
        message: 'Paramètres manquants: utilisateur_id, type, severite et message sont requis'
      });
    }

    // Validation du type d'alerte
    const typesValides = ['danger', 'warning', 'info', 'success'];
    if (!typesValides.includes(type)) {
      return res.status(400).json({
        success: false,
        message: `Type d'alerte invalide. Types autorisés: ${typesValides.join(', ')}`
      });
    }

    // Validation de la sévérité
    const severitesValides = ['critical', 'high', 'medium', 'low'];
    if (!severitesValides.includes(severite)) {
      return res.status(400).json({
        success: false,
        message: `Sévérité invalide. Sévérités autorisées: ${severitesValides.join(', ')}`
      });
    }

    // Récupérer l'utilisateur concerné
    const utilisateur = await Utilisateur.trouverParId(utilisateur_id);
    
    if (!utilisateur) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    // Créer l'alerte personnalisée
    const alerte = {
      type,
      severite,
      message,
      code
    };

    let emailSent = false;

    // Envoyer l'email si demandé
    if (envoyerEmail) {
      try {
        const emailService = require('../services/emailService');
        await emailService.envoyerAlertesFinancieres(
          utilisateur.email,
          utilisateur.prenom,
          [alerte]
        );
        emailSent = true;
        console.log(`📧 Email d'alerte personnalisée envoyé à ${utilisateur.email}`);
      } catch (emailError) {
        console.error(`❌ Erreur envoi email alerte personnalisée à ${utilisateur.email}:`, emailError);
        // Ne pas échouer complètement si l'email échoue
      }
    }

    console.log(`🚨 Alerte personnalisée créée pour ${utilisateur.email}: ${message}`);

    res.json({
      success: true,
      message: 'Alerte personnalisée envoyée avec succès',
      alerte,
      emailSent,
      utilisateur: {
        id: utilisateur.id,
        email: utilisateur.email,
        prenom: utilisateur.prenom
      }
    });

  } catch (erreur) {
    console.error('Erreur envoi alerte personnalisée:', erreur);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'envoi de l\'alerte personnalisée',
      error: erreur.message
    });
  }
});

/**
 * @swagger
 * /api/notifications/send-multiple-alerts:
 *   post:
 *     summary: Envoyer plusieurs alertes personnalisées depuis le frontend
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - utilisateur_id
 *               - alertes
 *             properties:
 *               utilisateur_id:
 *                 type: integer
 *                 description: ID de l'utilisateur concerné
 *               alertes:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - type
 *                     - severite
 *                     - message
 *                   properties:
 *                     type:
 *                       type: string
 *                       enum: [danger, warning, info, success]
 *                     severite:
 *                       type: string
 *                       enum: [critical, high, medium, low]
 *                     message:
 *                       type: string
 *                     code:
 *                       type: string
 *               envoyerEmail:
 *                 type: boolean
 *                 description: Envoyer un email avec ces alertes
 *                 default: true
 *     responses:
 *       200:
 *         description: Alertes envoyées avec succès
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
 *                 utilisateur:
 *                   type: object
 *       400:
 *         description: Paramètres invalides
 *       404:
 *         description: Utilisateur non trouvé
 */
// Envoyer plusieurs alertes personnalisées depuis le frontend
router.post('/send-multiple-alerts', auth, async (req, res, next) => {
  try {
    const { 
      utilisateur_id, 
      alertes, 
      envoyerEmail = true 
    } = req.body;

    // Validation des paramètres requis
    if (!utilisateur_id || !alertes || !Array.isArray(alertes) || alertes.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Paramètres manquants: utilisateur_id et alertes (tableau non vide) sont requis'
      });
    }

    // Validation de chaque alerte
    const typesValides = ['danger', 'warning', 'info', 'success'];
    const severitesValides = ['critical', 'high', 'medium', 'low'];

    for (let i = 0; i < alertes.length; i++) {
      const alerte = alertes[i];
      if (!alerte.type || !alerte.severite || !alerte.message) {
        return res.status(400).json({
          success: false,
          message: `Alerte ${i + 1} invalide: type, severite et message sont requis`
        });
      }

      if (!typesValides.includes(alerte.type)) {
        return res.status(400).json({
          success: false,
          message: `Alerte ${i + 1}: Type invalide. Types autorisés: ${typesValides.join(', ')}`
        });
      }

      if (!severitesValides.includes(alerte.severite)) {
        return res.status(400).json({
          success: false,
          message: `Alerte ${i + 1}: Sévérité invalide. Sévérités autorisées: ${severitesValides.join(', ')}`
        });
      }

      // Ajouter un code par défaut si manquant
      if (!alerte.code) {
        alerte.code = `CUSTOM_ALERT_${i + 1}`;
      }
    }

    // Récupérer l'utilisateur concerné
    const utilisateur = await Utilisateur.trouverParId(utilisateur_id);
    
    if (!utilisateur) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    let emailSent = false;

    // Envoyer l'email si demandé
    if (envoyerEmail) {
      try {
        const emailService = require('../services/emailService');
        await emailService.envoyerAlertesFinancieres(
          utilisateur.email,
          utilisateur.prenom,
          alertes
        );
        emailSent = true;
        console.log(`📧 Email avec ${alertes.length} alertes personnalisées envoyé à ${utilisateur.email}`);
      } catch (emailError) {
        console.error(`❌ Erreur envoi email alertes personnalisées à ${utilisateur.email}:`, emailError);
        // Ne pas échouer complètement si l'email échoue
      }
    }

    console.log(`🚨 ${alertes.length} alertes personnalisées créées pour ${utilisateur.email}`);

    res.json({
      success: true,
      message: `${alertes.length} alertes personnalisées envoyées avec succès`,
      alertes,
      emailSent,
      utilisateur: {
        id: utilisateur.id,
        email: utilisateur.email,
        prenom: utilisateur.prenom
      }
    });

  } catch (erreur) {
    console.error('Erreur envoi alertes personnalisées:', erreur);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'envoi des alertes personnalisées',
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
