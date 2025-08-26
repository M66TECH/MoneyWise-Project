const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initialiserTransporter();
  }

  initialiserTransporter() {
    this.transporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE || 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });
  }

  // Envoyer un email de récupération de mot de passe
  async envoyerEmailRecuperation(email, prenom, resetToken) {
    // Réinitialiser le transporteur avec les variables d'environnement actuelles
    this.initialiserTransporter();
    
    // Déterminer l'URL frontend selon l'environnement
    const frontendUrl = this.getFrontendUrl();
    const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;
    
    const mailOptions = {
      from: `"MoneyWise" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Réinitialisation de votre mot de passe - MoneyWise',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0; font-size: 28px;">MoneyWise</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Gestion de vos finances personnelles</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #333; margin-bottom: 20px;">Bonjour ${prenom},</h2>
            
            <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
              Vous avez demandé la réinitialisation de votre mot de passe pour votre compte MoneyWise.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" 
                 style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                        color: white; 
                        padding: 15px 30px; 
                        text-decoration: none; 
                        border-radius: 25px; 
                        display: inline-block; 
                        font-weight: bold;
                        box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);">
                Réinitialiser mon mot de passe
              </a>
            </div>
            
            <p style="color: #666; line-height: 1.6; margin-bottom: 15px;">
              <strong>Important :</strong> Ce lien expire dans <strong>1 heure</strong> pour des raisons de sécurité.
            </p>
            
            <div style="background: #e3f2fd; border-left: 4px solid #2196f3; padding: 15px; margin: 20px 0; border-radius: 4px;">
              <p style="margin: 0; color: #1976d2; font-size: 14px;">
                <strong>⚠️ Sécurité :</strong> Si vous n'avez pas demandé cette réinitialisation, 
                ignorez simplement cet email. Votre mot de passe restera inchangé.
              </p>
            </div>
            
            <p style="color: #666; line-height: 1.6; margin-bottom: 10px;">
              Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :
            </p>
            <p style="word-break: break-all; color: #667eea; font-size: 12px; margin-bottom: 20px;">
              ${resetUrl}
            </p>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            
            <p style="color: #999; font-size: 12px; text-align: center; margin: 0;">
              Cet email a été envoyé automatiquement. Merci de ne pas y répondre.
            </p>
          </div>
        </div>
      `
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log('📧 Email de récupération envoyé:', info.messageId);
      return true;
    } catch (error) {
      console.error('❌ Erreur envoi email:', error);
      throw new Error('Impossible d\'envoyer l\'email de récupération');
    }
  }

  // Envoyer un email de vérification d'inscription
  async envoyerEmailVerificationInscription({ email, prenom, nom, token }) {
    // Réinitialiser le transporteur avec les variables d'environnement actuelles
    this.initialiserTransporter();
    
    // Déterminer l'URL frontend selon l'environnement
    const frontendUrl = this.getFrontendUrl();
    
    const mailOptions = {
      from: `"MoneyWise" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Vérifiez votre email - MoneyWise',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0; font-size: 28px;">MoneyWise</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Gestion de vos finances personnelles</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #333; margin-bottom: 20px;">Bonjour ${prenom} ${nom} !</h2>
            
            <div style="text-align: center; margin: 30px 0;">
              <div style="background: #ff9800; color: white; width: 80px; height: 80px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 32px;">
                ✉️
              </div>
            </div>
            
            <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
              Merci de vous être inscrit sur <strong>MoneyWise</strong> ! 
              Pour activer votre compte et commencer à gérer vos finances, 
              veuillez vérifier votre adresse email en cliquant sur le bouton ci-dessous.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${frontendUrl}/verify-email?token=${token}" 
                 style="background: linear-gradient(135deg,rgb(0, 255, 123) 0%,rgb(0, 234, 255) 100%); 
                        color: black; 
                        padding: 15px 30px; 
                        text-decoration: none; 
                        border-radius: 25px; 
                        display: inline-block; 
                        font-weight: bold;
                        box-shadow: 0 4px 15px rgba(255, 152, 0, 0.3);">
                Vérifier mon email
              </a>
            </div>
            
            <div style="background: #fff3e0; border-left: 4px solid #ff9800; padding: 15px; margin: 20px 0; border-radius: 4px;">
              <p style="margin: 0; color: #e65100; font-size: 14px;">
                <strong>⏰ Important :</strong> Ce lien expire dans <strong>24 heures</strong>.
              </p>
            </div>
            
            <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
              Si vous n'avez pas créé de compte sur MoneyWise, ignorez simplement cet email.
            </p>
            
            <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
              Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :
            </p>
            <p style="word-break: break-all; color: #ff9800; font-size: 12px; margin-bottom: 20px;">
              ${frontendUrl}/verify-email?token=${token}
            </p>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            
            <p style="color: #999; font-size: 12px; text-align: center; margin: 0;">
              Merci de nous faire confiance pour la gestion de vos finances personnelles.
            </p>
          </div>
        </div>
      `
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log('📧 Email de vérification d\'inscription envoyé:', info.messageId);
      return true;
    } catch (error) {
      console.error('❌ Erreur envoi email de vérification d\'inscription:', error);
      throw new Error('Impossible d\'envoyer l\'email de vérification d\'inscription');
    }
  }

  // Envoyer un email de confirmation de changement de mot de passe
  async envoyerEmailConfirmation(email, prenom) {
    // Réinitialiser le transporteur avec les variables d'environnement actuelles
    this.initialiserTransporter();
    const mailOptions = {
      from: `"MoneyWise" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Mot de passe modifié - MoneyWise',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #4caf50 0%, #45a049 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0; font-size: 28px;">MoneyWise</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Gestion de vos finances personnelles</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #333; margin-bottom: 20px;">Bonjour ${prenom},</h2>
            
            <div style="text-align: center; margin: 30px 0;">
              <div style="background: #4caf50; color: white; width: 60px; height: 60px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 24px;">
                ✓
              </div>
            </div>
            
            <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
              Votre mot de passe a été <strong>modifié avec succès</strong> sur votre compte MoneyWise.
            </p>
            
            <div style="background: #e8f5e8; border-left: 4px solid #4caf50; padding: 15px; margin: 20px 0; border-radius: 4px;">
              <p style="margin: 0; color: #2e7d32; font-size: 14px;">
                <strong>✅ Confirmation :</strong> Votre compte est maintenant sécurisé avec votre nouveau mot de passe.
              </p>
            </div>
            
            <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
              Si vous n'êtes pas à l'origine de cette modification, 
              <a href="${process.env.FRONTEND_URL}/contact" style="color: #667eea;">contactez-nous immédiatement</a>.
            </p>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            
            <p style="color: #999; font-size: 12px; text-align: center; margin: 0;">
              Cet email a été envoyé automatiquement. Merci de ne pas y répondre.
            </p>
          </div>
        </div>
      `
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log('📧 Email de confirmation envoyé:', info.messageId);
      return true;
    } catch (error) {
      console.error('❌ Erreur envoi email de confirmation:', error);
      // Ne pas faire échouer le processus si l'email de confirmation échoue
      return false;
    }
  }

  // Tester la connexion email
  async testerConnexion() {
    try {
      // Réinitialiser le transporteur avec les variables d'environnement actuelles
      this.initialiserTransporter();
      await this.transporter.verify();
      console.log('✅ Configuration email valide');
      return true;
    } catch (error) {
      console.error('❌ Erreur configuration email:', error);
      return false;
    }
  }

  // Helper to get the frontend URL based on environment
  getFrontendUrl() {
    // Si FRONTEND_URL est explicitement définie, l'utiliser
    if (process.env.FRONTEND_URL) {
      return process.env.FRONTEND_URL;
    }
    
    // Sinon, utiliser des valeurs par défaut selon l'environnement
    if (process.env.NODE_ENV === 'development') {
      // En développement, essayer plusieurs ports courants
      return 'http://localhost:5173'; // Vite par défaut
    }
    
    // En production, utiliser l'URL Vercel
    return 'https://moneywise.vercel.app';
  }

  // Nouvelle méthode pour envoyer les alertes par email
  async envoyerAlertesFinancieres(email, prenom, alertes) {
    this.initialiserTransporter();
    
    const mailOptions = {
      from: `"MoneyWise" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: '🚨 Alertes Financières - MoneyWise',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0; font-size: 28px;">🚨 Alertes MoneyWise</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Vos finances nécessitent votre attention</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #333; margin-bottom: 20px;">Bonjour ${prenom},</h2>
            
            <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
              Nous avons détecté des situations qui nécessitent votre attention dans vos finances :
            </p>
            
            ${alertes.map(alerte => `
              <div style="background: ${this.getAlerteColor(alerte.type)}; border-left: 4px solid ${this.getAlerteBorderColor(alerte.type)}; padding: 15px; margin: 15px 0; border-radius: 4px;">
                <p style="margin: 0; color: white; font-weight: bold;">
                  ${this.getAlerteIcon(alerte.type)} ${alerte.message}
                </p>
                <p style="margin: 5px 0 0 0; color: rgba(255,255,255,0.8); font-size: 12px;">
                  Sévérité: ${alerte.severite}
                </p>
              </div>
            `).join('')}
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${this.getFrontendUrl()}/dashboard" 
                 style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                        color: white; 
                        padding: 15px 30px; 
                        text-decoration: none; 
                        border-radius: 25px; 
                        display: inline-block; 
                        font-weight: bold;">
                Voir mon Dashboard
              </a>
            </div>
          </div>
        </div>
      `
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log('📧 Alertes financières envoyées:', info.messageId);
      return true;
    } catch (error) {
      console.error('❌ Erreur envoi alertes:', error);
      return false;
    }
  }

  // Méthodes helpers pour les couleurs d'alertes
  getAlerteColor(type) {
    const colors = {
      'danger': '#ff6b6b',
      'warning': '#ffa726',
      'info': '#42a5f5'
    };
    return colors[type] || '#42a5f5';
  }

  getAlerteBorderColor(type) {
    const colors = {
      'danger': '#d32f2f',
      'warning': '#f57c00',
      'info': '#1976d2'
    };
    return colors[type] || '#1976d2';
  }

  getAlerteIcon(type) {
    const icons = {
      'danger': '🚨',
      'warning': '⚠️',
      'info': 'ℹ️'
    };
    return icons[type] || 'ℹ️';
  }
}

module.exports = new EmailService();
