# API MoneyWise - Documentation Frontend

## 🔗 Configuration

```javascript
const API_BASE_URL = 'http://localhost:3000/api';
const API_CONFIG = {
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}` // Pour les routes protégées
  }
};
```

## 🔐 Authentification

### Inscription
```javascript
POST /auth/register
{
  "email": "user@example.com",
  "password": "password123",
  "firstName": "Jean",
  "lastName": "Dupont"
}

// Réponse
{
  "message": "Utilisateur créé avec succès",
  "utilisateur": { id, email, prenom, nom, date_creation },
  "token": "jwt_token_here"
}
```

### Connexion
```javascript
POST /auth/login
{
  "email": "user@example.com",
  "password": "password123"
}

// Réponse
{
  "message": "Connexion réussie",
  "utilisateur": { id, email, prenom, nom, date_creation },
  "token": "jwt_token_here"
}
```

## 📊 Transactions

### Types
- `"revenu"` - Revenus/entrées d'argent
- `"depense"` - Dépenses/sorties d'argent

### CRUD Transactions
```javascript
// Lister les transactions
GET /transactions?page=1&limit=20&type=depense&categoryId=1&startDate=2024-01-01&endDate=2024-12-31

// Créer une transaction
POST /transactions
{
  "type": "depense",
  "amount": 50.00,
  "categoryId": 1,
  "description": "Courses alimentaires",
  "date": "2024-01-15"
}

// Modifier une transaction
PUT /transactions/:id
{
  "type": "depense",
  "amount": 45.00,
  "categoryId": 1,
  "description": "Courses alimentaires",
  "date": "2024-01-15"
}

// Supprimer une transaction
DELETE /transactions/:id
```

### Statistiques
```javascript
// Solde actuel
GET /transactions/balance/summary
// Réponse: { "solde": 1250.50 }

// Statistiques mensuelles
GET /transactions/stats/monthly/2024/1
// Réponse: { "annee": 2024, "mois": 1, "statistiques": { total_revenus, total_depenses, solde, nombre_transactions } }

// Dépenses par catégorie
GET /transactions/stats/by-category?startDate=2024-01-01&endDate=2024-12-31
// Réponse: { "depenses_par_categorie": [{ categorie_id, nom_categorie, couleur_categorie, nombre_transactions, montant_total }] }

// Évolution mensuelle
GET /transactions/stats/trend/2024
// Réponse: { "annee": 2024, "evolution_mensuelle": [{ mois, type, montant_total, nombre_transactions }] }
```

## 🏷️ Catégories

### CRUD Catégories
```javascript
// Lister les catégories
GET /categories?type=depense

// Créer une catégorie
POST /categories
{
  "name": "Restaurant",
  "color": "#FF6B6B",
  "type": "depense"
}

// Modifier une catégorie
PUT /categories/:id
{
  "name": "Restaurant",
  "color": "#FF6B6B",
  "type": "depense"
}

// Supprimer une catégorie
DELETE /categories/:id

// Statistiques des catégories
GET /categories/stats/summary

// Réinitialiser aux catégories par défaut
POST /categories/reset-defaults
```

## 📋 Modèles TypeScript

```typescript
interface Utilisateur {
  id: number;
  email: string;
  prenom: string;
  nom: string;
  date_creation: string;
  date_modification: string;
}

interface Transaction {
  id: number;
  utilisateur_id: number;
  categorie_id: number;
  type: 'revenu' | 'depense';
  montant: number;
  description?: string;
  date_transaction: string;
  date_creation: string;
  date_modification: string;
  nom_categorie?: string;
  couleur_categorie?: string;
}

interface Categorie {
  id: number;
  utilisateur_id: number;
  nom: string;
  couleur: string;
  type: 'revenu' | 'depense';
  date_creation: string;
  date_modification: string;
}

interface Solde {
  solde: number;
}

interface StatistiquesMensuelles {
  total_revenus: number;
  total_depenses: number;
  solde: number;
  nombre_transactions: number;
}

interface DepenseParCategorie {
  categorie_id: number;
  nom_categorie: string;
  couleur_categorie: string;
  nombre_transactions: number;
  montant_total: number;
}
```

## ⚠️ Codes d'erreur

| Code | Signification | Action recommandée |
|------|---------------|-------------------|
| `400` | Données invalides | Vérifier les champs requis |
| `401` | Non authentifié | Rediriger vers login |
| `404` | Ressource non trouvée | Afficher message d'erreur |
| `409` | Conflit (doublon) | Demander confirmation |
| `500` | Erreur serveur | Afficher message générique |

## 🧪 Test rapide

```bash
# Démarrer l'API
npm run dev

# Tester l'API
npm run test:api
```

## 📁 Ressources

- [README complet](./README.md)
- [Collection Postman](./MoneyWise_Postman_Collection1.json)
