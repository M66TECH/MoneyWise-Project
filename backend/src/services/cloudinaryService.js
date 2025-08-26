const cloudinary = require('cloudinary').v2;

// Configuration Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

class CloudinaryService {
    /**
     * Uploader une image vers Cloudinary
     * @param {Buffer} imageBuffer - Buffer de l'image
     * @param {string} publicId - ID public pour l'image (optionnel)
     * @returns {Promise<Object>} Résultat de l'upload
     */
    static async uploadImage(imageBuffer, publicId = null) {
        try {
            const options = {
                folder: 'moneywise/profiles',
                resource_type: 'image',
                transformation: [
                    { width: 400, height: 400, crop: 'fill', gravity: 'face' },
                    { quality: 'auto', fetch_format: 'auto' }
                ]
            };

            if (publicId) {
                options.public_id = publicId;
            }

            const result = await new Promise((resolve, reject) => {
                const uploadStream = cloudinary.uploader.upload_stream(
                    options,
                    (error, result) => {
                        if (error) {
                            reject(error);
                        } else {
                            resolve(result);
                        }
                    }
                );

                uploadStream.end(imageBuffer);
            });

            return {
                success: true,
                url: result.secure_url,
                public_id: result.public_id,
                width: result.width,
                height: result.height,
                format: result.format
            };

        } catch (error) {
            console.error('Erreur lors de l\'upload vers Cloudinary:', error);
            throw new Error('Erreur lors de l\'upload de l\'image');
        }
    }

    /**
     * Supprimer une image de Cloudinary
     * @param {string} publicId - ID public de l'image à supprimer
     * @returns {Promise<Object>} Résultat de la suppression
     */
    static async deleteImage(publicId) {
        try {
            if (!publicId) {
                return { success: true, message: 'Aucune image à supprimer' };
            }

            const result = await cloudinary.uploader.destroy(publicId, {
                resource_type: 'image'
            });

            if (result.result === 'ok') {
                return {
                    success: true,
                    message: 'Image supprimée avec succès'
                };
            } else {
                throw new Error('Erreur lors de la suppression de l\'image');
            }

        } catch (error) {
            console.error('Erreur lors de la suppression depuis Cloudinary:', error);
            throw new Error('Erreur lors de la suppression de l\'image');
        }
    }

    /**
     * Extraire l'ID public d'une URL Cloudinary
     * @param {string} url - URL Cloudinary
     * @returns {string|null} ID public ou null
     */
    static extractPublicIdFromUrl(url) {
        if (!url || !url.includes('cloudinary.com')) {
            return null;
        }

        try {
            // Exemple d'URL: https://res.cloudinary.com/cloud_name/image/upload/v1234567890/moneywise/profiles/image_id.jpg
            const urlParts = url.split('/');
            const uploadIndex = urlParts.findIndex(part => part === 'upload');
            
            if (uploadIndex !== -1 && urlParts[uploadIndex + 2]) {
                // Prendre tout ce qui suit après 'upload/v1234567890/'
                const publicIdParts = urlParts.slice(uploadIndex + 2);
                // Retirer l'extension du fichier
                const publicId = publicIdParts.join('/').replace(/\.[^/.]+$/, '');
                return publicId;
            }
        } catch (error) {
            console.error('Erreur lors de l\'extraction de l\'ID public:', error);
        }

        return null;
    }

    /**
     * Vérifier si Cloudinary est configuré
     * @returns {boolean}
     */
    static isConfigured() {
        return !!(process.env.CLOUDINARY_CLOUD_NAME && 
                 process.env.CLOUDINARY_API_KEY && 
                 process.env.CLOUDINARY_API_SECRET);
    }

    /**
     * Générer une URL optimisée pour Cloudinary
     * @param {string} publicId - ID public de l'image
     * @param {Object} options - Options de transformation
     * @returns {string} URL optimisée
     */
    static generateOptimizedUrl(publicId, options = {}) {
        if (!publicId) return null;

        const defaultOptions = {
            width: 200,
            height: 200,
            crop: 'fill',
            gravity: 'face',
            quality: 'auto',
            fetch_format: 'auto'
        };

        const transformationOptions = { ...defaultOptions, ...options };

        return cloudinary.url(publicId, {
            transformation: [transformationOptions],
            secure: true
        });
    }
}

module.exports = CloudinaryService;


