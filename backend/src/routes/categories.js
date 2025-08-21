const express = require('express');
const Categorie = require('../models/Categorie');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Appliquer l'authentification à toutes les routes
router.use(auth);

// Obtenir toutes les catégories de l'utilisateur
router.get('/', async (req, res, next) => {
  try {
    const { type } = req.query;
    
    let categories;
    if (type) {
      categories = await Categorie.trouverParUtilisateurEtType(req.utilisateur_id, type);
    } else {
      categories = await Categorie.trouverParUtilisateur(req.utilisateur_id);
    }

    res.json({ categories });
  } catch (erreur) {
    next(erreur);
  }
});

// Obtenir une catégorie spécifique
router.get('/:id', async (req, res, next) => {
  try {
    const categorie = await Categorie.trouverParId(req.params.id);
    
    if (!categorie || categorie.utilisateur_id !== req.utilisateur_id) {
      return res.status(404).json({
        message: 'Catégorie non trouvée'
      });
    }

    res.json({ categorie });
  } catch (erreur) {
    next(erreur);
  }
});

// Créer une nouvelle catégorie
router.post('/', async (req, res, next) => {
  try {
    const { name, color, type } = req.body;

    // Validation des données
    if (!name || !color || !type) {
      return res.status(400).json({
        message: 'Nom, couleur et type sont requis'
      });
    }

    if (!['revenu', 'depense'].includes(type)) {
      return res.status(400).json({
        message: 'Le type doit être "revenu" ou "depense"'
      });
    }

    // Vérifier si une catégorie avec le même nom existe déjà
    const categoriesExistant = await Categorie.trouverParUtilisateur(req.utilisateur_id);
    const categorieExistant = categoriesExistant.find(cat => cat.nom.toLowerCase() === name.toLowerCase());
    
    if (categorieExistant) {
      return res.status(409).json({
        message: 'Une catégorie avec ce nom existe déjà'
      });
    }

    // Créer la catégorie
    const nouvelleCategorie = await Categorie.creer({
      utilisateur_id: req.utilisateur_id,
      nom: name,
      couleur: color,
      type
    });

    res.status(201).json({
      message: 'Catégorie créée avec succès',
      categorie: nouvelleCategorie
    });
  } catch (erreur) {
    next(erreur);
  }
});

// Modifier une catégorie
router.put('/:id', async (req, res, next) => {
  try {
    const { name, color, type } = req.body;

    // Trouver la catégorie
    const categorie = await Categorie.trouverParId(req.params.id);
    if (!categorie || categorie.utilisateur_id !== req.utilisateur_id) {
      return res.status(404).json({
        message: 'Catégorie non trouvée'
      });
    }

    // Validation des données
    if (!name || !color || !type) {
      return res.status(400).json({
        message: 'Nom, couleur et type sont requis'
      });
    }

    if (!['revenu', 'depense'].includes(type)) {
      return res.status(400).json({
        message: 'Le type doit être "revenu" ou "depense"'
      });
    }

    // Vérifier si une autre catégorie avec le même nom existe déjà
    const categoriesExistant = await Categorie.trouverParUtilisateur(req.utilisateur_id);
    const categorieExistant = categoriesExistant.find(cat => 
      cat.id !== categorie.id && cat.nom.toLowerCase() === name.toLowerCase()
    );
    
    if (categorieExistant) {
      return res.status(409).json({
        message: 'Une catégorie avec ce nom existe déjà'
      });
    }

    // Mettre à jour la catégorie
    await categorie.mettreAJour({
      nom: name,
      couleur: color,
      type
    });

    res.json({
      message: 'Catégorie modifiée avec succès',
      categorie
    });
  } catch (erreur) {
    next(erreur);
  }
});

// Supprimer une catégorie
router.delete('/:id', async (req, res, next) => {
  try {
    const categorie = await Categorie.trouverParId(req.params.id);
    
    if (!categorie || categorie.utilisateur_id !== req.utilisateur_id) {
      return res.status(404).json({
        message: 'Catégorie non trouvée'
      });
    }

    await categorie.supprimer();

    res.json({
      message: 'Catégorie supprimée avec succès'
    });
  } catch (erreur) {
    if (erreur.message.includes('Impossible de supprimer')) {
      return res.status(400).json({
        message: erreur.message
      });
    }
    next(erreur);
  }
});

// Obtenir les statistiques des catégories
router.get('/stats/summary', async (req, res, next) => {
  try {
    const statistiques = await Categorie.obtenirStatistiques(req.utilisateur_id);
    
    res.json({
      statistiques
    });
  } catch (erreur) {
    next(erreur);
  }
});

// Réinitialiser aux catégories par défaut
router.post('/reset-defaults', async (req, res, next) => {
  try {
    const nouvellesCategories = await Categorie.reinitialiserParDefaut(req.utilisateur_id);
    
    res.json({
      message: 'Catégories réinitialisées avec succès',
      categories: nouvellesCategories
    });
  } catch (erreur) {
    next(erreur);
  }
});

module.exports = router;
