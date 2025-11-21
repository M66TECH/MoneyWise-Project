const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

async function initialiserBaseDeDonnees() {
  console.log('🔄 Initialisation de la base de données locale...');
  
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'moneywise',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password'
  });

  try {
    // Tester la connexion
    console.log('🔍 Test de connexion à la base de données...');
    const client = await pool.connect();
    console.log('✅ Connexion à PostgreSQL établie');

    // Lire le fichier SQL
    const sqlPath = path.join(__dirname, 'src', 'database', 'init.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    // Exécuter le script SQL
    console.log('📝 Exécution du script d\'initialisation...');
    await client.query(sqlContent);
    console.log('✅ Base de données initialisée avec succès !');

    // Vérifier que la table password_reset_tokens existe
    const result = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'password_reset_tokens'
      );
    `);
    
    if (result.rows[0].exists) {
      console.log('✅ Table password_reset_tokens créée avec succès');
    } else {
      console.log('❌ Table password_reset_tokens non trouvée');
    }

    client.release();
  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('💡 Vérifiez que PostgreSQL est démarré');
    } else if (error.code === '28P01') {
      console.log('💡 Vérifiez vos identifiants PostgreSQL dans .env');
    }
  } finally {
    await pool.end();
  }
}

// Exécuter l'initialisation
initialiserBaseDeDonnees().catch(console.error);
