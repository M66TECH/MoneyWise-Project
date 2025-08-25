const { query } = require('../config/database');

class Categorie {
    constructor(donnees) {
        this.id = donnees.id;
        this.utilisateur_id = donnees.utilisateur_id;
        this.nom = donnees.nom;
        this.couleur = donnees.couleur;
        this.type = donnees.type;
        this.date_creation = donnees.date_creation;
        this.date_modification = donnees.date_modification;
    }

    static async creer(donneesCategorie) {
        const { utilisateur_id, nom, couleur, type } = donneesCategorie;
        
        const resultat = await query(
            'INSERT INTO categories (utilisateur_id, nom, couleur, type) VALUES ($1, $2, $3, $4) RETURNING *',
            [utilisateur_id, nom, couleur, type]
        );
        
        return new Categorie(resultat.rows[0]);
    }

    static async trouverParId(id) {
        const resultat = await query('SELECT * FROM categories WHERE id = $1', [id]);
        return resultat.rows[0] ? new Categorie(resultat.rows[0]) : null;
    }

    static async trouverParUtilisateur(utilisateur_id) {
        const resultat = await query(
            'SELECT * FROM categories WHERE utilisateur_id = $1 ORDER BY nom',
            [utilisateur_id]
        );
        
        return resultat.rows.map(ligne => new Categorie(ligne));
    }

    static async trouverParUtilisateurEtType(utilisateur_id, type) {
        const resultat = await query(
            'SELECT * FROM categories WHERE utilisateur_id = $1 AND type = $2 ORDER BY nom',
            [utilisateur_id, type]
        );
        
        return resultat.rows.map(ligne => new Categorie(ligne));
    }

    async mettreAJour(donneesCategorie) {
        const { nom, couleur, type } = donneesCategorie;
        
        const resultat = await query(
            'UPDATE categories SET nom = $1, couleur = $2, type = $3, date_modification = CURRENT_TIMESTAMP WHERE id = $4 RETURNING *',
            [nom, couleur, type, this.id]
        );
        
        Object.assign(this, resultat.rows[0]);
        return this;
    }

    async supprimer() {
        // Vérifier s'il y a des transactions liées
        const resultatTransactions = await query(
            'SELECT COUNT(*) as nombre FROM transactions WHERE categorie_id = $1',
            [this.id]
        );
        
        if (parseInt(resultatTransactions.rows[0].nombre) > 0) {
            throw new Error('Impossible de supprimer une catégorie qui contient des transactions');
        }
        
        await query('DELETE FROM categories WHERE id = $1', [this.id]);
        return true;
    }

    static async creerCategoriesParDefaut(utilisateur_id) {
        const categoriesParDefaut = [
            // Revenus
            { nom: 'Salaire', couleur: '#10B981', type: 'revenu' },
            { nom: 'Freelance', couleur: '#3B82F6', type: 'revenu' },
            { nom: 'Investissements', couleur: '#8B5CF6', type: 'revenu' },
            { nom: 'Autres revenus', couleur: '#6B7280', type: 'revenu' },
            
            // Dépenses
            { nom: 'Loyer', couleur: '#EF4444', type: 'depense' },
            { nom: 'Alimentation', couleur: '#F59E0B', type: 'depense' },
            { nom: 'Transport', couleur: '#06B6D4', type: 'depense' },
            { nom: 'Loisirs', couleur: '#EC4899', type: 'depense' },
            { nom: 'Santé', couleur: '#84CC16', type: 'depense' },
            { nom: 'Shopping', couleur: '#F97316', type: 'depense' },
            { nom: 'Factures', couleur: '#6366F1', type: 'depense' },
            { nom: 'Autres dépenses', couleur: '#6B7280', type: 'depense' },
            
            // Catégories hybrides (peuvent contenir revenus ET dépenses)
            { nom: 'Business', couleur: '#059669', type: 'hybride' },
            { nom: 'Projets', couleur: '#7C3AED', type: 'hybride' },
            { nom: 'Événements', couleur: '#DC2626', type: 'hybride' }
        ];

        const categoriesCreees = [];
        
        for (const categorie of categoriesParDefaut) {
            try {
                const nouvelleCategorie = await Categorie.creer({
                    utilisateur_id,
                    nom: categorie.nom,
                    couleur: categorie.couleur,
                    type: categorie.type
                });
                categoriesCreees.push(nouvelleCategorie);
            } catch (erreur) {
                // Ignorer les erreurs de doublon
                if (!erreur.message.includes('duplicate key')) {
                    throw erreur;
                }
            }
        }
        
        return categoriesCreees;
    }

    static async obtenirStatistiques(utilisateur_id) {
        const resultat = await query(`
            SELECT 
         c.id,
                c.nom,
                c.couleur,
         c.type,
                COUNT(t.id) as nombre_transactions,
                COALESCE(SUM(t.montant), 0) as montant_total,
                COALESCE(AVG(t.montant), 0) as montant_moyen
       FROM categories c
            LEFT JOIN transactions t ON c.id = t.categorie_id
            WHERE c.utilisateur_id = $1
            GROUP BY c.id, c.nom, c.couleur, c.type
            ORDER BY montant_total DESC
        `, [utilisateur_id]);
        
        return resultat.rows;
    }

    static async reinitialiserParDefaut(utilisateur_id) {
        // Supprimer toutes les catégories existantes (sauf celles avec des transactions)
        await query(`
            DELETE FROM categories 
            WHERE utilisateur_id = $1 
            AND id NOT IN (
                SELECT DISTINCT categorie_id 
                FROM transactions 
                WHERE utilisateur_id = $1
            )
        `, [utilisateur_id]);
        
        // Créer les nouvelles catégories par défaut
        return await Categorie.creerCategoriesParDefaut(utilisateur_id);
    }
}

module.exports = Categorie;
