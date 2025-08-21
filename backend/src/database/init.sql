-- Script d'initialisation de la base de données MoneyWise
-- PostgreSQL

-- Table des utilisateurs
CREATE TABLE IF NOT EXISTS utilisateurs (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    mot_de_passe VARCHAR(255) NOT NULL,
    prenom VARCHAR(100) NOT NULL,
    nom VARCHAR(100) NOT NULL,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_modification TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des catégories
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    utilisateur_id INTEGER NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
    nom VARCHAR(100) NOT NULL,
    couleur VARCHAR(7) NOT NULL DEFAULT '#6B7280', -- Format hex color
    type VARCHAR(20) NOT NULL CHECK (type IN ('revenu', 'depense')),
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_modification TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(utilisateur_id, nom)
);

-- Table des transactions
CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    utilisateur_id INTEGER NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
    categorie_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    type VARCHAR(20) NOT NULL CHECK (type IN ('revenu', 'depense')),
    montant DECIMAL(10,2) NOT NULL CHECK (montant > 0),
    description TEXT,
    date_transaction DATE NOT NULL,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_modification TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- Trigger pour mettre à jour automatiquement date_modification
CREATE OR REPLACE FUNCTION mettre_a_jour_date_modification()
RETURNS TRIGGER AS $$
BEGIN
    NEW.date_modification = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_utilisateurs_date_modification
    BEFORE UPDATE ON utilisateurs
    FOR EACH ROW
    EXECUTE FUNCTION mettre_a_jour_date_modification();

CREATE TRIGGER trigger_categories_date_modification
    BEFORE UPDATE ON categories
    FOR EACH ROW
    EXECUTE FUNCTION mettre_a_jour_date_modification();

CREATE TRIGGER trigger_transactions_date_modification
    BEFORE UPDATE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION mettre_a_jour_date_modification();

-- Fonction pour obtenir le solde d'un utilisateur
CREATE OR REPLACE FUNCTION obtenir_solde_utilisateur(p_utilisateur_id INTEGER)
RETURNS DECIMAL(10,2) AS $$
DECLARE
    total_revenus DECIMAL(10,2) := 0;
    total_depenses DECIMAL(10,2) := 0;
BEGIN
    -- Calculer le total des revenus
    SELECT COALESCE(SUM(montant), 0) INTO total_revenus
    FROM transactions
    WHERE utilisateur_id = p_utilisateur_id AND type = 'revenu';
    
    -- Calculer le total des dépenses
    SELECT COALESCE(SUM(montant), 0) INTO total_depenses
    FROM transactions
    WHERE utilisateur_id = p_utilisateur_id AND type = 'depense';
    
    RETURN total_revenus - total_depenses;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour obtenir les statistiques mensuelles
CREATE OR REPLACE FUNCTION obtenir_statistiques_mensuelles(
    p_utilisateur_id INTEGER,
    p_annee INTEGER,
    p_mois INTEGER
)
RETURNS TABLE(
    total_revenus DECIMAL(10,2),
    total_depenses DECIMAL(10,2),
    solde DECIMAL(10,2),
    nombre_transactions INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(CASE WHEN type = 'revenu' THEN montant ELSE 0 END), 0) as total_revenus,
        COALESCE(SUM(CASE WHEN type = 'depense' THEN montant ELSE 0 END), 0) as total_depenses,
        COALESCE(SUM(CASE WHEN type = 'revenu' THEN montant ELSE -montant END), 0) as solde,
        COUNT(*) as nombre_transactions
    FROM transactions
    WHERE utilisateur_id = p_utilisateur_id
    AND EXTRACT(YEAR FROM date_transaction) = p_annee
    AND EXTRACT(MONTH FROM date_transaction) = p_mois;
END;
$$ LANGUAGE plpgsql;

-- Vue pour les transactions avec détails des catégories
CREATE OR REPLACE VIEW vue_transactions_completes AS
SELECT 
    t.id,
    t.utilisateur_id,
    t.categorie_id,
    c.nom as nom_categorie,
    c.couleur as couleur_categorie,
    t.type,
    t.montant,
    t.description,
    t.date_transaction,
    t.date_creation,
    t.date_modification
FROM transactions t
JOIN categories c ON t.categorie_id = c.id;

-- Vue pour les statistiques par catégorie
CREATE OR REPLACE VIEW vue_statistiques_categories AS
SELECT 
    t.utilisateur_id,
    c.id as categorie_id,
    c.nom as nom_categorie,
    c.couleur as couleur_categorie,
    c.type as type_categorie,
    COUNT(t.id) as nombre_transactions,
    SUM(t.montant) as montant_total,
    AVG(t.montant) as montant_moyen
FROM categories c
LEFT JOIN transactions t ON c.id = t.categorie_id
GROUP BY t.utilisateur_id, c.id, c.nom, c.couleur, c.type;

