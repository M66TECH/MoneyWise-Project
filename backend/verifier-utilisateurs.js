require('dotenv').config();
const { query } = require('./src/config/database');

async function verifierUtilisateurs() {
    try {
        const resultat = await query('SELECT id, email, prenom, nom FROM utilisateurs');
        console.log('Utilisateurs existants :');
        console.table(resultat.rows);
    } catch (erreur) {
        console.error('Erreur lors de la vérification des utilisateurs:', erreur);
    } finally {
        process.exit(0);
    }
}

verifierUtilisateurs();
