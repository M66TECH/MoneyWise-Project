const express = require('express');
const Transaction = require('../models/Transaction');
const Categorie = require('../models/Categorie');
const { auth } = require('../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Transactions
 *   description: Gestion des transactions financières
 */

// Appliquer l'authentification à toutes les routes
router.use(auth);

/**
 * @swagger
 * /api/transactions:
 *   get:
 *     summary: Obtenir toutes les transactions de l'utilisateur
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Numéro de page
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Nombre d'éléments par page
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [revenu, depense]
 *         description: Filtrer par type de transaction
 *       - in: query
 *         name: categoryId
 *         schema:
 *           type: integer
 *         description: Filtrer par ID de catégorie
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Date de début (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Date de fin (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Liste des transactions récupérée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 transactions:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Transaction'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *       401:
 *         description: Token invalide ou manquant
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// Obtenir toutes les transactions de l'utilisateur
router.get('/', async (req, res, next) => {
  try {
    const { page = 1, limit = 20, type, categoryId, startDate, endDate } = req.query;
    
    const transactions = await Transaction.trouverParUtilisateur(req.utilisateur_id, {
      page: parseInt(page),
      limit: parseInt(limit),
      type,
      categorie_id: categoryId,
      startDate,
      endDate
    });

    res.json({
      transactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });
  } catch (erreur) {
    next(erreur);
  }
});

// Obtenir une transaction spécifique
router.get('/:id', auth, async (req, res, next) => {
  try {
    const transaction = await Transaction.trouverParId(req.params.id, req.utilisateur_id);
    
    if (!transaction) {
      return res.status(404).json({
        message: 'Transaction non trouvée'
      });
    }

    res.json({ transaction });
  } catch (erreur) {
    next(erreur);
  }
});

/**
 * @swagger
 * /api/transactions:
 *   post:
 *     summary: Créer une nouvelle transaction
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *               - amount
 *               - categoryId
 *               - date
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [revenu, depense]
 *                 example: depense
 *               amount:
 *                 type: number
 *                 minimum: 0
 *                 example: 25.50
 *               categoryId:
 *                 type: integer
 *                 example: 1
 *               description:
 *                 type: string
 *                 example: Déjeuner au restaurant
 *               date:
 *                 type: string
 *                 format: date
 *                 example: "2024-08-21"
 *     responses:
 *       201:
 *         description: Transaction créée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Transaction créée avec succès
 *                 transaction:
 *                   $ref: '#/components/schemas/Transaction'
 *       400:
 *         description: Données invalides
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Catégorie non trouvée
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// Créer une nouvelle transaction
router.post('/', auth, async (req, res, next) => {
  try {
    const { type, amount, categoryId, description, date } = req.body;

    // Validation des données
    if (!type || !amount || !categoryId || !date) {
      return res.status(400).json({
        message: 'Type, montant, catégorie et date sont requis'
      });
    }

    if (!['revenu', 'depense'].includes(type)) {
      return res.status(400).json({
        message: 'Le type doit être "revenu" ou "depense"'
      });
    }

    if (amount <= 0) {
      return res.status(400).json({
        message: 'Le montant doit être positif'
      });
    }

    // Vérifier que la catégorie appartient à l'utilisateur et correspond au type
    const categorie = await Categorie.trouverParId(categoryId);
    if (!categorie || categorie.utilisateur_id !== req.utilisateur_id) {
      return res.status(404).json({
        message: 'Catégorie non trouvée'
      });
    }

    // Gestion spéciale pour les catégories hybrides
    if (categorie.type === 'hybride') {
      // Les catégories hybrides acceptent les transactions de type 'revenu' ou 'depense'
      if (!['revenu', 'depense'].includes(type)) {
        return res.status(400).json({
          message: 'Le type de la transaction doit être "revenu" ou "depense"'
        });
      }
    } else if (categorie.type !== type) {
      // Pour les autres catégories, le type doit correspondre exactement
      return res.status(400).json({
        message: 'Le type de la catégorie ne correspond pas au type de la transaction'
      });
    }

    // Créer la transaction
    const nouvelleTransaction = await Transaction.creer({
      utilisateur_id: req.utilisateur_id,
      categorie_id: categoryId,
      type,
      montant: parseFloat(amount),
      description: description || '',
      date_transaction: date
    });

    res.status(201).json({
      message: 'Transaction créée avec succès',
      transaction: nouvelleTransaction
    });
  } catch (erreur) {
    next(erreur);
  }
});

/**
 * @swagger
 * /api/transactions/{id}:
 *   put:
 *     summary: Modifier une transaction existante
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la transaction à modifier
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *               - amount
 *               - categoryId
 *               - date
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [revenu, depense]
 *                 example: depense
 *               amount:
 *                 type: number
 *                 minimum: 0
 *                 example: 25.50
 *               categoryId:
 *                 type: integer
 *                 example: 1
 *               description:
 *                 type: string
 *                 example: Déjeuner au restaurant
 *               date:
 *                 type: string
 *                 format: date
 *                 example: "2024-08-21"
 *     responses:
 *       200:
 *         description: Transaction modifiée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Transaction modifiée avec succès
 *                 transaction:
 *                   $ref: '#/components/schemas/Transaction'
 *       400:
 *         description: Données invalides
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Transaction ou catégorie non trouvée
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// Modifier une transaction
router.put('/:id', auth, async (req, res, next) => {
  try {
    const { type, amount, categoryId, description, date } = req.body;

    // Trouver la transaction
    const transaction = await Transaction.trouverParId(req.params.id, req.utilisateur_id);
    if (!transaction) {
      return res.status(404).json({
        message: 'Transaction non trouvée'
      });
    }

    // Validation des données
    if (!type || !amount || !categoryId || !date) {
      return res.status(400).json({
        message: 'Type, montant, catégorie et date sont requis'
      });
    }

    if (!['revenu', 'depense'].includes(type)) {
      return res.status(400).json({
        message: 'Le type doit être "revenu" ou "depense"'
      });
    }

    if (amount <= 0) {
      return res.status(400).json({
        message: 'Le montant doit être positif'
      });
    }

    // Vérifier que la catégorie appartient à l'utilisateur et correspond au type
    const categorie = await Categorie.trouverParId(categoryId);
    if (!categorie || categorie.utilisateur_id !== req.utilisateur_id) {
      return res.status(404).json({
        message: 'Catégorie non trouvée'
      });
    }

    // Gestion spéciale pour les catégories hybrides
    if (categorie.type === 'hybride') {
      // Les catégories hybrides acceptent les transactions de type 'revenu' ou 'depense'
      if (!['revenu', 'depense'].includes(type)) {
        return res.status(400).json({
          message: 'Le type de la transaction doit être "revenu" ou "depense"'
        });
      }
    } else if (categorie.type !== type) {
      // Pour les autres catégories, le type doit correspondre exactement
      return res.status(400).json({
        message: 'Le type de la catégorie ne correspond pas au type de la transaction'
      });
    }

    // Mettre à jour la transaction
    await transaction.mettreAJour({
      categorie_id: categoryId,
      type,
      montant: parseFloat(amount),
      description: description || '',
      date_transaction: date
    });

    res.json({
      message: 'Transaction modifiée avec succès',
      transaction
    });
  } catch (erreur) {
    next(erreur);
  }
});

/**
 * @swagger
 * /api/transactions/{id}:
 *   delete:
 *     summary: Supprimer une transaction
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la transaction à supprimer
 *     responses:
 *       200:
 *         description: Transaction supprimée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Transaction supprimée avec succès
 *       404:
 *         description: Transaction non trouvée
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// Supprimer une transaction
router.delete('/:id', auth, async (req, res, next) => {
  try {
    const transaction = await Transaction.trouverParId(req.params.id, req.utilisateur_id);
    
    if (!transaction) {
      return res.status(404).json({
        message: 'Transaction non trouvée'
      });
    }

    await transaction.supprimer();

    res.json({
      message: 'Transaction supprimée avec succès'
    });
  } catch (erreur) {
    next(erreur);
  }
});

// Obtenir le solde
router.get('/balance/summary', async (req, res, next) => {
  try {
    const solde = await Transaction.obtenirSolde(req.utilisateur_id);
    const total_revenus = await Transaction.obtenirTotalRevenus(req.utilisateur_id);
    const total_depenses = await Transaction.obtenirTotalDepenses(req.utilisateur_id);
    
    res.json({ 
      solde,
      total_revenus,
      total_depenses
    });
  } catch (erreur) {
    next(erreur);
  }
});

// Obtenir les statistiques mensuelles
router.get('/stats/monthly/:year/:month', async (req, res, next) => {
  try {
    const { year, month } = req.params;
    
    const statistiques = await Transaction.obtenirStatistiquesMensuelles(
      req.utilisateur_id,
      parseInt(year),
      parseInt(month)
    );

    res.json({
      annee: parseInt(year),
      mois: parseInt(month),
      statistiques
    });
  } catch (erreur) {
    next(erreur);
  }
});

// Obtenir les dépenses par catégorie
router.get('/stats/by-category', async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        message: 'Date de début et date de fin requises'
      });
    }

    const depensesParCategorie = await Transaction.obtenirDepensesParCategorie(
      req.utilisateur_id,
      startDate,
      endDate
    );

    res.json({
      depenses_par_categorie: depensesParCategorie
    });
  } catch (erreur) {
    next(erreur);
  }
});

// Obtenir l'évolution mensuelle
router.get('/stats/trend/:year', async (req, res, next) => {
  try {
    const { year } = req.params;
    
    const evolutionMensuelle = await Transaction.obtenirEvolutionMensuelle(
      req.utilisateur_id,
      parseInt(year)
    );

    res.json({
      annee: parseInt(year),
      evolution_mensuelle: evolutionMensuelle
    });
  } catch (erreur) {
    next(erreur);
  }
});

/**
 * @swagger
 * /api/transactions/by-category/{categoryId}:
 *   get:
 *     summary: Obtenir les transactions par catégorie
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: categoryId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la catégorie
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Numéro de page
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Nombre d'éléments par page
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Date de début (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Date de fin (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Transactions par catégorie récupérées avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 transactions:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Transaction'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *       404:
 *         description: Catégorie non trouvée
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// Obtenir les transactions par catégorie
router.get('/by-category/:categoryId', auth, async (req, res, next) => {
  try {
    const { categoryId } = req.params;
    const { page = 1, limit = 20, startDate, endDate } = req.query;

    // Vérifier que la catégorie appartient à l'utilisateur
    const categorie = await Categorie.trouverParId(categoryId);
    if (!categorie || categorie.utilisateur_id !== req.utilisateur_id) {
      return res.status(404).json({
        message: 'Catégorie non trouvée'
      });
    }

    const transactions = await Transaction.trouverParUtilisateur(req.utilisateur_id, {
      page: parseInt(page),
      limit: parseInt(limit),
      categorie_id: categoryId,
      startDate,
      endDate
    });

    res.json({
      transactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });
  } catch (erreur) {
    next(erreur);
  }
});

module.exports = router;
