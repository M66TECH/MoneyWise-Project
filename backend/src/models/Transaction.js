const { query } = require('../config/database');

class Transaction {
    constructor(donnees) {
        this.id = donnees.id;
        this.utilisateur_id = donnees.utilisateur_id;
        this.categorie_id = donnees.categorie_id;
        this.type = donnees.type;
        this.montant = donnees.montant;
        this.description = donnees.description;
        this.date_transaction = donnees.date_transaction;
        this.date_creation = donnees.date_creation;
        this.date_modification = donnees.date_modification;
    }

    static async creer(donneesTransaction) {
        const { utilisateur_id, categorie_id, type, montant, description, date_transaction } = donneesTransaction;
        
        const resultat = await query(
            'INSERT INTO transactions (utilisateur_id, categorie_id, type, montant, description, date_transaction) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [utilisateur_id, categorie_id, type, montant, description, date_transaction]
        );
        
        return new Transaction(resultat.rows[0]);
    }

    static async trouverParId(id, utilisateur_id) {
        const resultat = await query(
            'SELECT * FROM transactions WHERE id = $1 AND utilisateur_id = $2',
            [id, utilisateur_id]
        );
        
        return resultat.rows[0] ? new Transaction(resultat.rows[0]) : null;
    }

    static async trouverParUtilisateur(utilisateur_id, options = {}) {
        const { page = 1, limit = 20, type, categorie_id, startDate, endDate } = options;
        const offset = (page - 1) * limit;
        
        let sql = 'SELECT * FROM transactions WHERE utilisateur_id = $1';
        let params = [utilisateur_id];
        let indexParam = 2;
        
        if (type) {
            sql += ` AND type = $${indexParam}`;
            params.push(type);
            indexParam++;
        }
        
        if (categorie_id) {
            sql += ` AND categorie_id = $${indexParam}`;
            params.push(categorie_id);
            indexParam++;
        }
        
        if (startDate) {
            sql += ` AND date_transaction >= $${indexParam}`;
            params.push(startDate);
            indexParam++;
        }
        
        if (endDate) {
            sql += ` AND date_transaction <= $${indexParam}`;
            params.push(endDate);
            indexParam++;
        }
        
        sql += ` ORDER BY date_transaction DESC LIMIT $${indexParam} OFFSET $${indexParam + 1}`;
        params.push(limit, offset);
        
        const resultat = await query(sql, params);
        return resultat.rows.map(ligne => new Transaction(ligne));
    }

    async mettreAJour(donneesTransaction) {
        const { categorie_id, type, montant, description, date_transaction } = donneesTransaction;
        
        const resultat = await query(
            'UPDATE transactions SET categorie_id = $1, type = $2, montant = $3, description = $4, date_transaction = $5, date_modification = CURRENT_TIMESTAMP WHERE id = $6 RETURNING *',
            [categorie_id, type, montant, description, date_transaction, this.id]
        );
        
        Object.assign(this, resultat.rows[0]);
        return this;
    }

    async supprimer() {
        await query('DELETE FROM transactions WHERE id = $1', [this.id]);
        return true;
    }

    static async obtenirSolde(utilisateur_id) {
        const resultat = await query(
            'SELECT obtenir_solde_utilisateur($1) as solde',
            [utilisateur_id]
        );
        
        return parseFloat(resultat.rows[0].solde);
    }

    static async obtenirStatistiquesMensuelles(utilisateur_id, annee, mois) {
        try {
            const resultat = await query(
                'SELECT obtenir_statistiques_mensuelles($1, $2, $3)',
                [utilisateur_id, annee, mois]
            );
            
            if (!resultat.rows[0] || !resultat.rows[0].obtenir_statistiques_mensuelles) {
                return {
                    total_revenus: 0,
                    total_depenses: 0,
                    solde: 0,
                    nombre_transactions: 0
                };
            }
            
            return resultat.rows[0].obtenir_statistiques_mensuelles;
        } catch (error) {
            console.error('Erreur obtenirStatistiquesMensuelles:', error);
            throw new Error('Erreur lors de la récupération des statistiques mensuelles');
        }
    }

    static async obtenirDepensesParCategorie(utilisateur_id, dateDebut, dateFin) {
        try {
            const resultat = await query(`
                SELECT 
                    c.nom as nom_categorie,
                    SUM(t.montant) as montant_total,
                    COUNT(*) as nombre_transactions
                FROM transactions t
                JOIN categories c ON t.categorie_id = c.id
                WHERE t.utilisateur_id = $1 
                    AND t.type = 'depense'
                    AND t.date_transaction >= $2
                    AND t.date_transaction <= $3
                GROUP BY c.id, c.nom
                ORDER BY montant_total DESC
            `, [utilisateur_id, dateDebut, dateFin]);
            
            return resultat.rows || [];
        } catch (error) {
            console.error('Erreur obtenirDepensesParCategorie:', error);
            throw new Error('Erreur lors de la récupération des dépenses par catégorie');
        }
    }

    static async obtenirRevenusParCategorie(utilisateur_id, dateDebut, dateFin) {
        try {
            const resultat = await query(`
                SELECT 
                    c.nom as nom_categorie,
                    SUM(t.montant) as montant_total,
                    COUNT(*) as nombre_transactions
                FROM transactions t
                JOIN categories c ON t.categorie_id = c.id
                WHERE t.utilisateur_id = $1 
                    AND t.type = 'revenu'
                    AND t.date_transaction >= $2
                    AND t.date_transaction <= $3
                GROUP BY c.id, c.nom
                ORDER BY montant_total DESC
            `, [utilisateur_id, dateDebut, dateFin]);
            
            return resultat.rows || [];
        } catch (error) {
            console.error('Erreur obtenirRevenusParCategorie:', error);
            throw new Error('Erreur lors de la récupération des revenus par catégorie');
        }
    }

    static async obtenirEvolutionMensuelle(utilisateur_id, annee) {
        try {
            const resultat = await query(`
                SELECT 
                    EXTRACT(MONTH FROM date_transaction) as mois,
                    type,
                    SUM(montant) as montant_total,
                    COUNT(*) as nombre_transactions
                FROM transactions
                WHERE utilisateur_id = $1 
                    AND EXTRACT(YEAR FROM date_transaction) = $2
                GROUP BY EXTRACT(MONTH FROM date_transaction), type
                ORDER BY mois, type
            `, [utilisateur_id, annee]);
            
            return resultat.rows || [];
        } catch (error) {
            console.error('Erreur obtenirEvolutionMensuelle:', error);
            throw new Error('Erreur lors de la récupération de l\'évolution mensuelle');
        }
    }

    static async obtenirResume(utilisateur_id) {
        const resultat = await query(`
            SELECT 
                COUNT(*) as nombre_total_transactions,
                COUNT(CASE WHEN type = 'revenu' THEN 1 END) as nombre_revenus,
                COUNT(CASE WHEN type = 'depense' THEN 1 END) as nombre_depenses,
                SUM(CASE WHEN type = 'revenu' THEN montant ELSE 0 END) as total_revenus,
                SUM(CASE WHEN type = 'depense' THEN montant ELSE 0 END) as total_depenses,
                AVG(montant) as montant_moyen
            FROM transactions
            WHERE utilisateur_id = $1
        `, [utilisateur_id]);
        
        const resume = resultat.rows[0];
        resume.solde = parseFloat(resume.total_revenus || 0) - parseFloat(resume.total_depenses || 0);
        
        return resume;
    }

    static async obtenirTotalRevenus(utilisateur_id) {
        const resultat = await query(`
            SELECT COALESCE(SUM(montant), 0) as total_revenus
            FROM transactions
            WHERE utilisateur_id = $1 AND type = 'revenu'
        `, [utilisateur_id]);
        
        return parseFloat(resultat.rows[0].total_revenus);
    }

    static async obtenirTotalDepenses(utilisateur_id) {
        const resultat = await query(`
            SELECT COALESCE(SUM(montant), 0) as total_depenses
            FROM transactions
            WHERE utilisateur_id = $1 AND type = 'depense'
        `, [utilisateur_id]);
        
        return parseFloat(resultat.rows[0].total_depenses);
    }

    static async obtenirTransactionsAvecCategories(utilisateur_id, options = {}) {
        const { page = 1, limit = 20, type, categorie_id, startDate, endDate } = options;
        const offset = (page - 1) * limit;
        
        let sql = `
            SELECT 
                t.*,
                c.nom as nom_categorie,
                c.couleur as couleur_categorie
            FROM transactions t
            JOIN categories c ON t.categorie_id = c.id
            WHERE t.utilisateur_id = $1
        `;
        let params = [utilisateur_id];
        let indexParam = 2;
        
        if (type) {
            sql += ` AND t.type = $${indexParam}`;
            params.push(type);
            indexParam++;
        }
        
        if (categorie_id) {
            sql += ` AND t.categorie_id = $${indexParam}`;
            params.push(categorie_id);
            indexParam++;
        }
        
        if (startDate) {
            sql += ` AND t.date_transaction >= $${indexParam}`;
            params.push(startDate);
            indexParam++;
        }
        
        if (endDate) {
            sql += ` AND t.date_transaction <= $${indexParam}`;
            params.push(endDate);
            indexParam++;
        }
        
        sql += ` ORDER BY t.date_transaction DESC LIMIT $${indexParam} OFFSET $${indexParam + 1}`;
        params.push(limit, offset);
        
        const resultat = await query(sql, params);
        return resultat.rows.map(ligne => new Transaction(ligne));
    }
}

module.exports = Transaction;
