const { Pool } = require('pg');

// Configuration de la base de données avec support pour DATABASE_URL et variables individuelles
let poolConfig;

if (process.env.DATABASE_URL) {
  // Utiliser DATABASE_URL (format Render/Heroku)
  poolConfig = {
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? {
      rejectUnauthorized: false
    } : false,
  };
} else {
  // Utiliser les variables individuelles (développement local)
  poolConfig = {
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'moneywise',
    password: process.env.DB_PASSWORD || 'milkaM66',
    port: process.env.DB_PORT || 5432,
    ssl: process.env.NODE_ENV === 'production' ? {
      rejectUnauthorized: false
    } : false,
  };
}

const pool = new Pool(poolConfig);

// Test de connexion
pool.on('connect', () => {
  console.log('✅ Connexion à PostgreSQL établie');
});

pool.on('error', (err) => {
  console.error('❌ Erreur de connexion PostgreSQL:', err);
});

// Fonction pour exécuter des requêtes avec gestion d'erreurs
const query = async (text, params) => {
  try {
    const result = await pool.query(text, params);
    return result;
  } catch (error) {
    console.error('❌ Erreur de requête PostgreSQL:', error);
    throw error;
  }
};

// Fonction pour obtenir un client pour les transactions
const getClient = () => pool.connect();

module.exports = {
  query,
  getClient,
  pool
};

pool.on('error', (err) => {
  console.error('❌ Erreur de connexion PostgreSQL:', err);
});

// Fonction pour exécuter des requêtes avec gestion d'erreurs
const query = async (text, params) => {
  try {
    const result = await pool.query(text, params);
    return result;
  } catch (error) {
    console.error('❌ Erreur de requête PostgreSQL:', error);
    throw error;
  }
};

// Fonction pour obtenir un client pour les transactions
const getClient = () => pool.connect();

module.exports = {
  query,
  getClient,
  pool
};
