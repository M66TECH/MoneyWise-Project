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
        
        // S'assurer que la table password_reset_tokens existe
        const createTokensTableSQL = `
            CREATE TABLE IF NOT EXISTS password_reset_tokens (
                id SERIAL PRIMARY KEY,
                utilisateur_id INTEGER NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
                token VARCHAR(255) UNIQUE NOT NULL,
                expires_at TIMESTAMP NOT NULL,
                used BOOLEAN DEFAULT FALSE,
                date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `;
        
        try {
            await query(createTokensTableSQL);
            console.log('✅ Table password_reset_tokens vérifiée/créée');
        } catch (err) {
            if (err.code === '42710' || err.code === '42P07') {
                console.log('⚠️ Table password_reset_tokens existe déjà');
            } else {
                console.error('❌ Erreur avec la table password_reset_tokens:', err.message);
            }
        }

        // S'assurer que la table email_verification_tokens existe
        const createEmailVerificationTableSQL = `
            CREATE TABLE IF NOT EXISTS email_verification_tokens (
                id SERIAL PRIMARY KEY,
                utilisateur_id INTEGER NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
                token VARCHAR(255) UNIQUE NOT NULL,
                expires_at TIMESTAMP NOT NULL,
                used BOOLEAN DEFAULT FALSE,
                date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `;
        
        try {
            await query(createEmailVerificationTableSQL);
            console.log('✅ Table email_verification_tokens vérifiée/créée');
        } catch (err) {
            if (err.code === '42710' || err.code === '42P07') {
                console.log('⚠️ Table email_verification_tokens existe déjà');
            } else {
                console.error('❌ Erreur avec la table email_verification_tokens:', err.message);
            }
        }

        // Ajouter les colonnes de vérification à la table utilisateurs si elles n'existent pas
        const alterUsersTableSQL = `
            ALTER TABLE utilisateurs 
            ADD COLUMN IF NOT EXISTS email_verifie BOOLEAN DEFAULT FALSE,
            ADD COLUMN IF NOT EXISTS token_verification VARCHAR(255) UNIQUE;
        `;
        
        try {
            await query(alterUsersTableSQL);
            console.log('✅ Colonnes de vérification ajoutées à la table utilisateurs');
        } catch (err) {
            if (err.code === '42710' || err.code === '42P07') {
                console.log('⚠️ Colonnes de vérification existent déjà');
            } else {
                console.error('❌ Erreur avec les colonnes de vérification:', err.message);
            }
        }

        // Ajouter la colonne photo_profil à la table utilisateurs si elle n'existe pas
        const alterPhotoProfilSQL = `
            ALTER TABLE utilisateurs 
            ADD COLUMN IF NOT EXISTS photo_profil VARCHAR(500);
        `;
        
        try {
            await query(alterPhotoProfilSQL);
            console.log('✅ Colonne photo_profil ajoutée à la table utilisateurs');
        } catch (err) {
            if (err.code === '42710' || err.code === '42P07') {
                console.log('⚠️ Colonne photo_profil existe déjà');
            } else {
                console.error('❌ Erreur avec la colonne photo_profil:', err.message);
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
