const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'MoneyWise API',
      version: '1.0.0',
      description: 'API de gestion de finances personnelles MoneyWise',
      contact: {
        name: 'Équipe MoneyWise',
        email: 'malicknd00@gmail.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: process.env.NODE_ENV === 'production' 
          ? 'https://moneywise-backend-187q.onrender.com' 
          : 'http://localhost:3000',
        description: process.env.NODE_ENV === 'production' ? 'Serveur de production' : 'Serveur de développement'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        Utilisateur: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            email: { type: 'string', format: 'email', example: 'user@example.com' },
            prenom: { type: 'string', example: 'Jean' },
            nom: { type: 'string', example: 'Dupont' },
            photo_profil: { 
              type: 'string', 
              example: '{"url":"https://res.cloudinary.com/cloud_name/image/upload/v1234567890/moneywise/profiles/user-1-profile.jpg","public_id":"moneywise/profiles/user-1-profile"}',
              description: 'Données de la photo de profil (JSON string)'
            },
            theme: { type: 'string', enum: ['light', 'dark'], example: 'light' },
            email_verifie: { type: 'boolean', example: true },
            date_creation: { type: 'string', format: 'date-time' },
            date_modification: { type: 'string', format: 'date-time' }
          }
        },
        PhotoProfil: {
          type: 'object',
          properties: {
            url: { 
              type: 'string', 
              example: 'https://res.cloudinary.com/cloud_name/image/upload/v1234567890/moneywise/profiles/user-1-profile.jpg',
              description: 'URL de la photo de profil'
            },
            public_id: { 
              type: 'string', 
              example: 'moneywise/profiles/user-1-profile',
              description: 'ID public Cloudinary (pour la production)'
            },
            type: { 
              type: 'string', 
              enum: ['local', 'cloudinary'],
              example: 'cloudinary',
              description: 'Type de stockage'
            }
          }
        },
        UploadPhotoResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Photo de profil mise à jour avec succès' },
            photo_profil: {
              $ref: '#/components/schemas/PhotoProfil'
            },
            photo_url: { 
              type: 'string', 
              example: 'https://res.cloudinary.com/cloud_name/image/upload/v1234567890/moneywise/profiles/user-1-profile.jpg',
              description: 'URL directe vers l\'image'
            }
          }
        },
        ProfilResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            utilisateur: {
              $ref: '#/components/schemas/Utilisateur'
            }
          }
        },
        Categorie: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            utilisateur_id: { type: 'integer', example: 1 },
            nom: { type: 'string', example: 'Restaurant' },
            couleur: { type: 'string', example: '#FF6B6B' },
            type: { type: 'string', enum: ['revenu', 'depense', 'hybride'], example: 'depense' },
            date_creation: { type: 'string', format: 'date-time' },
            date_modification: { type: 'string', format: 'date-time' }
          }
        },
        Transaction: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            utilisateur_id: { type: 'integer', example: 1 },
            categorie_id: { type: 'integer', example: 1 },
            type: { type: 'string', enum: ['revenu', 'depense'], example: 'depense' },
            montant: { type: 'number', format: 'float', example: 25.50 },
            description: { type: 'string', example: 'Déjeuner au restaurant' },
            date_transaction: { type: 'string', format: 'date', example: '2024-08-21' },
            date_creation: { type: 'string', format: 'date-time' },
            date_modification: { type: 'string', format: 'date-time' }
          }
        },
        DashboardSummary: {
          type: 'object',
          properties: {
            total_revenus: { type: 'number', example: 5000.00 },
            total_depenses: { type: 'number', example: 3000.00 },
            solde: { type: 'number', example: 2000.00 },
            nombre_transactions: { type: 'integer', example: 25 },
            pourcentage_economies: { type: 'number', example: 40.0 }
          }
        },
        MonthlyStats: {
          type: 'object',
          properties: {
            mois: { type: 'string', example: '2024-08' },
            total_revenus: { type: 'number', example: 5000.00 },
            total_depenses: { type: 'number', example: 3000.00 },
            solde: { type: 'number', example: 2000.00 },
            nombre_transactions: { type: 'integer', example: 25 }
          }
        },
        CategoryBreakdown: {
          type: 'object',
          properties: {
            categorie_id: { type: 'integer', example: 1 },
            nom_categorie: { type: 'string', example: 'Restaurant' },
            couleur: { type: 'string', example: '#FF6B6B' },
            total_montant: { type: 'number', example: 500.00 },
            nombre_transactions: { type: 'integer', example: 10 },
            pourcentage: { type: 'number', example: 16.67 }
          }
        },
        AlertRequest: {
          type: 'object',
          properties: {
            type: { 
              type: 'string', 
              enum: ['solde_negatif', 'seuil_critique', 'depense_elevee', 'personnalise'],
              example: 'seuil_critique',
              description: 'Type d\'alerte'
            },
            severite: { 
              type: 'string', 
              enum: ['faible', 'moyenne', 'elevee', 'critique'],
              example: 'moyenne',
              description: 'Niveau de sévérité'
            },
            message: { 
              type: 'string', 
              example: 'Votre solde est faible',
              description: 'Message personnalisé (optionnel)'
            }
          }
        },
        AlertResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Alerte envoyée avec succès' },
            alert_type: { type: 'string', example: 'seuil_critique' },
            severite: { type: 'string', example: 'moyenne' }
          }
        },
        ExportRequest: {
          type: 'object',
          properties: {
            startDate: { 
              type: 'string', 
              format: 'date',
              example: '2024-08-01',
              description: 'Date de début (YYYY-MM-DD)'
            },
            endDate: { 
              type: 'string', 
              format: 'date',
              example: '2024-08-31',
              description: 'Date de fin (YYYY-MM-DD)'
            }
          }
        },
        MonthlyReport: {
          type: 'object',
          properties: {
            annee: { type: 'integer', example: 2024 },
            mois: { type: 'integer', example: 8 },
            total_revenus: { type: 'number', example: 5000.00 },
            total_depenses: { type: 'number', example: 3000.00 },
            solde: { type: 'number', example: 2000.00 },
            nombre_transactions: { type: 'integer', example: 25 },
            depenses_par_categorie: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/CategoryBreakdown'
              }
            },
            revenus_par_categorie: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/CategoryBreakdown'
              }
            }
          }
        },
        Error: {
          type: 'object',
          properties: {
            message: { type: 'string', example: 'Message d\'erreur' },
            error: { type: 'string', example: 'Détails de l\'erreur' }
          }
        }
      }
    }
  },
  apis: ['./src/routes/*.js', './src/app.js']
};

const specs = swaggerJsdoc(options);

module.exports = specs;
