const crypto = require('crypto');
const { query } = require('../config/database');

class EmailVerificationToken {
    constructor(donnees) {
        this.id = donnees.id;
        this.utilisateur_id = donnees.utilisateur_id;
        this.token = donnees.token;
        this.expires_at = donnees.expires_at;
        this.used = donnees.used;
        this.date_creation = donnees.date_creation;
    }

    static async creer(utilisateurId) {
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 heures
        
        const resultat = await query(
            'INSERT INTO email_verification_tokens (utilisateur_id, token, expires_at) VALUES ($1, $2, $3) RETURNING *',
            [utilisateurId, token, expiresAt]
        );
        
        return new EmailVerificationToken(resultat.rows[0]);
    }

    static async trouverParToken(token) {
        const resultat = await query(
            'SELECT * FROM email_verification_tokens WHERE token = $1 AND used = FALSE AND expires_at > NOW()',
            [token]
        );
        return resultat.rows[0] ? new EmailVerificationToken(resultat.rows[0]) : null;
    }

    async marquerCommeUtilise() {
        const resultat = await query(
            'UPDATE email_verification_tokens SET used = TRUE WHERE id = $1 RETURNING *',
            [this.id]
        );
        
        Object.assign(this, resultat.rows[0]);
        return this;
    }

    static async nettoyerTokensExpires() {
        await query(
            'DELETE FROM email_verification_tokens WHERE expires_at < NOW() OR used = TRUE'
        );
    }

    static async supprimerTokensUtilisateur(utilisateurId) {
        await query(
            'DELETE FROM email_verification_tokens WHERE utilisateur_id = $1',
            [utilisateurId]
        );
    }
}

module.exports = EmailVerificationToken;

