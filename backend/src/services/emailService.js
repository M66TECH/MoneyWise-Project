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
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    
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
}

module.exports = new EmailService();
