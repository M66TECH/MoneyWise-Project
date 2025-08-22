# MoneyWise Backend API

Backend Node.js/Express pour l'application MoneyWise - Gestion des finances personnelles.

## 🚀 Fonctionnalités

- **Authentification sécurisée** avec JWT
- **Gestion des transactions** (revenus et dépenses)
- **Catégories personnalisables** pour organiser les transactions
- **Tableau de bord** avec statistiques et graphiques
- **Export de données** en CSV et JSON
- **Rapports mensuels et annuels**
- **Système d'alertes** pour le suivi budgétaire

## 📋 Prérequis

- Node.js >= 16.0.0
- PostgreSQL >= 12.0
- npm ou yarn

## 📚 Documentation API

L'API MoneyWise inclut une documentation interactive générée avec Swagger/OpenAPI.

### Accès à la documentation :
- **Local** : http://localhost:3000/api-docs
- **Production** : https://moneywise-backend-187q.onrender.com/api-docs

### Fonctionnalités de la documentation :
- ✅ **Interface interactive** - Testez les API directement depuis la documentation
- ✅ **Authentification intégrée** - Utilisez le bouton "Authorize" pour ajouter votre token JWT
- ✅ **Exemples de requêtes** - Tous les endpoints incluent des exemples
- ✅ **Schémas de données** - Documentation complète des modèles de données
- ✅ **Codes de réponse** - Tous les codes HTTP possibles sont documentés

### Comment utiliser la documentation :
1. Ouvrez l'URL de la documentation
2. Cliquez sur "Authorize" et ajoutez votre token JWT : `Bearer votre_token_ici`
3. Explorez les différentes sections (Authentification, Catégories, Transactions, etc.)
4. Testez les endpoints directement depuis l'interface

## 🛠️ Installation

1. **Cloner le projet**
```bash
cd backend
npm install
```

2. **Configurer la base de données**
```bash
# Créer la base de données
npm run db:create

# Initialiser les tables
npm run db:init
```

3. **Configurer les variables d'environnement**
```bash
cp env.example .env
# Éditer le fichier .env avec vos paramètres
```

4. **Démarrer le serveur**
```bash
# Mode développement
npm run dev

# Mode production
npm start
```

## 🔧 Configuration

### Variables d'environnement (.env)

```env
# Serveur
PORT=3000
NODE_ENV=development

# Base de données PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=moneywise
DB_USER=postgres
DB_PASSWORD=password

# JWT
JWT_SECRET=votre_secret_jwt_tres_securise_ici

# CORS
FRONTEND_URL=http://localhost:5173

# Logs
LOG_LEVEL=info
```

## 📚 API Endpoints

### Authentification

#### POST `/api/auth/register`
Inscription d'un nouvel utilisateur
```json
{
  "email": "user@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe"
}
```

#### POST `/api/auth/login`
Connexion utilisateur
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

#### GET `/api/auth/profile`
Obtenir le profil utilisateur (authentification requise)

#### PUT `/api/auth/profile`
Mettre à jour le profil utilisateur
```json
{
  "firstName": "John",
  "lastName": "Smith"
}
```

#### PUT `/api/auth/change-password`
Changer le mot de passe
```json
{
  "currentPassword": "oldpassword",
  "newPassword": "newpassword123"
}
```

### Transactions

#### GET `/api/transactions`
Obtenir toutes les transactions (avec pagination et filtres)
```
?page=1&limit=20&type=expense&categoryId=1&startDate=2024-01-01&endDate=2024-12-31
```

#### GET `/api/transactions/:id`
Obtenir une transaction spécifique

#### POST `/api/transactions`
Créer une nouvelle transaction
```json
{
  "type": "expense",
  "amount": 50.00,
  "categoryId": 1,
  "description": "Courses alimentaires",
  "date": "2024-01-15"
}
```

#### PUT `/api/transactions/:id`
Mettre à jour une transaction

#### DELETE `/api/transactions/:id`
Supprimer une transaction

#### GET `/api/transactions/balance/summary`
Obtenir le solde global

#### GET `/api/transactions/stats/monthly/:year/:month`
Statistiques mensuelles

#### GET `/api/transactions/stats/by-category`
Dépenses par catégorie
```
?startDate=2024-01-01&endDate=2024-12-31
```

#### GET `/api/transactions/stats/trend/:year`
Évolution mensuelle de l'année

### Catégories

#### GET `/api/categories`
Obtenir toutes les catégories
```
?type=expense
```

#### GET `/api/categories/:id`
Obtenir une catégorie spécifique

#### POST `/api/categories`
Créer une nouvelle catégorie
```json
{
  "name": "Loisirs",
  "color": "#EC4899",
  "type": "expense"
}
```

#### PUT `/api/categories/:id`
Mettre à jour une catégorie

#### DELETE `/api/categories/:id`
Supprimer une catégorie

#### GET `/api/categories/stats/summary`
Statistiques des catégories

#### POST `/api/categories/reset-defaults`
Réinitialiser les catégories par défaut

### Tableau de bord

#### GET `/api/dashboard/summary`
Résumé du tableau de bord
```
?year=2024&month=1
```

#### GET `/api/dashboard/stats`
Statistiques détaillées
```
?startDate=2024-01-01&endDate=2024-12-31&type=category
```

#### GET `/api/dashboard/charts`
Données pour les graphiques
```
?startDate=2024-01-01&endDate=2024-12-31&chartType=pie
```

#### GET `/api/dashboard/alerts`
Alertes et notifications

### Export

#### GET `/api/export/transactions/csv`
Exporter les transactions en CSV
```
?startDate=2024-01-01&endDate=2024-12-31&type=expense
```

#### GET `/api/export/transactions/json`
Exporter les transactions en JSON

#### GET `/api/export/report/monthly/:year/:month`
Rapport mensuel
```
?format=csv
```

#### GET `/api/export/report/yearly/:year`
Rapport annuel
```
?format=csv
```

## 🔐 Authentification

Toutes les routes (sauf `/api/auth/register` et `/api/auth/login`) nécessitent un token JWT dans le header :

```
Authorization: Bearer <token>
```

## 📊 Structure de la base de données

### Tables principales

- **users** : Utilisateurs de l'application
- **categories** : Catégories personnalisables pour les transactions
- **transactions** : Transactions financières (revenus et dépenses)

### Relations

- Un utilisateur peut avoir plusieurs catégories
- Un utilisateur peut avoir plusieurs transactions
- Une transaction appartient à un utilisateur et peut avoir une catégorie

## 🚀 Scripts disponibles

```bash
# Démarrer en mode développement
npm run dev

# Démarrer en mode production
npm start

# Créer la base de données
npm run db:create

# Initialiser les tables
npm run db:init

# Réinitialiser complètement la base de données
npm run db:reset
```

## 📝 Exemples d'utilisation

### Créer un utilisateur et ajouter des transactions

```bash
# 1. Inscription
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "firstName": "John",
    "lastName": "Doe"
  }'

# 2. Connexion
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'

# 3. Ajouter une transaction (avec le token reçu)
curl -X POST http://localhost:3000/api/transactions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "type": "expense",
    "amount": 25.50,
    "categoryId": 1,
    "description": "Déjeuner",
    "date": "2024-01-15"
  }'
```

## 🐛 Dépannage

### Erreurs courantes

1. **Erreur de connexion à la base de données**
   - Vérifier que PostgreSQL est démarré
   - Vérifier les paramètres de connexion dans `.env`

2. **Erreur JWT**
   - Vérifier que `JWT_SECRET` est défini dans `.env`
   - Vérifier que le token est valide et non expiré

3. **Erreur CORS**
   - Vérifier que `FRONTEND_URL` est correctement configuré
   - Vérifier que le frontend fait les requêtes depuis la bonne URL

## 📄 Licence

MIT License - voir le fichier LICENSE pour plus de détails.

## 🤝 Contribution

1. Fork le projet
2. Créer une branche pour votre fonctionnalité
3. Commiter vos changements
4. Pousser vers la branche
5. Ouvrir une Pull Request

## 📞 Support

Pour toute question ou problème, veuillez ouvrir une issue sur le repository GitHub.
