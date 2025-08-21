const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'moneywise',
  password: process.env.DB_PASSWORD || 'milkaM66',
  port: process.env.DB_PORT || 5432,
});

// Test de connexion
pool.on('connect', () => {
  console.log(' Connexion à PostgreSQL établie');
});

pool.on('error', (err) => {
  console.error(' Erreur de connexion PostgreSQL:', err);
});

// Fonction pour exécuter des requêtes
const query = (text, params) => pool.query(text, params);

// Fonction pour obtenir un client pour les transactions
const getClient = () => pool.connect();

module.exports = {
  query,
  getClient,
  pool
};
