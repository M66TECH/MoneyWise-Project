const jwt = require('jsonwebtoken');
const Utilisateur = require('../models/Utilisateur');

// Middleware d'authentification
const auth = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ 
                message: 'Token d\'authentification requis' 
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const utilisateur = await Utilisateur.trouverParId(decoded.utilisateur_id);
        
        if (!utilisateur) {
            return res.status(401).json({ 
                message: 'Token invalide' 
            });
        }

        req.utilisateur_id = utilisateur.id;
        req.utilisateur = utilisateur;
        next();

    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ 
                message: 'Token invalide' 
            });
        }
        
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ 
                message: 'Token expiré' 
            });
        }
        
        res.status(500).json({ 
            message: 'Erreur d\'authentification' 
        });
    }
};

module.exports = {
    auth
};
