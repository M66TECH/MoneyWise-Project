require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { query } = require('./src/config/database');

async function initialiserBaseDeDonnees() {
    try {
        console.log(' Initialisation de la base de données...');
        
        // Lire le fichier SQL
        const sqlPath = path.join(__dirname, 'src', 'database', 'init.sql');
        const sqlContent = fs.readFileSync(sqlPath, 'utf8');
        
        // Exécuter le script SQL
        await query(sqlContent);
        
        console.log(' Base de données initialisée avec succès !');
        
    } catch (erreur) {
        console.error(' Erreur lors de l\'initialisation:', erreur);
        process.exit(1);
    }
}

// Exécuter seulement si appelé directement
if (require.main === module) {
    initialiserBaseDeDonnees();
}

module.exports = { initialiserBaseDeDonnees };
