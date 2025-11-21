// Service Frontend pour les Alertes MoneyWise
// À intégrer dans votre application frontend

class AlertService {
  constructor() {
    this.baseURL = 'http://localhost:3000/api';
    this.checkInterval = null;
    this.isRunning = false;
    this.lastCheck = null;
    this.alertes = [];
    this.callbacks = [];
  }

  // Initialiser le service avec le token d'authentification
  init(token) {
    this.token = token;
    console.log('🔔 Service d\'alertes frontend initialisé');
  }

  // Démarrer la vérification automatique
  startAutoCheck(intervalMinutes = 30) {
    if (this.isRunning) {
      console.log('⚠️ Service d\'alertes déjà en cours d\'exécution');
      return;
    }

    this.isRunning = true;
    console.log(`🔔 Vérification automatique des alertes démarrée (${intervalMinutes} min)`);

    // Vérification immédiate
    this.checkAlertes();

    // Vérification périodique
    this.checkInterval = setInterval(() => {
      this.checkAlertes();
    }, intervalMinutes * 60 * 1000);
  }

  // Arrêter la vérification automatique
  stopAutoCheck() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    this.isRunning = false;
    console.log('🔔 Vérification automatique des alertes arrêtée');
  }

  // Vérifier les alertes manuellement
  async checkAlertes() {
    try {
      if (!this.token) {
        console.error('❌ Token d\'authentification manquant');
        return;
      }

      console.log('🔍 Vérification des alertes...');
      
      const response = await fetch(`${this.baseURL}/notifications/check-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        }
      });

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      const data = await response.json();
      this.alertes = data.alertes || [];
      this.lastCheck = new Date();

      console.log(`✅ ${this.alertes.length} alerte(s) trouvée(s)`);

      // Notifier les callbacks
      this.notifyCallbacks();

      return data;
    } catch (error) {
      console.error('❌ Erreur lors de la vérification des alertes:', error);
      return null;
    }
  }

  // Obtenir les alertes actuelles
  getAlertes() {
    return this.alertes;
  }

  // Obtenir les alertes par type
  getAlertesByType(type) {
    return this.alertes.filter(alerte => alerte.type === type);
  }

  // Obtenir les alertes par sévérité
  getAlertesBySeverite(severite) {
    return this.alertes.filter(alerte => alerte.severite === severite);
  }

  // Vérifier s'il y a des alertes critiques
  hasCriticalAlertes() {
    return this.alertes.some(alerte => alerte.severite === 'high');
  }

  // Ajouter un callback pour être notifié des changements
  onAlertesChange(callback) {
    this.callbacks.push(callback);
  }

  // Notifier tous les callbacks
  notifyCallbacks() {
    this.callbacks.forEach(callback => {
      try {
        callback(this.alertes);
      } catch (error) {
        console.error('❌ Erreur dans le callback d\'alertes:', error);
      }
    });
  }

  // Obtenir le statut du service
  getStatus() {
    return {
      isRunning: this.isRunning,
      lastCheck: this.lastCheck,
      alertesCount: this.alertes.length,
      hasCritical: this.hasCriticalAlertes()
    };
  }

  // Nettoyer les alertes (après affichage)
  clearAlertes() {
    this.alertes = [];
    this.notifyCallbacks();
  }

  // Marquer une alerte comme lue
  markAsRead(alerteIndex) {
    if (this.alertes[alerteIndex]) {
      this.alertes[alerteIndex].read = true;
      this.notifyCallbacks();
    }
  }
}

// Exemple d'utilisation dans une application React/Vue/Angular
const alertService = new AlertService();

// Exemple d'intégration avec React
/*
import React, { useState, useEffect } from 'react';

function AlertComponent() {
  const [alertes, setAlertes] = useState([]);
  const [status, setStatus] = useState({});

  useEffect(() => {
    // Initialiser le service avec le token
    alertService.init(localStorage.getItem('token'));
    
    // S'abonner aux changements d'alertes
    alertService.onAlertesChange((nouvellesAlertes) => {
      setAlertes(nouvellesAlertes);
      setStatus(alertService.getStatus());
    });

    // Démarrer la vérification automatique
    alertService.startAutoCheck(15); // Vérifier toutes les 15 minutes

    // Vérification manuelle au chargement
    alertService.checkAlertes();

    return () => {
      alertService.stopAutoCheck();
    };
  }, []);

  const handleCheckNow = () => {
    alertService.checkAlertes();
  };

  return (
    <div className="alertes-container">
      <div className="alertes-header">
        <h3>🚨 Alertes Financières</h3>
        <button onClick={handleCheckNow}>Vérifier maintenant</button>
        <span>Dernière vérification: {status.lastCheck}</span>
      </div>
      
      {alertes.length === 0 ? (
        <p>✅ Aucune alerte pour le moment</p>
      ) : (
        <div className="alertes-list">
          {alertes.map((alerte, index) => (
            <div key={index} className={`alerte alerte-${alerte.type}`}>
              <span className="severite">{alerte.severite}</span>
              <p>{alerte.message}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
*/

// Exemple d'intégration avec Vue.js
/*
<template>
  <div class="alertes-container">
    <div class="alertes-header">
      <h3>🚨 Alertes Financières</h3>
      <button @click="checkNow">Vérifier maintenant</button>
      <span>Dernière vérification: {{ status.lastCheck }}</span>
    </div>
    
    <div v-if="alertes.length === 0" class="no-alertes">
      ✅ Aucune alerte pour le moment
    </div>
    
    <div v-else class="alertes-list">
      <div 
        v-for="(alerte, index) in alertes" 
        :key="index"
        :class="['alerte', `alerte-${alerte.type}`]"
      >
        <span class="severite">{{ alerte.severite }}</span>
        <p>{{ alerte.message }}</p>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      alertes: [],
      status: {}
    }
  },
  
  mounted() {
    alertService.init(localStorage.getItem('token'));
    alertService.onAlertesChange((nouvellesAlertes) => {
      this.alertes = nouvellesAlertes;
      this.status = alertService.getStatus();
    });
    alertService.startAutoCheck(15);
    alertService.checkAlertes();
  },
  
  beforeDestroy() {
    alertService.stopAutoCheck();
  },
  
  methods: {
    checkNow() {
      alertService.checkAlertes();
    }
  }
}
</script>
*/

// Exemple d'intégration avec Angular
/*
import { Component, OnInit, OnDestroy } from '@angular/core';

@Component({
  selector: 'app-alertes',
  template: `
    <div class="alertes-container">
      <div class="alertes-header">
        <h3>🚨 Alertes Financières</h3>
        <button (click)="checkNow()">Vérifier maintenant</button>
        <span>Dernière vérification: {{ status.lastCheck }}</span>
      </div>
      
      <div *ngIf="alertes.length === 0" class="no-alertes">
        ✅ Aucune alerte pour le moment
      </div>
      
      <div *ngIf="alertes.length > 0" class="alertes-list">
        <div 
          *ngFor="let alerte of alertes; let i = index"
          [class]="'alerte alerte-' + alerte.type"
        >
          <span class="severite">{{ alerte.severite }}</span>
          <p>{{ alerte.message }}</p>
        </div>
      </div>
    </div>
  `
})
export class AlertesComponent implements OnInit, OnDestroy {
  alertes: any[] = [];
  status: any = {};

  ngOnInit() {
    alertService.init(localStorage.getItem('token'));
    alertService.onAlertesChange((nouvellesAlertes) => {
      this.alertes = nouvellesAlertes;
      this.status = alertService.getStatus();
    });
    alertService.startAutoCheck(15);
    alertService.checkAlertes();
  }

  ngOnDestroy() {
    alertService.stopAutoCheck();
  }

  checkNow() {
    alertService.checkAlertes();
  }
}
*/

module.exports = AlertService;
