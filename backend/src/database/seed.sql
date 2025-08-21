-- Script d'insertion de données de test pour MoneyWise
-- À exécuter après l'initialisation de la base de données

-- Insérer un utilisateur de test
INSERT INTO utilisateurs (email, mot_de_passe, prenom, nom) VALUES 
('demo@moneywise.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HS.iK8O', 'Demo', 'Utilisateur')
ON CONFLICT (email) DO NOTHING;

-- Récupérer l'ID de l'utilisateur de test
DO $$
DECLARE
    demo_utilisateur_id INTEGER;
BEGIN
    SELECT id INTO demo_utilisateur_id FROM utilisateurs WHERE email = 'demo@moneywise.com';
    
    IF demo_utilisateur_id IS NOT NULL THEN
        -- Insérer des catégories personnalisées pour l'utilisateur de test
        INSERT INTO categories (utilisateur_id, nom, couleur, type) VALUES
        -- Catégories de revenus
        (demo_utilisateur_id, 'Salaire', '#10B981', 'revenu'),
        (demo_utilisateur_id, 'Freelance', '#3B82F6', 'revenu'),
        (demo_utilisateur_id, 'Investissements', '#8B5CF6', 'revenu'),
        (demo_utilisateur_id, 'Autres revenus', '#6B7280', 'revenu'),
        
        -- Catégories de dépenses
        (demo_utilisateur_id, 'Loyer', '#EF4444', 'depense'),
        (demo_utilisateur_id, 'Alimentation', '#F59E0B', 'depense'),
        (demo_utilisateur_id, 'Transport', '#06B6D4', 'depense'),
        (demo_utilisateur_id, 'Loisirs', '#EC4899', 'depense'),
        (demo_utilisateur_id, 'Santé', '#84CC16', 'depense'),
        (demo_utilisateur_id, 'Shopping', '#F97316', 'depense'),
        (demo_utilisateur_id, 'Factures', '#6366F1', 'depense'),
        (demo_utilisateur_id, 'Autres dépenses', '#6B7280', 'depense')
        ON CONFLICT (utilisateur_id, nom) DO NOTHING;
        
        -- Insérer des transactions de test pour les 3 derniers mois
        -- Janvier 2024
        INSERT INTO transactions (utilisateur_id, categorie_id, type, montant, description, date_transaction) VALUES
        (demo_utilisateur_id, (SELECT id FROM categories WHERE utilisateur_id = demo_utilisateur_id AND nom = 'Salaire'), 'revenu', 3500.00, 'Salaire mensuel', '2024-01-15'),
        (demo_utilisateur_id, (SELECT id FROM categories WHERE utilisateur_id = demo_utilisateur_id AND nom = 'Loyer'), 'depense', 1200.00, 'Loyer mensuel', '2024-01-05'),
        (demo_utilisateur_id, (SELECT id FROM categories WHERE utilisateur_id = demo_utilisateur_id AND nom = 'Alimentation'), 'depense', 450.00, 'Courses alimentaires', '2024-01-10'),
        (demo_utilisateur_id, (SELECT id FROM categories WHERE utilisateur_id = demo_utilisateur_id AND nom = 'Transport'), 'depense', 120.00, 'Pass transport', '2024-01-01'),
        (demo_utilisateur_id, (SELECT id FROM categories WHERE utilisateur_id = demo_utilisateur_id AND nom = 'Loisirs'), 'depense', 200.00, 'Sortie restaurant', '2024-01-20'),
        (demo_utilisateur_id, (SELECT id FROM categories WHERE utilisateur_id = demo_utilisateur_id AND nom = 'Freelance'), 'revenu', 800.00, 'Projet web freelance', '2024-01-25');
        
        -- Février 2024
        INSERT INTO transactions (utilisateur_id, categorie_id, type, montant, description, date_transaction) VALUES
        (demo_utilisateur_id, (SELECT id FROM categories WHERE utilisateur_id = demo_utilisateur_id AND nom = 'Salaire'), 'revenu', 3500.00, 'Salaire mensuel', '2024-02-15'),
        (demo_utilisateur_id, (SELECT id FROM categories WHERE utilisateur_id = demo_utilisateur_id AND nom = 'Loyer'), 'depense', 1200.00, 'Loyer mensuel', '2024-02-05'),
        (demo_utilisateur_id, (SELECT id FROM categories WHERE utilisateur_id = demo_utilisateur_id AND nom = 'Alimentation'), 'depense', 380.00, 'Courses alimentaires', '2024-02-12'),
        (demo_utilisateur_id, (SELECT id FROM categories WHERE utilisateur_id = demo_utilisateur_id AND nom = 'Shopping'), 'depense', 150.00, 'Nouveaux vêtements', '2024-02-18'),
        (demo_utilisateur_id, (SELECT id FROM categories WHERE utilisateur_id = demo_utilisateur_id AND nom = 'Santé'), 'depense', 80.00, 'Consultation médicale', '2024-02-22'),
        (demo_utilisateur_id, (SELECT id FROM categories WHERE utilisateur_id = demo_utilisateur_id AND nom = 'Investissements'), 'revenu', 120.00, 'Dividendes', '2024-02-28');
        
        -- Mars 2024
        INSERT INTO transactions (utilisateur_id, categorie_id, type, montant, description, date_transaction) VALUES
        (demo_utilisateur_id, (SELECT id FROM categories WHERE utilisateur_id = demo_utilisateur_id AND nom = 'Salaire'), 'revenu', 3500.00, 'Salaire mensuel', '2024-03-15'),
        (demo_utilisateur_id, (SELECT id FROM categories WHERE utilisateur_id = demo_utilisateur_id AND nom = 'Loyer'), 'depense', 1200.00, 'Loyer mensuel', '2024-03-05'),
        (demo_utilisateur_id, (SELECT id FROM categories WHERE utilisateur_id = demo_utilisateur_id AND nom = 'Alimentation'), 'depense', 520.00, 'Courses alimentaires', '2024-03-08'),
        (demo_utilisateur_id, (SELECT id FROM categories WHERE utilisateur_id = demo_utilisateur_id AND nom = 'Transport'), 'depense', 120.00, 'Pass transport', '2024-03-01'),
        (demo_utilisateur_id, (SELECT id FROM categories WHERE utilisateur_id = demo_utilisateur_id AND nom = 'Factures'), 'depense', 180.00, 'Électricité + Internet', '2024-03-10'),
        (demo_utilisateur_id, (SELECT id FROM categories WHERE utilisateur_id = demo_utilisateur_id AND nom = 'Loisirs'), 'depense', 300.00, 'Week-end en montagne', '2024-03-25'),
        (demo_utilisateur_id, (SELECT id FROM categories WHERE utilisateur_id = demo_utilisateur_id AND nom = 'Freelance'), 'revenu', 1200.00, 'Projet mobile freelance', '2024-03-30');
        
        RAISE NOTICE 'Données de test insérées pour l''utilisateur ID: %', demo_utilisateur_id;
    ELSE
        RAISE NOTICE 'Utilisateur de test non trouvé';
    END IF;
END $$;

-- Afficher un résumé des données insérées
SELECT 
    'Utilisateurs' as table_name,
    COUNT(*) as count
FROM utilisateurs
UNION ALL
SELECT 
    'Catégories' as table_name,
    COUNT(*) as count
FROM categories
UNION ALL
SELECT 
    'Transactions' as table_name,
    COUNT(*) as count
FROM transactions;

-- Afficher le solde de l'utilisateur de test
SELECT 
    u.prenom,
    u.nom,
    u.email,
    COALESCE(SUM(CASE WHEN t.type = 'revenu' THEN t.montant ELSE 0 END), 0) as total_revenus,
    COALESCE(SUM(CASE WHEN t.type = 'depense' THEN t.montant ELSE 0 END), 0) as total_depenses,
    COALESCE(SUM(CASE WHEN t.type = 'revenu' THEN t.montant ELSE -t.montant END), 0) as solde
FROM utilisateurs u
LEFT JOIN transactions t ON u.id = t.utilisateur_id
WHERE u.email = 'demo@moneywise.com'
GROUP BY u.id, u.prenom, u.nom, u.email;
