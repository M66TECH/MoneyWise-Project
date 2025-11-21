const fs = require('fs');
const path = require('path');
const { getClient } = require('../config/database');

/**
 * Exécute un script SQL en le divisant en commandes individuelles
 * Gère correctement les fonctions PostgreSQL et les blocs $$...$$
 */
async function executeSqlScript(sqlContent) {
  const client = await getClient();
  
  try {
    // Diviser le script en commandes en respectant les blocs $$...$$
    const commands = [];
    let currentCommand = '';
    let inDollarQuote = false;
    let dollarTag = '';
    
    const lines = sqlContent.split('\n');
    
    for (const line of lines) {
      // Ignorer les commentaires et lignes vides
      const trimmed = line.trim();
      if (trimmed.startsWith('--') || trimmed.length === 0) {
        continue;
      }
      
      currentCommand += line + '\n';
      
      // Détecter les blocs $$...$$
      const dollarQuoteMatch = line.match(/\$([^$]*)\$/g);
      if (dollarQuoteMatch) {
        for (const match of dollarQuoteMatch) {
          if (!inDollarQuote) {
            // Début d'un bloc
            inDollarQuote = true;
            dollarTag = match;
          } else if (match === dollarTag) {
            // Fin du bloc
            inDollarQuote = false;
            dollarTag = '';
          }
        }
      }
      
      // Si on n'est pas dans un bloc et qu'on trouve un point-virgule, c'est la fin d'une commande
      if (!inDollarQuote && trimmed.endsWith(';')) {
        const cmd = currentCommand.trim();
        if (cmd.length > 0) {
          commands.push(cmd);
        }
        currentCommand = '';
      }
    }
    
    // Ajouter la dernière commande si elle existe
    if (currentCommand.trim().length > 0) {
      commands.push(currentCommand.trim());
    }
    
    console.log(`📝 Exécution de ${commands.length} commandes SQL...`);
    
    // Exécuter chaque commande
    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      
      try {
        await client.query(command);
        console.log(`✅ Commande ${i + 1}/${commands.length} exécutée`);
      } catch (err) {
        // Ignorer les erreurs "déjà existe"
        if (err.code === '42710' || err.code === '42P07' || err.code === '42P16' ||
            err.message.includes('already exists') || 
            err.message.includes('déjà existe') ||
            err.message.includes('duplicate')) {
          console.log(`⚠️ Commande ${i + 1}/${commands.length}: Objet existe déjà (ignoré)`);
        } else {
          console.error(`❌ Erreur à la commande ${i + 1}/${commands.length}:`, err.message);
          console.error(`📋 Code: ${err.code}`);
          // Continuer avec les autres commandes
        }
      }
    }
    
    console.log('✅ Script SQL exécuté avec succès');
  } finally {
    client.release();
  }
}

/**
 * Initialise la base de données en exécutant le script init.sql
 */
async function initialiserBaseDeDonnees() {
  try {
    console.log('🔄 Initialisation de la base de données...');
    
    // Vérifier la connexion
    console.log('🔍 Test de connexion à la base de données...');
    const { query } = require('../config/database');
    await query('SELECT NOW()');
    console.log('✅ Connexion à la base de données établie');
    
    // Lire le fichier SQL
    const sqlPath = path.join(__dirname, '../../src/database/init.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    // Exécuter le script
    await executeSqlScript(sqlContent);
    
    console.log('✅ Base de données initialisée avec succès !');
  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation:', error.message);
    throw error;
  }
}

module.exports = {
  initialiserBaseDeDonnees,
  executeSqlScript
};

