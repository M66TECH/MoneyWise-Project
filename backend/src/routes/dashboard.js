const express = require('express');
const Transaction = require('../models/Transaction');
const Categorie = require('../models/Categorie');
const { auth } = require('../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Dashboard
 *   description: Données pour le tableau de bord
 */

// Appliquer l'authentification à toutes les routes
router.use(auth);

/**
 * @swagger
 * /api/dashboard/summary:
 *   get:
 *     summary: Obtenir le résumé du dashboard
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Résumé du dashboard récupéré avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 solde:
 *                   type: number
 *                   example: 1250.75
 *                 statistiques_mensuelles:
 *                   type: object
 *                   properties:
 *                     total_revenus:
 *                       type: number
 *                       example: 2000.00
 *                     total_depenses:
 *                       type: number
 *                       example: 749.25
 *                     solde:
 *                       type: number
 *                       example: 1250.75
 *                     nombre_transactions:
 *                       type: integer
 *                       example: 15
 *       401:
 *         description: Token invalide ou manquant
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// Obtenir le résumé du tableau de bord
router.get('/summary', async (req, res, next) => {
  try {
    const { year, month } = req.query;
    const anneeCourante = year || new Date().getFullYear();
    const moisCourant = month || new Date().getMonth() + 1;

    // Obtenir le solde global
    const solde = await Transaction.obtenirSolde(req.utilisateur_id);

    // Obtenir les statistiques du mois en cours
    const statistiquesMensuelles = await Transaction.obtenirStatistiquesMensuelles(req.utilisateur_id, anneeCourante, moisCourant);

    // Obtenir les dépenses par catégorie pour le mois en cours
    const dateDebut = new Date(anneeCourante, moisCourant - 1, 1).toISOString().split('T')[0];
    const dateFin = new Date(anneeCourante, moisCourant, 0).toISOString().split('T')[0];
    
    const depensesParCategorie = await Transaction.obtenirDepensesParCategorie(
      req.utilisateur_id,
      dateDebut,
      dateFin
    );

    // Obtenir l'évolution des 6 derniers mois
    const sixDerniersMois = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date(anneeCourante, moisCourant - 1 - i, 1);
      const statistiquesMois = await Transaction.obtenirStatistiquesMensuelles(
        req.utilisateur_id,
        date.getFullYear(),
        date.getMonth() + 1
      );
      sixDerniersMois.push({
        mois: date.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' }),
        revenus: statistiquesMois.total_revenus,
        depenses: statistiquesMois.total_depenses,
        solde: statistiquesMois.solde
      });
    }

    res.json({
      solde,
      total_revenus: statistiquesMensuelles.total_revenus,
      total_depenses: statistiquesMensuelles.total_depenses,
      statistiques_mensuelles: statistiquesMensuelles,
      depenses_par_categorie: depensesParCategorie,
      evolution_six_mois: sixDerniersMois
    });
  } catch (erreur) {
    next(erreur);
  }
});

/**
 * @swagger
 * /api/dashboard/monthly-stats:
 *   get:
 *     summary: Obtenir les statistiques mensuelles
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: month
 *         schema:
 *           type: string
 *           format: YYYY-MM
 *         description: Mois pour les statistiques (format YYYY-MM)
 *         example: "2024-01"
 *     responses:
 *       200:
 *         description: Statistiques mensuelles récupérées avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mois:
 *                   type: string
 *                   example: "2024-01"
 *                 revenus:
 *                   type: number
 *                   example: 2000.00
 *                 depenses:
 *                   type: number
 *                   example: 749.25
 *                 solde:
 *                   type: number
 *                   example: 1250.75
 *       401:
 *         description: Token invalide ou manquant
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// Obtenir les statistiques mensuelles
router.get('/monthly-stats', async (req, res, next) => {
  try {
    const { month } = req.query;
    
    if (!month) {
      return res.status(400).json({
        message: 'Le paramètre month est requis (format: YYYY-MM)'
      });
    }

    const [year, monthNum] = month.split('-').map(Number);
    
    if (!year || !monthNum || monthNum < 1 || monthNum > 12) {
      return res.status(400).json({
        message: 'Format de mois invalide. Utilisez YYYY-MM'
      });
    }

    const statistiques = await Transaction.obtenirStatistiquesMensuelles(req.utilisateur_id, year, monthNum);

    res.json({
      mois: month,
      revenus: statistiques.total_revenus,
      depenses: statistiques.total_depenses,
      solde: statistiques.solde
    });
  } catch (erreur) {
    next(erreur);
  }
});


// Obtenir les statistiques détaillées
router.get('/stats', async (req, res, next) => {
  try {
    const { startDate, endDate, type } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        message: 'Date de début et date de fin requises'
      });
    }

    let resultat = {};

    if (type === 'category' || !type) {
      // Statistiques par catégorie
      const statistiquesCategories = await Categorie.obtenirStatistiques(req.utilisateur_id);
      resultat.statistiquesCategories = statistiquesCategories;
    }

    if (type === 'trend' || !type) {
      // Évolution temporelle
      const annee = new Date(startDate).getFullYear();
      const evolution = await Transaction.obtenirEvolutionMensuelle(req.utilisateur_id, annee);
      resultat.evolution = evolution;
    }

    if (type === 'balance' || !type) {
      // Solde sur la période
      const solde = await Transaction.obtenirSolde(req.utilisateur_id);
      resultat.solde = solde;
    }

    res.json(resultat);
  } catch (erreur) {
    next(erreur);
  }
});

// Obtenir les données pour les graphiques
router.get('/charts', async (req, res, next) => {
  try {
    const { startDate, endDate, chartType } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        message: 'Date de début et date de fin requises'
      });
    }

    let donneesGraphiques = {};

    if (chartType === 'pie' || !chartType) {
      // Graphique en camembert - répartition des dépenses par catégorie
      const depensesParCategorie = await Transaction.obtenirDepensesParCategorie(
        req.utilisateur_id,
        startDate,
        endDate
      );

      donneesGraphiques.camembert = depensesParCategorie.map(element => ({
        nom: element.nom_categorie,
        valeur: parseFloat(element.montant_total),
        couleur: element.couleur_categorie
      }));
    }

    if (chartType === 'line' || !chartType) {
      // Graphique linéaire - évolution des revenus et dépenses
      const annee = new Date(startDate).getFullYear();
      const evolution = await Transaction.obtenirEvolutionMensuelle(req.utilisateur_id, annee);
      
      const mois = [
        'Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin',
        'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'
      ];

      donneesGraphiques.ligne = evolution.map(element => ({
        mois: mois[element.mois - 1],
        revenus: element.type === 'revenu' ? parseFloat(element.montant_total || 0) : 0,
        depenses: element.type === 'depense' ? parseFloat(element.montant_total || 0) : 0
      }));
    }

    if (chartType === 'bar' || !chartType) {
      // Graphique en barres - comparaison revenus vs dépenses
      const resume = await Transaction.obtenirResume(req.utilisateur_id);
      
      donneesGraphiques.barres = [
        { nom: 'Revenus', valeur: resume.total_revenus, couleur: '#10B981' },
        { nom: 'Dépenses', valeur: resume.total_depenses, couleur: '#EF4444' }
      ];
    }

    res.json(donneesGraphiques);
  } catch (erreur) {
    next(erreur);
  }
});

/**
 * @swagger
 * /api/dashboard/category-breakdown:
 *   get:
 *     summary: Obtenir la répartition des dépenses par catégorie
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [depense, revenu]
 *         description: Type de transaction (défaut: depense)
 *         example: "depense"
 *       - in: query
 *         name: dateDebut
 *         schema:
 *           type: string
 *           format: date
 *         description: Date de début (format YYYY-MM-DD)
 *         example: "2024-01-01"
 *       - in: query
 *         name: dateFin
 *         schema:
 *           type: string
 *           format: date
 *         description: Date de fin (format YYYY-MM-DD)
 *         example: "2024-12-31"
 *     responses:
 *       200:
 *         description: Répartition par catégorie récupérée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   nom_categorie:
 *                     type: string
 *                     example: "Courses"
 *                   couleur_categorie:
 *                     type: string
 *                     example: "#FF5733"
 *                   montant_total:
 *                     type: number
 *                     example: 450.75
 *                   nombre_transactions:
 *                     type: integer
 *                     example: 12
 *                   pourcentage:
 *                     type: number
 *                     example: 35.5
 *       401:
 *         description: Token invalide ou manquant
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// Obtenir la répartition des dépenses par catégorie
router.get('/category-breakdown', async (req, res, next) => {
  try {
    const { type = 'depense', dateDebut, dateFin } = req.query;
    
    // Si aucune date n'est spécifiée, utiliser le mois en cours
    let dateDebutFinal, dateFinFinal;
    if (!dateDebut || !dateFin) {
      const maintenant = new Date();
      dateDebutFinal = new Date(maintenant.getFullYear(), maintenant.getMonth(), 1).toISOString().split('T')[0];
      dateFinFinal = new Date(maintenant.getFullYear(), maintenant.getMonth() + 1, 0).toISOString().split('T')[0];
    } else {
      dateDebutFinal = dateDebut;
      dateFinFinal = dateFin;
    }

    const depensesParCategorie = await Transaction.obtenirDepensesParCategorie(
      req.utilisateur_id,
      dateDebutFinal,
      dateFinFinal,
      type
    );

    // Calculer le total pour les pourcentages
    const total = depensesParCategorie.reduce((sum, item) => sum + parseFloat(item.montant_total || 0), 0);

    // Ajouter les pourcentages
    const resultat = depensesParCategorie.map(item => ({
      ...item,
      pourcentage: total > 0 ? ((parseFloat(item.montant_total || 0) / total) * 100).toFixed(1) : 0
    }));

    res.json(resultat);
  } catch (erreur) {
    next(erreur);
  }
});

/**
 * @swagger
 * /api/dashboard/alerts:
 *   get:
 *     summary: Obtenir les alertes et notifications
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Alertes récupérées avec succès
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
 *                         enum: [warning, danger, info]
 *                       message:
 *                         type: string
 *                       severite:
 *                         type: string
 *                         enum: [low, medium, high]
 *       401:
 *         description: Token invalide ou manquant
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// Obtenir les alertes et notifications
router.get('/alerts', async (req, res, next) => {
  try {
    const alertes = [];
    const moisCourant = new Date().getMonth() + 1;
    const anneeCourante = new Date().getFullYear();

    // Vérifier les dépenses du mois en cours
    const statistiquesMensuelles = await Transaction.obtenirStatistiquesMensuelles(req.utilisateur_id, anneeCourante, moisCourant);
    
    // Alerte si les dépenses dépassent 80% des revenus
    if (statistiquesMensuelles.total_revenus > 0 && (statistiquesMensuelles.total_depenses / statistiquesMensuelles.total_revenus) > 0.8) {
      alertes.push({
        type: 'warning',
        message: 'Attention : vos dépenses représentent plus de 80% de vos revenus ce mois-ci',
        severite: 'medium'
      });
    }

    // Alerte si le solde est négatif
    if (statistiquesMensuelles.solde < 0) {
      alertes.push({
        type: 'danger',
        message: 'Votre solde est négatif ce mois-ci',
        severite: 'high'
      });
    }

    // Alerte si pas de transactions depuis plus de 7 jours
    const dernieresTransactions = await Transaction.trouverParUtilisateur(req.utilisateur_id, { 
      limit: 1
    });

    if (dernieresTransactions.length > 0) {
      const dateDerniereTransaction = new Date(dernieresTransactions[0].date_transaction);
      const joursDepuisDerniereTransaction = Math.floor((new Date() - dateDerniereTransaction) / (1000 * 60 * 60 * 24));
      
      if (joursDepuisDerniereTransaction > 7) {
        alertes.push({
          type: 'info',
          message: `Aucune transaction depuis ${joursDepuisDerniereTransaction} jours`,
          severite: 'low'
        });
      }
    }

    res.json({ alertes });
  } catch (erreur) {
    next(erreur);
  }
});

module.exports = router;
