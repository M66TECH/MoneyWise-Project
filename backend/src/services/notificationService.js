const Transaction = require('../models/Transaction');
const Utilisateur = require('../models/Utilisateur');
const emailService = require('./emailService');

class NotificationService {
  constructor() {
    this.isRunning = false;
  }

  // Démarrer le service de notifications (version simplifiée)
  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log('🔔 Service de notifications démarré (mode manuel)');
  }

  // Arrêter le service
  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    this.isRunning = false;
    console.log('🔔 Service de notifications arrêté');
  }

  // Vérifier les alertes financières pour tous les utilisateurs
  async verifierAlertesFinancieres() {
    try {
      console.log('🔍 Vérification des alertes financières...');
      
      // Récupérer tous les utilisateurs
      const utilisateurs = await Utilisateur.trouverTous();
      
      if (!utilisateurs || utilisateurs.length === 0) {
        console.log('ℹ️ Aucun utilisateur trouvé pour les alertes');
        return;
      }
      
      console.log(`📊 Vérification des alertes pour ${utilisateurs.length} utilisateur(s)`);
      
      for (const utilisateur of utilisateurs) {
        await this.verifierAlertesUtilisateur(utilisateur);
      }
      
      console.log('✅ Vérification des alertes terminée');
    } catch (error) {
      console.error('❌ Erreur lors de la vérification des alertes:', error);
    }
  }

  // Vérifier les alertes pour un utilisateur spécifique
  async verifierAlertesUtilisateur(utilisateur, envoyerEmail = false) {
    try {
      console.log(`🔍 Vérification des alertes pour ${utilisateur.email}...`);
      
      const alertes = [];
      const moisCourant = new Date().getMonth() + 1;
      const anneeCourante = new Date().getFullYear();

      // Obtenir les statistiques mensuelles
      const statistiquesMensuelles = await Transaction.obtenirStatistiquesMensuelles(
        utilisateur.id, 
        anneeCourante, 
        moisCourant
      );

      // Vérifier le solde négatif
      if (statistiquesMensuelles.solde < 0) {
        alertes.push({
          type: 'danger',
          message: `Votre solde est négatif : ${statistiquesMensuelles.solde.toFixed(2)} FCFA`,
          severite: 'high'
        });
      }

      // Vérifier les dépenses élevées (>80% des revenus)
      if (statistiquesMensuelles.total_revenus > 0 && 
          (statistiquesMensuelles.total_depenses / statistiquesMensuelles.total_revenus) > 0.8) {
        alertes.push({
          type: 'warning',
          message: 'Vos dépenses représentent plus de 80% de vos revenus ce mois-ci',
          severite: 'medium'
        });
      }

      // Vérifier l'inactivité (>7 jours sans transaction)
      const dernieresTransactions = await Transaction.trouverParUtilisateur(utilisateur.id, { 
        limit: 1 
      });

      if (dernieresTransactions.length > 0) {
        const dateDerniereTransaction = new Date(dernieresTransactions[0].date_transaction);
        const joursDepuisDerniereTransaction = Math.floor(
          (new Date() - dateDerniereTransaction) / (1000 * 60 * 60 * 24)
        );
        
        if (joursDepuisDerniereTransaction > 7) {
          alertes.push({
            type: 'info',
            message: `Aucune transaction depuis ${joursDepuisDerniereTransaction} jours`,
            severite: 'low'
          });
        }
      }

      let emailSent = false;

      // Envoyer les alertes par email si demandé et s'il y en a
      if (envoyerEmail && alertes.length > 0) {
        console.log(`📧 Envoi de ${alertes.length} alertes à ${utilisateur.email}`);
        
        try {
          await emailService.envoyerAlertesFinancieres(
            utilisateur.email,
            utilisateur.prenom,
            alertes
          );
          console.log(`✅ Alertes envoyées à ${utilisateur.email}`);
          emailSent = true;
        } catch (emailError) {
          console.error(`❌ Erreur envoi email à ${utilisateur.email}:`, emailError);
        }
      } else if (alertes.length > 0) {
        console.log(`ℹ️ ${alertes.length} alertes détectées pour ${utilisateur.email} (email non envoyé)`);
      } else {
        console.log(`ℹ️ Aucune alerte pour ${utilisateur.email}`);
      }

      return {
        alertes,
        emailSent,
        utilisateur: {
          id: utilisateur.id,
          email: utilisateur.email,
          prenom: utilisateur.prenom
        }
      };

    } catch (error) {
      console.error(`❌ Erreur vérification alertes pour ${utilisateur.email}:`, error);
      throw error;
    }
  }

  // Méthode pour forcer la vérification immédiate
  async verifierMaintenant() {
    console.log('🔍 Vérification immédiate des alertes...');
    await this.verifierAlertesFinancieres();
  }
}

module.exports = new NotificationService();
