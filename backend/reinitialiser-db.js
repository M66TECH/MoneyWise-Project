require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { query } = require('./src/config/database');

async function reinitialiserBaseDeDonnees() {
    try {
        console.log('🔄 Réinitialisation de la base de données...');
        
        // Supprimer les objets existants
        console.log('🗑️ Suppression des objets existants...');
        await query(`
            DROP TRIGGER IF EXISTS trigger_utilisateurs_date_modification ON utilisateurs;
            DROP TRIGGER IF EXISTS trigger_categories_date_modification ON categories;
            DROP TRIGGER IF EXISTS trigger_transactions_date_modification ON transactions;
            DROP FUNCTION IF EXISTS mettre_a_jour_date_modification();
            DROP FUNCTION IF EXISTS obtenir_solde_utilisateur(INTEGER);
            DROP FUNCTION IF EXISTS obtenir_statistiques_mensuelles(INTEGER, INTEGER, INTEGER);
            DROP VIEW IF EXISTS vue_transactions_completes;
            DROP VIEW IF EXISTS vue_statistiques_categories;
        `);
        
        // Lire le fichier SQL
        const sqlPath = path.join(__dirname, 'src', 'database', 'init.sql');
        const sqlContent = fs.readFileSync(sqlPath, 'utf8');
        
        // Exécuter le script SQL
        await query(sqlContent);
        
        console.log('✅ Base de données réinitialisée avec succès !');
        
        // Vérifier que la fonction fonctionne
        const testResult = await query('SELECT obtenir_statistiques_mensuelles(1, 2024, 8)');
        console.log('✅ Test de la fonction statistiques mensuelles réussi !');
        
    } catch (erreur) {
        console.error('❌ Erreur lors de la réinitialisation:', erreur);
    } finally {
        process.exit(0);
    }
}

reinitialiserBaseDeDonnees();
