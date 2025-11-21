const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const swaggerUi = require('swagger-ui-express');
const swaggerSpecs = require('./config/swagger');
const authRoutes = require('./routes/auth');
const transactionRoutes = require('./routes/transactions');
const categoryRoutes = require('./routes/categories');
const dashboardRoutes = require('./routes/dashboard');
const exportRoutes = require('./routes/export');
const profilRoutes = require('./routes/profil');
const notificationRoutes = require('./routes/notifications');
const { errorHandler } = require('./middleware/errorHandler');
const notificationService = require('./services/notificationService');
// Import conditionnel pour éviter les erreurs si le fichier n'existe pas
let initialiserBaseDeDonneesRender;
try {
  const initDb = require('../init-db-render');
  initialiserBaseDeDonneesRender = initDb.initialiserBaseDeDonneesRender;
} catch (error) {
  console.warn('⚠️ Fichier init-db-render.js non trouvé, initialisation manuelle requise');
  initialiserBaseDeDonneesRender = async () => {
    throw new Error('Script d\'initialisation non disponible');
  };
}
const { query } = require('./config/database');

// Configuration des variables d'environnement
dotenv.config();

const app = express();

// Middleware de logging pour diagnostiquer CORS (uniquement en développement)
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`🌐 ${req.method} ${req.path} - Origin: ${req.headers.origin || 'Aucune'}`);
    next();
  });
}

// Middlewares
app.use(cors({
  origin: function (origin, callback) {
    // Autoriser les requêtes sans origin (comme les appels Postman)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      // URLs de développement local
      'http://localhost:5173',  // Vite dev server
      'http://localhost:3000',  // Alternative port
      'http://localhost:8080',  // Alternative port
      'http://127.0.0.1:5173',  // IP alternative
      
      // URLs de production
      'https://moneywise.vercel.app',  // Frontend production Vercel
      'https://moneywise-frontend.vercel.app',  // Alternative Vercel
      'https://moneywise-app.vercel.app',  // Alternative Vercel
      'https://money-wise-coral.vercel.app',  // Nouveau frontend Vercel
      
      // URLs Render (frontend déployé sur Render)
      'https://moneywise-frontend.onrender.com',
      'https://moneywise-app.onrender.com',
      'https://moneywise-client.onrender.com',
      'https://moneywise-backend-187q.onrender.com',
      
      // URL depuis variable d'environnement
      process.env.FRONTEND_URL,
      process.env.CLIENT_URL,
      process.env.ALLOWED_ORIGIN
    ].filter(Boolean);
    
    // En mode développement, autoriser toutes les origines
    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ CORS autorisé (dev): ${origin}`);
      return callback(null, true);
    }
    
    if (allowedOrigins.includes(origin)) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`✅ CORS autorisé: ${origin}`);
      }
      callback(null, true);
    } else {
      if (process.env.NODE_ENV === 'development') {
        console.log(`🚫 CORS bloqué pour l'origine: ${origin}`);
        console.log(`📋 Origines autorisées:`, allowedOrigins);
      }
      callback(new Error('Non autorisé par CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
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
app.use('/api/profil', profilRoutes);
app.use('/api/notifications', notificationRoutes);

// Servir les fichiers statiques des photos de profil (développement local)
app.use('/api/profil/photo', express.static(path.join(__dirname, '../uploads/profiles')));

// Route spécifique pour servir les photos de profil par nom de fichier
app.get('/api/profil/photo/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, '../uploads/profiles', filename);
  
  // Vérifier si le fichier existe
  if (require('fs').existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).json({ message: 'Photo de profil non trouvée' });
  }
});

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


// Fonction pour vérifier si la base de données est initialisée
async function verifierBaseDeDonnees() {
  try {
    // Vérifier si la table utilisateurs existe
    const result = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'utilisateurs'
      );
    `);
    
    return result.rows[0].exists;
  } catch (error) {
    console.error('❌ Erreur lors de la vérification de la base de données:', error.message);
    return false;
  }
}

// Fonction pour initialiser la base de données si nécessaire
async function initialiserBaseDeDonneesSiNecessaire() {
  try {
    const estInitialisee = await verifierBaseDeDonnees();
    
    if (!estInitialisee) {
      console.log('🔄 Base de données non initialisée. Initialisation en cours...');
      await initialiserBaseDeDonneesRender();
      console.log('✅ Base de données initialisée avec succès !');
    } else {
      console.log('✅ Base de données déjà initialisée');
    }
  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation de la base de données:', error.message);
    console.log('⚠️ L\'application va continuer, mais certaines fonctionnalités peuvent ne pas fonctionner.');
    console.log('💡 Exécutez manuellement: npm run db:init-render');
  }
}

// Démarrer le serveur seulement si ce fichier est exécuté directement
if (require.main === module) {
  // Initialiser la base de données avant de démarrer le serveur
  initialiserBaseDeDonneesSiNecessaire()
    .then(() => {
      // Démarrer le serveur après l'initialisation
      app.listen(PORT, () => {
        console.log(`🚀 Serveur MoneyWise démarré sur le port ${PORT}`);
        console.log(`📊 API disponible sur http://localhost:${PORT}/api`);
        
        // Démarrer le service de notifications
        notificationService.start();
      });
    })
    .catch((error) => {
      console.error('❌ Erreur fatale lors du démarrage:', error.message);
      // Démarrer quand même le serveur pour permettre les diagnostics
      app.listen(PORT, () => {
        console.log(`⚠️ Serveur démarré en mode dégradé sur le port ${PORT}`);
        console.log(`📊 API disponible sur http://localhost:${PORT}/api`);
        console.log('💡 Vérifiez les logs ci-dessus pour les erreurs de base de données');
      });
    });
}

module.exports = app;
