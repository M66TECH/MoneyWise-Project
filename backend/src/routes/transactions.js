const express = require('express');
const Transaction = require('../models/Transaction');
const Categorie = require('../models/Categorie');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Appliquer l'authentification à toutes les routes
router.use(auth);

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
router.get('/:id', async (req, res, next) => {
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

// Créer une nouvelle transaction
router.post('/', async (req, res, next) => {
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

    if (categorie.type !== type) {
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

// Modifier une transaction
router.put('/:id', async (req, res, next) => {
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

    if (categorie.type !== type) {
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

// Supprimer une transaction
router.delete('/:id', async (req, res, next) => {
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

module.exports = router;
