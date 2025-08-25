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
            type: { type: 'string', enum: ['revenu', 'depense'], example: 'depense' },
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
        Error: {
          type: 'object',
          properties: {
            message: { type: 'string', example: 'Message d\'erreur' }
          }
        }
      }
    }
  },
  apis: ['./src/routes/*.js', './src/app.js']
};

const specs = swaggerJsdoc(options);

module.exports = specs;
