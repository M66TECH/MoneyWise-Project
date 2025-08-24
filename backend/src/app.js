const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const swaggerUi = require('swagger-ui-express');
const swaggerSpecs = require('./config/swagger');
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

// Middleware de logging pour diagnostiquer CORS
app.use((req, res, next) => {
  console.log(`🌐 ${req.method} ${req.path} - Origin: ${req.headers.origin || 'Aucune'}`);
  next();
});

// Middlewares
app.use(cors({
  origin: function (origin, callback) {
    // Autoriser les requêtes sans origin (comme les appels Postman)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:5173',  // Vite dev server
      'http://localhost:3000',  // Alternative port
      'http://localhost:8000',  // Test frontend server
      'http://localhost:8080',  // Alternative port
      'http://127.0.0.1:5173',  // IP alternative
      'http://127.0.0.1:3000',  // IP alternative
      'http://127.0.0.1:8000',  // IP alternative for test frontend
      process.env.FRONTEND_URL  // URL de production si définie
    ].filter(Boolean);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log(`🚫 CORS bloqué pour l'origine: ${origin}`);
      callback(new Error('Non autorisé par CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Documentation Swagger
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'MoneyWise API Documentation'
}));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/export', exportRoutes);

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Vérifier l'état de l'API
 *     tags: [Système]
 *     responses:
 *       200:
 *         description: API opérationnelle
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: MoneyWise API is running!
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: "2024-08-21T10:30:00.000Z"
 */
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
