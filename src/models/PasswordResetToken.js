const { query } = require('../config/database');

class PasswordResetToken {
  constructor(donnees) {
    this.id = donnees.id;
    this.utilisateur_id = donnees.utilisateur_id;
    this.token = donnees.token;
    this.expires_at = donnees.expires_at;
    this.used = donnees.used;
    this.date_creation = donnees.date_creation;
  }

  // Créer un nouveau token de réinitialisation
  static async creer(utilisateur_id, token, expires_at) {
    const resultat = await query(
      'INSERT INTO password_reset_tokens (utilisateur_id, token, expires_at) VALUES ($1, $2, $3) RETURNING *',
      [utilisateur_id, token, expires_at]
    );
    
    return new PasswordResetToken(resultat.rows[0]);
  }

  // Trouver un token par sa valeur
  static async trouverParToken(token) {
    const resultat = await query(
      'SELECT * FROM password_reset_tokens WHERE token = $1 AND used = FALSE AND expires_at > CURRENT_TIMESTAMP',
      [token]
    );
    
    if (resultat.rows.length === 0) {
      return null;
    }
    
    return new PasswordResetToken(resultat.rows[0]);
  }

  // Marquer un token comme utilisé
  async marquerCommeUtilise() {
    const resultat = await query(
      'UPDATE password_reset_tokens SET used = TRUE WHERE id = $1 RETURNING *',
      [this.id]
    );
    
    this.used = resultat.rows[0].used;
    return this;
  }

  // Supprimer les tokens expirés
  static async supprimerTokensExpires() {
    const resultat = await query(
      'DELETE FROM password_reset_tokens WHERE expires_at < CURRENT_TIMESTAMP OR used = TRUE RETURNING *'
    );
    
    return resultat.rows.length;
  }

  // Supprimer tous les tokens d'un utilisateur
  static async supprimerTokensUtilisateur(utilisateur_id) {
    const resultat = await query(
      'DELETE FROM password_reset_tokens WHERE utilisateur_id = $1 RETURNING *',
      [utilisateur_id]
    );
    
    return resultat.rows.length;
  }

  // Compter les tentatives de réinitialisation d'un utilisateur (dernières 24h)
  static async compterTentativesUtilisateur(utilisateur_id) {
    const resultat = await query(
      'SELECT COUNT(*) as nombre FROM password_reset_tokens WHERE utilisateur_id = $1 AND date_creation > CURRENT_TIMESTAMP - INTERVAL \'24 hours\'',
      [utilisateur_id]
    );
    
    return parseInt(resultat.rows[0].nombre);
  }

  // Nettoyer les anciens tokens (maintenance)
  static async nettoyerTokensAnciens() {
    const resultat = await query(
      'DELETE FROM password_reset_tokens WHERE date_creation < CURRENT_TIMESTAMP - INTERVAL \'7 days\' RETURNING *'
    );
    
    return resultat.rows.length;
  }
}

module.exports = PasswordResetToken;
