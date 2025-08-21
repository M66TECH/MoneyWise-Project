// Test simple de l'API MoneyWise
const axios = require('axios');

const URL_BASE_API = 'http://localhost:3000/api';

async function testerAPI() {
  console.log('🧪 Test de l\'API MoneyWise...\n');

  try {
    // Test 1: Vérifier que le serveur répond
    console.log('1. Test de connectivité...');
    const reponseSante = await axios.get(`${URL_BASE_API}/health`);
    console.log('✅ Serveur accessible:', reponseSante.data.message);
    console.log('📅 Timestamp:', reponseSante.data.timestamp);
    console.log('');

    // Test 2: Inscription d'un utilisateur de test
    console.log('2. Test d\'inscription...');
    const donneesInscription = {
      email: 'test@moneywise.com',
      password: 'testpassword123',
      firstName: 'Test',
      lastName: 'User'
    };

    const reponseInscription = await axios.post(`${URL_BASE_API}/auth/register`, donneesInscription);
    console.log('✅ Utilisateur créé:', reponseInscription.data.utilisateur.email);
    console.log('🔑 Token reçu:', reponseInscription.data.token ? 'Oui' : 'Non');
    console.log('');

    const token = reponseInscription.data.token;

    // Test 3: Connexion
    console.log('3. Test de connexion...');
    const donneesConnexion = {
      email: 'test@moneywise.com',
      password: 'testpassword123'
    };

    const reponseConnexion = await axios.post(`${URL_BASE_API}/auth/login`, donneesConnexion);
    console.log('✅ Connexion réussie:', reponseConnexion.data.utilisateur.email);
    console.log('');

    // Test 4: Obtenir le profil
    console.log('4. Test de récupération du profil...');
    const reponseProfil = await axios.get(`${URL_BASE_API}/auth/profile`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Profil récupéré:', reponseProfil.data.utilisateur.prenom, reponseProfil.data.utilisateur.nom);
    console.log('');

    // Test 5: Obtenir les catégories
    console.log('5. Test de récupération des catégories...');
    const reponseCategories = await axios.get(`${URL_BASE_API}/categories`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Catégories récupérées:', reponseCategories.data.categories.length, 'catégories');
    console.log('📋 Catégories de revenus:', reponseCategories.data.categories.filter(c => c.type === 'revenu').length);
    console.log('📋 Catégories de dépenses:', reponseCategories.data.categories.filter(c => c.type === 'depense').length);
    console.log('');

    // Test 6: Obtenir le solde
    console.log('6. Test de récupération du solde...');
    const reponseSolde = await axios.get(`${URL_BASE_API}/transactions/balance/summary`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Solde récupéré:', reponseSolde.data.solde, '€');
    console.log('');

    // Test 7: Obtenir le tableau de bord
    console.log('7. Test du tableau de bord...');
    const reponseTableauBord = await axios.get(`${URL_BASE_API}/dashboard/summary`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Tableau de bord récupéré');
    console.log('📊 Statistiques mensuelles disponibles');
    console.log('📈 Données des 6 derniers mois:', reponseTableauBord.data.sixDerniersMois.length, 'mois');
    console.log('');

    console.log('🎉 Tous les tests sont passés avec succès !');
    console.log('🚀 L\'API MoneyWise est prête à être utilisée.');

  } catch (erreur) {
    console.error('❌ Erreur lors du test:', erreur.message);
    
    if (erreur.response) {
      console.error('📊 Statut:', erreur.response.status);
      console.error('📝 Message:', erreur.response.data.message);
    }
    
    console.log('\n💡 Vérifiez que:');
    console.log('   - Le serveur est démarré (npm run dev)');
    console.log('   - La base de données PostgreSQL est accessible');
    console.log('   - Les variables d\'environnement sont configurées');
  }
}

// Exécuter le test si le fichier est appelé directement
if (require.main === module) {
  testerAPI();
}

module.exports = { testerAPI };
