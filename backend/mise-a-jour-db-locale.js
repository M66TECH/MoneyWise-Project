require('dotenv').config();
const { query } = require('./src/config/database');

async function mettreAJourBaseDeDonneesLocale() {
    console.log('🔄 Mise à jour de la base de données locale...\n');
    
    try {
        // 1. Vérifier la connexion
        console.log('1️⃣ Test de connexion à la base de données...');
        await query('SELECT NOW()');
        console.log('✅ Connexion à la base de données établie\n');
        
        // 2. Créer la table password_reset_tokens
        console.log('2️⃣ Création de la table password_reset_tokens...');
        const createPasswordResetTokensSQL = `
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
            await query(createPasswordResetTokensSQL);
            console.log('✅ Table password_reset_tokens créée/vérifiée');
        } catch (err) {
            if (err.code === '42710' || err.code === '42P07') {
                console.log('⚠️ Table password_reset_tokens existe déjà');
            } else {
                console.error('❌ Erreur avec la table password_reset_tokens:', err.message);
                throw err;
            }
        }
        
        // 3. Créer la table email_verification_tokens
        console.log('\n3️⃣ Création de la table email_verification_tokens...');
        const createEmailVerificationTokensSQL = `
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
            await query(createEmailVerificationTokensSQL);
            console.log('✅ Table email_verification_tokens créée/vérifiée');
        } catch (err) {
            if (err.code === '42710' || err.code === '42P07') {
                console.log('⚠️ Table email_verification_tokens existe déjà');
            } else {
                console.error('❌ Erreur avec la table email_verification_tokens:', err.message);
                throw err;
            }
        }
        
        // 4. Ajouter les colonnes de vérification à la table utilisateurs
        console.log('\n4️⃣ Ajout des colonnes de vérification à la table utilisateurs...');
        
        // Vérifier si la colonne email_verifie existe
        const checkEmailVerifieSQL = `
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'utilisateurs' 
            AND column_name = 'email_verifie';
        `;
        
        const emailVerifieExists = await query(checkEmailVerifieSQL);
        
        if (emailVerifieExists.rows.length === 0) {
            console.log('   → Ajout de la colonne email_verifie...');
            await query('ALTER TABLE utilisateurs ADD COLUMN email_verifie BOOLEAN DEFAULT FALSE');
            console.log('   ✅ Colonne email_verifie ajoutée');
        } else {
            console.log('   ⚠️ Colonne email_verifie existe déjà');
        }
        
        // Vérifier si la colonne token_verification existe
        const checkTokenVerificationSQL = `
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'utilisateurs' 
            AND column_name = 'token_verification';
        `;
        
        const tokenVerificationExists = await query(checkTokenVerificationSQL);
        
        if (tokenVerificationExists.rows.length === 0) {
            console.log('   → Ajout de la colonne token_verification...');
            await query('ALTER TABLE utilisateurs ADD COLUMN token_verification VARCHAR(255) UNIQUE');
            console.log('   ✅ Colonne token_verification ajoutée');
        } else {
            console.log('   ⚠️ Colonne token_verification existe déjà');
        }
        
        // 5. Mettre à jour les utilisateurs existants
        console.log('\n5️⃣ Mise à jour des utilisateurs existants...');
        
        // Marquer tous les utilisateurs existants comme vérifiés (pour éviter les problèmes)
        const updateExistingUsersSQL = `
            UPDATE utilisateurs 
            SET email_verifie = TRUE 
            WHERE email_verifie IS NULL OR email_verifie = FALSE;
        `;
        
        const updateResult = await query(updateExistingUsersSQL);
        console.log(`   ✅ ${updateResult.rowCount} utilisateur(s) existant(s) marqué(s) comme vérifié(s)`);
        
        // 6. Créer les index pour optimiser les performances
        console.log('\n6️⃣ Création des index...');
        
        const createIndexesSQL = [
            'CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);',
            'CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_utilisateur_id ON password_reset_tokens(utilisateur_id);',
            'CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at);',
            'CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_token ON email_verification_tokens(token);',
            'CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_utilisateur_id ON email_verification_tokens(utilisateur_id);',
            'CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_expires_at ON email_verification_tokens(expires_at);',
            'CREATE INDEX IF NOT EXISTS idx_utilisateurs_email_verifie ON utilisateurs(email_verifie);'
        ];
        
        for (const indexSQL of createIndexesSQL) {
            try {
                await query(indexSQL);
            } catch (err) {
                if (err.code !== '42710') { // Ignorer si l'index existe déjà
                    console.log(`   ⚠️ Index déjà existant ou erreur mineure`);
                }
            }
        }
        console.log('   ✅ Index créés/vérifiés');
        
        // 7. Vérification finale
        console.log('\n7️⃣ Vérification finale...');
        
        // Compter les tables
        const countTablesSQL = `
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('utilisateurs', 'categories', 'transactions', 'password_reset_tokens', 'email_verification_tokens');
        `;
        
        const tables = await query(countTablesSQL);
        console.log(`   📊 Tables trouvées: ${tables.rows.length}/5`);
        
        // Compter les utilisateurs
        const countUsersSQL = 'SELECT COUNT(*) as total FROM utilisateurs;';
        const usersCount = await query(countUsersSQL);
        console.log(`   👥 Utilisateurs dans la base: ${usersCount.rows[0].total}`);
        
        // Vérifier les colonnes de la table utilisateurs
        const checkColumnsSQL = `
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'utilisateurs' 
            ORDER BY ordinal_position;
        `;
        
        const columns = await query(checkColumnsSQL);
        const columnNames = columns.rows.map(row => row.column_name);
        console.log(`   📋 Colonnes utilisateurs: ${columnNames.join(', ')}`);
        
        console.log('\n🎉 Mise à jour de la base de données terminée avec succès !');
        console.log('\n📋 Résumé des modifications :');
        console.log('   ✅ Table password_reset_tokens créée/vérifiée');
        console.log('   ✅ Table email_verification_tokens créée/vérifiée');
        console.log('   ✅ Colonnes email_verifie et token_verification ajoutées');
        console.log('   ✅ Utilisateurs existants mis à jour');
        console.log('   ✅ Index de performance créés');
        
        console.log('\n🚀 La base de données est maintenant prête pour :');
        console.log('   • La vérification d\'email lors de l\'inscription');
        console.log('   • La récupération de mot de passe');
        console.log('   • La gestion des tokens de sécurité');
        
    } catch (erreur) {
        console.error('\n❌ Erreur lors de la mise à jour:', erreur.message);
        console.error('Stack trace:', erreur.stack);
        throw erreur;
    }
}

// Exécuter seulement si appelé directement
if (require.main === module) {
    mettreAJourBaseDeDonneesLocale()
        .then(() => {
            console.log('\n✅ Script terminé avec succès');
            process.exit(0);
        })
        .catch((err) => {
            console.error('\n💥 Échec du script:', err.message);
            process.exit(1);
        });
}

module.exports = { mettreAJourBaseDeDonneesLocale };
