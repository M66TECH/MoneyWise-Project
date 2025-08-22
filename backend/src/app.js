const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const authRoutes = require('./routes/auth');
const transactionRoutes = require('./routes/transactions');
const categoryRoutes = require('./routes/categories');
const dashboardRoutes = require('./routes/dashboard');
const exportRoutes = require('./routes/export');
const { errorHandler } = require('./middleware/errorHandler');

const { initialiserBaseDeDonneesRender } = require('../init-db-render');


// Configuration des variables d'environnement
dotenv.config();

const app = express();

// Middlewares
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/export', exportRoutes);

// Route de test
app.get('/api/health', (req, res) => {
  res.json({ message: 'MoneyWise API is running!', timestamp: new Date().toISOString() });
});

// Middleware de gestion d'erreurs
app.use(errorHandler);

// Gestion des routes non trouvées
app.use((req, res) => {
  res.status(404).json({ message: 'Route non trouvée' });
});

const PORT = process.env.PORT || 3000;


// Initialiser la base de données au démarrage
async function demarrerServeur() {
  try {
    // Initialiser la base de données
    console.log('🔄 Tentative d\'initialisation de la base de données...');
    await initialiserBaseDeDonneesRender();
    console.log('✅ Base de données initialisée avec succès !');
    
    // Démarrer le serveur
    app.listen(PORT, () => {
      console.log(`🚀 Serveur MoneyWise démarré sur le port ${PORT}`);
      console.log(`📊 API disponible sur http://localhost:${PORT}/api`);
    });
  } catch (erreur) {
    console.error('❌ Erreur lors de l\'initialisation de la base de données:', erreur.message);
    console.log('⚠️ Démarrage du serveur sans initialisation de la base de données...');
    
    // Démarrer le serveur même si l'initialisation échoue
    app.listen(PORT, () => {
      console.log(`🚀 Serveur MoneyWise démarré sur le port ${PORT}`);
      console.log(`📊 API disponible sur http://localhost:${PORT}/api`);
      console.log('⚠️ La base de données n\'a pas été initialisée. Certaines fonctionnalités peuvent ne pas fonctionner.');
    });
  }
}

demarrerServeur();


module.exports = app;
