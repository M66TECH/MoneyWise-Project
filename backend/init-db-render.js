require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { query } = require('./src/config/database');

async function initialiserBaseDeDonneesRender() {
    try {
        console.log('🔄 Initialisation de la base de données sur Render...');
        
        // Vérifier la connexion
        console.log('🔍 Test de connexion à la base de données...');
        await query('SELECT NOW()');
        console.log('✅ Connexion à la base de données établie');
        
        // Lire le fichier SQL
        const sqlPath = path.join(__dirname, 'src', 'database', 'init.sql');
        const sqlContent = fs.readFileSync(sqlPath, 'utf8');
        
        // Exécuter le script SQL complet
        try {
            await query(sqlContent);
            console.log('✅ Script SQL exécuté avec succès');
        } catch (err) {
            // Ignorer les erreurs de création si l'objet existe déjà
            if (err.code === '42710' || err.code === '42P07') {
                console.log('⚠️ Certains objets existent déjà');
            } else {
                console.error('❌ Erreur lors de l\'exécution du script SQL:', err.message);
                throw err;
            }
        }
        
        console.log('✅ Base de données initialisée avec succès sur Render !');
        
    } catch (erreur) {
        console.error('❌ Erreur lors de l\'initialisation:', erreur.message);
        throw erreur;
    }
}

// Exécuter seulement si appelé directement
if (require.main === module) {
    initialiserBaseDeDonneesRender()
        .then(() => {
            console.log('🎉 Initialisation terminée avec succès');
            process.exit(0);
        })
        .catch((err) => {
            console.error('💥 Échec de l\'initialisation:', err.message);
            process.exit(1);
        });
}

module.exports = { initialiserBaseDeDonneesRender };
