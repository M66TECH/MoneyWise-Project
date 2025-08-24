const bcrypt = require('bcrypt');
const { query } = require('../config/database');

class Utilisateur {
    constructor(donnees) {
        this.id = donnees.id;
        this.email = donnees.email;
        this.mot_de_passe = donnees.mot_de_passe;
        this.prenom = donnees.prenom;
        this.nom = donnees.nom;
        this.email_verifie = donnees.email_verifie || false;
        this.token_verification = donnees.token_verification;
        this.date_creation = donnees.date_creation;
        this.date_modification = donnees.date_modification;
    }

    static async creer(donneesUtilisateur) {
        const { email, mot_de_passe, prenom, nom } = donneesUtilisateur;
        const mot_de_passe_hash = await bcrypt.hash(mot_de_passe, 12);
        
        const resultat = await query(
            'INSERT INTO utilisateurs (email, mot_de_passe, prenom, nom, email_verifie) VALUES ($1, $2, $3, $4, FALSE) RETURNING *',
            [email, mot_de_passe_hash, prenom, nom]
        );
        
        return new Utilisateur(resultat.rows[0]);
    }

    static async trouverParEmail(email) {
        const resultat = await query('SELECT * FROM utilisateurs WHERE email = $1', [email]);
        return resultat.rows[0] ? new Utilisateur(resultat.rows[0]) : null;
    }

    static async trouverParId(id) {
        const resultat = await query('SELECT * FROM utilisateurs WHERE id = $1', [id]);
        return resultat.rows[0] ? new Utilisateur(resultat.rows[0]) : null;
    }

    async mettreAJourProfil(donneesProfil) {
        const { prenom, nom } = donneesProfil;
        const resultat = await query(
            'UPDATE utilisateurs SET prenom = $1, nom = $2, date_modification = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *',
            [prenom, nom, this.id]
        );
        
        Object.assign(this, resultat.rows[0]);
        return this;
    }

    async changerMotDePasse(nouveau_mot_de_passe) {
        const mot_de_passe_hash = await bcrypt.hash(nouveau_mot_de_passe, 12);
        const resultat = await query(
            'UPDATE utilisateurs SET mot_de_passe = $1, date_modification = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
            [mot_de_passe_hash, this.id]
        );
        
        Object.assign(this, resultat.rows[0]);
        return this;
    }

    async comparerMotDePasse(mot_de_passe) {
        return await bcrypt.compare(mot_de_passe, this.mot_de_passe);
    }

    async verifierEmail() {
        const resultat = await query(
            'UPDATE utilisateurs SET email_verifie = TRUE, token_verification = NULL WHERE id = $1 RETURNING *',
            [this.id]
        );
        
        Object.assign(this, resultat.rows[0]);
        return this;
    }

    static async trouverParEmailNonVerifie(email) {
        const resultat = await query('SELECT * FROM utilisateurs WHERE email = $1 AND email_verifie = FALSE', [email]);
        return resultat.rows[0] ? new Utilisateur(resultat.rows[0]) : null;
    }

    toJSON() {
        const { mot_de_passe, ...utilisateurSansMotDePasse } = this;
        return utilisateurSansMotDePasse;
    }
}

module.exports = Utilisateur;
