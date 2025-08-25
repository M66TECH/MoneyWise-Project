require('dotenv').config();
const { query } = require('./src/config/database');

async function migrerColonnePhotoProfil() {
    try {
        console.log('🔄 Migration de la colonne photo_profil...');
        
        // Vérifier si la colonne existe déjà
        const checkColumnSQL = `
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'utilisateurs' 
            AND column_name = 'photo_profil';
        `;
        
        const result = await query(checkColumnSQL);
        
        if (result.rows.length > 0) {
            console.log('✅ La colonne photo_profil existe déjà');
            return;
        }
        
        // Ajouter la colonne photo_profil
        const addColumnSQL = `
            ALTER TABLE utilisateurs 
            ADD COLUMN photo_profil VARCHAR(500);
        `;
        
        await query(addColumnSQL);
        console.log('✅ Colonne photo_profil ajoutée avec succès');
        
        // Vérifier que la colonne a été ajoutée
        const verifySQL = `
            SELECT column_name, data_type, character_maximum_length
            FROM information_schema.columns 
            WHERE table_name = 'utilisateurs' 
            AND column_name = 'photo_profil';
        `;
        
        const verifyResult = await query(verifySQL);
        if (verifyResult.rows.length > 0) {
            const column = verifyResult.rows[0];
            console.log(`✅ Vérification réussie : ${column.column_name} (${column.data_type}${column.character_maximum_length ? '(' + column.character_maximum_length + ')' : ''})`);
        }
        
        console.log('🎉 Migration terminée avec succès');
        
    } catch (erreur) {
        console.error('❌ Erreur lors de la migration:', erreur.message);
        throw erreur;
    }
}

// Exécuter seulement si appelé directement
if (require.main === module) {
    migrerColonnePhotoProfil()
        .then(() => {
            console.log('✅ Migration complète');
            process.exit(0);
        })
        .catch((err) => {
            console.error('💥 Échec de la migration:', err.message);
            process.exit(1);
        });
}

module.exports = { migrerColonnePhotoProfil };
