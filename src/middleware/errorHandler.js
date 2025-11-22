const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  logger.error('Erreur:', err);

  // Erreurs de validation
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      message: 'Données invalides',
      errors: err.errors
    });
  }

  // Erreurs de contrainte de base de données
  if (err.code === '23505') { // Violation de contrainte unique
    return res.status(400).json({
      message: 'Cette ressource existe déjà'
    });
  }

  if (err.code === '23503') { // Violation de clé étrangère
    return res.status(400).json({
      message: 'Référence invalide'
    });
  }

  // Erreurs de syntaxe JSON
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      message: 'Format JSON invalide'
    });
  }

  // Erreur par défaut
  res.status(err.status || 500).json({
    message: err.message || 'Erreur serveur interne'
  });
};

module.exports = {
  errorHandler
};
