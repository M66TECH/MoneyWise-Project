const express = require('express');
const Transaction = require('../models/Transaction');
const Categorie = require('../models/Categorie');
const { auth } = require('../middleware/auth');
const jsPDF = require('jspdf');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Export
 *   description: Exportation des données
 */

// Appliquer l'authentification à toutes les routes
router.use(auth);

// Fonction utilitaire pour formater les dates en J-M-AAAA
function formaterDate(dateString) {
  try {
    if (!dateString) return 'Date invalide';
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Date invalide';
    
    const jour = date.getDate().toString().padStart(2, '0');
    const mois = (date.getMonth() + 1).toString().padStart(2, '0');
    const annee = date.getFullYear();
    return `${jour}-${mois}-${annee}`;
  } catch (error) {
    console.error('Erreur formatage date:', error);
    return 'Date invalide';
  }
}

// Fonction utilitaire pour formater les montants en FCFA
function formaterMontant(montant) {
  try {
    if (montant === null || montant === undefined || isNaN(montant)) {
      return '0 FCFA';
    }
    
    const montantNum = parseFloat(montant);
    if (isNaN(montantNum)) return '0 FCFA';
    
    return `${montantNum.toLocaleString('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    })} FCFA`;
  } catch (error) {
    console.error('Erreur formatage montant:', error);
    return '0 FCFA';
  }
}

// Fonction utilitaire pour nettoyer et tronquer le texte
function nettoyerTexte(texte, longueurMax = 25) {
  try {
    if (!texte) return '';
    
    // Supprimer les caractères spéciaux problématiques
    let texteNettoye = String(texte)
      .replace(/[^\w\s\-.,!?()]/g, '') // Garder seulement les caractères sûrs
      .replace(/\s+/g, ' ') // Remplacer les espaces multiples
      .trim();
    
    // Tronquer si nécessaire
    if (texteNettoye.length > longueurMax) {
      texteNettoye = texteNettoye.substring(0, longueurMax - 3) + '...';
    }
    
    return texteNettoye;
  } catch (error) {
    console.error('Erreur nettoyage texte:', error);
    return '';
  }
}

// Fonction utilitaire pour valider les données de transaction
function validerTransaction(transaction) {
  try {
    return {
      id: transaction.id || 'N/A',
      date: transaction.date_transaction || new Date().toISOString(),
      type: transaction.type === 'revenu' ? 'revenu' : 'depense',
      montant: parseFloat(transaction.montant) || 0,
      categorie: transaction.nom_categorie || 'Non catégorisé',
      description: transaction.description || ''
    };
  } catch (error) {
    console.error('Erreur validation transaction:', error);
    return {
      id: 'N/A',
      date: new Date().toISOString(),
      type: 'depense',
      montant: 0,
      categorie: 'Erreur',
      description: 'Données invalides'
    };
  }
}

/**
 * @swagger
 * /api/export/transactions/csv:
 *   get:
 *     summary: Exporter les transactions en CSV
 *     tags: [Export]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Date de début (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Date de fin (YYYY-MM-DD)
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [revenu, depense]
 *         description: Filtrer par type de transaction
 *     responses:
 *       200:
 *         description: Fichier CSV généré avec succès
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 *               example: "Date,Type,Montant,Catégorie,Description\n2024-08-21,Dépense,-25.50,Restaurant,Déjeuner au restaurant"
 *         headers:
 *           Content-Disposition:
 *             description: Nom du fichier de téléchargement
 *             schema:
 *               type: string
 *               example: "attachment; filename=\"transactions_2024-01-01_2024-12-31.csv\""
 *       400:
 *         description: Dates manquantes ou invalides
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Token invalide ou manquant
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// Exporter les transactions en CSV
router.get('/transactions/csv', async (req, res, next) => {
  try {
    const { startDate, endDate, type } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        message: 'Date de début et date de fin requises'
      });
    }

    // Récupérer toutes les transactions de la période
    const transactions = await Transaction.trouverParUtilisateur(req.utilisateur_id, {
      page: 1,
      limit: 10000, // Limite élevée pour l'export
      type,
      startDate,
      endDate
    });

    // Créer le contenu CSV avec validation des données
    const enTeteCSV = 'Date,Type,Montant,Catégorie,Description\n';
    const lignesCSV = transactions.map(transaction => {
      try {
        const transactionValidee = validerTransaction(transaction);
        const typeTransaction = transactionValidee.type === 'revenu' ? 'Revenu' : 'Dépense';
        const montant = transactionValidee.type === 'revenu' ? 
          `${formaterMontant(transactionValidee.montant)}` : 
          `-${formaterMontant(transactionValidee.montant)}`;
        const categorie = nettoyerTexte(transactionValidee.categorie, 30);
        const description = nettoyerTexte(transactionValidee.description, 50);
        
        // Échapper les guillemets dans la description pour CSV
        const descriptionEchappee = description.replace(/"/g, '""');
        
        return `${formaterDate(transactionValidee.date)},${typeTransaction},${montant},"${categorie}","${descriptionEchappee}"`;
      } catch (error) {
        console.error('Erreur traitement transaction CSV:', error);
        return `${formaterDate(new Date())},Erreur,0 FCFA,"Erreur","Données invalides"`;
      }
    }).join('\n');

    const contenuCSV = enTeteCSV + lignesCSV;

    // Définir les headers pour le téléchargement
    const nomFichier = `transactions_${startDate}_${endDate}.csv`;
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${nomFichier}"`);
    res.setHeader('Content-Length', Buffer.byteLength(contenuCSV, 'utf8'));

    res.send(contenuCSV);
  } catch (erreur) {
    next(erreur);
  }
});

/**
 * @swagger
 * /api/export/transactions/pdf:
 *   get:
 *     summary: Exporter les transactions en PDF
 *     tags: [Export]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Date de début (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Date de fin (YYYY-MM-DD)
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [revenu, depense]
 *         description: Filtrer par type de transaction
 *     responses:
 *       200:
 *         description: Fichier PDF généré avec succès
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *         headers:
 *           Content-Disposition:
 *             description: Nom du fichier de téléchargement
 *             schema:
 *               type: string
 *               example: "attachment; filename=\"transactions_2024-01-01_2024-12-31.pdf\""
 *       400:
 *         description: Dates manquantes ou invalides
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Token invalide ou manquant
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// Exporter les transactions en PDF
router.get('/transactions/pdf', async (req, res, next) => {
  try {
    const { startDate, endDate, type } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        message: 'Date de début et date de fin requises'
      });
    }

    // Récupérer toutes les transactions de la période
    const transactions = await Transaction.trouverParUtilisateur(req.utilisateur_id, {
      page: 1,
      limit: 10000,
      type,
      startDate,
      endDate
    });

    // Créer le PDF avec gestion d'erreurs
    let doc;
    try {
      doc = new jsPDF.default();
    } catch (error) {
      console.error('Erreur création PDF:', error);
      return res.status(500).json({
        message: 'Erreur lors de la création du PDF'
      });
    }
    
    // Couleurs pour le design
    const colors = {
      primary: [41, 128, 185],    // Bleu MoneyWise
      secondary: [52, 152, 219],  // Bleu clair
      success: [39, 174, 96],     // Vert pour les revenus
      danger: [231, 76, 60],      // Rouge pour les dépenses
      warning: [243, 156, 18],    // Orange
      light: [236, 240, 241],     // Gris clair
      dark: [44, 62, 80]          // Gris foncé
    };
    
    // Fonction pour dessiner un rectangle avec coins arrondis
    function drawRoundedRect(x, y, width, height, radius, color) {
      try {
        if (!Array.isArray(color) || color.length !== 3) {
          color = [0, 0, 0]; // Couleur par défaut si invalide
        }
        doc.setFillColor(...color);
        doc.roundedRect(x, y, width, height, radius, radius, 'F');
      } catch (error) {
        console.error('Erreur dessin rectangle:', error);
      }
    }
    
    // Fonction pour dessiner une ligne décorative
    function drawDecorativeLine(x, y, width, color) {
      try {
        if (!Array.isArray(color) || color.length !== 3) {
          color = [0, 0, 0]; // Couleur par défaut si invalide
        }
        doc.setDrawColor(...color);
        doc.setLineWidth(2);
        doc.line(x, y, x + width, y);
      } catch (error) {
        console.error('Erreur dessin ligne:', error);
      }
    }
    
    // En-tête avec logo et titre
    try {
      const logoUrl = 'https://res.cloudinary.com/dljxkppye/image/upload/v1756213896/logo_aq4isa.jpg';
      doc.addImage(logoUrl, 'JPEG', 20, 15, 45, 25);
      console.log('✅ Logo ajouté avec succès');
    } catch (error) {
      console.log('⚠️ Erreur lors du chargement du logo:', error.message);
      // Continuer sans logo
    }
    
    // Titre principal avec style
    doc.setTextColor(...colors.primary);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('Rapport des Transactions', 75, 25);
    doc.setFontSize(16);
    doc.text('MoneyWise', 75, 35);
    
    // Ligne décorative sous le titre
    drawDecorativeLine(20, 45, 170, colors.primary);
    
    // Informations de la période dans un encadré
    drawRoundedRect(20, 55, 170, 25, 3, colors.light);
    doc.setTextColor(...colors.dark);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`📅 Période : ${formaterDate(startDate)} à ${formaterDate(endDate)}`, 30, 65);
    doc.text(`📊 Nombre de transactions : ${transactions.length}`, 30, 75);
    
    // En-têtes du tableau avec style
    const tableY = 95;
    drawRoundedRect(20, tableY - 5, 170, 15, 3, colors.primary);
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Date', 30, tableY + 2);
    doc.text('Type', 60, tableY + 2);
    doc.text('Montant', 90, tableY + 2);
    doc.text('Catégorie', 130, tableY + 2);
    doc.text('Description', 170, tableY + 2);
    
    // Lignes du tableau avec alternance de couleurs et validation
    let yPosition = tableY + 15;
    transactions.forEach((transaction, index) => {
      try {
        // Validation de la transaction
        const transactionValidee = validerTransaction(transaction);
        
        if (yPosition > 250) {
          doc.addPage();
          yPosition = 20;
          
          // Redessiner l'en-tête du tableau sur la nouvelle page
          drawRoundedRect(20, yPosition - 5, 170, 15, 3, colors.primary);
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(11);
          doc.setFont('helvetica', 'bold');
          doc.text('Date', 30, yPosition + 2);
          doc.text('Type', 60, yPosition + 2);
          doc.text('Montant', 90, yPosition + 2);
          doc.text('Catégorie', 130, yPosition + 2);
          doc.text('Description', 170, yPosition + 2);
          yPosition += 15;
        }
        
        // Fond alterné pour les lignes
        const bgColor = index % 2 === 0 ? [248, 249, 250] : [255, 255, 255];
        drawRoundedRect(20, yPosition - 3, 170, 12, 2, bgColor);
        
        const typeTransaction = transactionValidee.type === 'revenu' ? 'Revenu' : 'Dépense';
        const montant = transactionValidee.type === 'revenu' ? 
          `+${formaterMontant(transactionValidee.montant)}` : 
          `-${formaterMontant(transactionValidee.montant)}`;
        const categorie = nettoyerTexte(transactionValidee.categorie, 15);
        const description = nettoyerTexte(transactionValidee.description, 20);
        
        // Couleurs pour le type et le montant
        const typeColor = transactionValidee.type === 'revenu' ? colors.success : colors.danger;
        const montantColor = transactionValidee.type === 'revenu' ? colors.success : colors.danger;
        
        // Ajout sécurisé du texte avec gestion d'erreurs
        try {
          doc.setTextColor(...colors.dark);
          doc.setFontSize(9);
          doc.setFont('helvetica', 'normal');
          doc.text(formaterDate(transactionValidee.date), 30, yPosition + 2);
          
          doc.setTextColor(...typeColor);
          doc.setFont('helvetica', 'bold');
          doc.text(typeTransaction, 60, yPosition + 2);
          
          doc.setTextColor(...montantColor);
          doc.text(montant, 90, yPosition + 2);
          
          doc.setTextColor(...colors.dark);
          doc.setFont('helvetica', 'normal');
          doc.text(categorie, 130, yPosition + 2);
          doc.text(description, 170, yPosition + 2);
        } catch (textError) {
          console.error('Erreur ajout texte PDF:', textError);
          // Ajouter un texte d'erreur par défaut
          doc.setTextColor(...colors.danger);
          doc.setFontSize(8);
          doc.text('Erreur affichage', 30, yPosition + 2);
        }
        
        yPosition += 12;
      } catch (error) {
        console.error('Erreur traitement transaction PDF:', error);
        // Continuer avec la transaction suivante
        yPosition += 12;
      }
    });
    
    // Calculer les totaux avec validation
    let totalRevenus = 0;
    let totalDepenses = 0;
    
    try {
      totalRevenus = transactions
        .filter(t => t && t.type === 'revenu')
        .reduce((sum, t) => {
          const montant = parseFloat(t.montant) || 0;
          return sum + (isNaN(montant) ? 0 : montant);
        }, 0);
      
      totalDepenses = transactions
        .filter(t => t && t.type === 'depense')
        .reduce((sum, t) => {
          const montant = parseFloat(t.montant) || 0;
          return sum + (isNaN(montant) ? 0 : montant);
        }, 0);
    } catch (error) {
      console.error('Erreur calcul totaux:', error);
      totalRevenus = 0;
      totalDepenses = 0;
    }
    
    const solde = totalRevenus - totalDepenses;
    
    // Page de résumé avec design amélioré
    doc.addPage();
    
    // Titre de la page résumé
    doc.setTextColor(...colors.primary);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('📈 Résumé Financier', 20, 25);
    
    // Ligne décorative
    drawDecorativeLine(20, 30, 170, colors.primary);
    
    // Cartes de statistiques
    const cardWidth = 80;
    const cardHeight = 40;
    const startX = 20;
    const startY = 45;
    
    // Carte Revenus
    drawRoundedRect(startX, startY, cardWidth, cardHeight, 5, colors.success);
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('💰 Revenus', startX + 5, startY + 10);
    doc.setFontSize(12);
    doc.text(formaterMontant(totalRevenus), startX + 5, startY + 25);
    
    // Carte Dépenses
    drawRoundedRect(startX + cardWidth + 10, startY, cardWidth, cardHeight, 5, colors.danger);
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('💸 Dépenses', startX + cardWidth + 15, startY + 10);
    doc.setFontSize(12);
    doc.text(formaterMontant(totalDepenses), startX + cardWidth + 15, startY + 25);
    
    // Carte Solde
    const soldeColor = solde >= 0 ? colors.success : colors.danger;
    drawRoundedRect(startX + (cardWidth + 10) * 2, startY, cardWidth, cardHeight, 5, soldeColor);
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('💳 Solde', startX + (cardWidth + 10) * 2 + 5, startY + 10);
    doc.setFontSize(12);
    doc.text(formaterMontant(solde), startX + (cardWidth + 10) * 2 + 5, startY + 25);
    
    // Graphique en barres simple (représentation visuelle)
    const graphY = startY + cardHeight + 30;
    doc.setTextColor(...colors.dark);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('📊 Répartition', 20, graphY);
    
    // Barres de revenus et dépenses
    const maxValue = Math.max(totalRevenus, totalDepenses);
    const barWidth = 150;
    const barHeight = 8;
    
    if (maxValue > 0) {
      // Barre des revenus
      const revenusWidth = (totalRevenus / maxValue) * barWidth;
      drawRoundedRect(20, graphY + 10, revenusWidth, barHeight, 2, colors.success);
      doc.setTextColor(...colors.success);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Revenus', 20, graphY + 25);
      
      // Barre des dépenses
      const depensesWidth = (totalDepenses / maxValue) * barWidth;
      drawRoundedRect(20, graphY + 35, depensesWidth, barHeight, 2, colors.danger);
      doc.setTextColor(...colors.danger);
      doc.text('Dépenses', 20, graphY + 50);
    }
    
    // Pied de page avec informations
    const footerY = 250;
    drawRoundedRect(20, footerY, 170, 25, 3, colors.light);
    doc.setTextColor(...colors.dark);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`📅 Généré le : ${formaterDate(new Date().toISOString())}`, 30, footerY + 10);
    doc.text(`📱 MoneyWise - Votre partenaire financier`, 30, footerY + 20);

    // Définir les headers pour le téléchargement
    const nomFichier = `transactions_${startDate}_${endDate}.pdf`;
    
    try {
      const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${nomFichier}"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      
      console.log(`✅ PDF généré avec succès: ${nomFichier} (${pdfBuffer.length} bytes)`);
      res.send(pdfBuffer);
    } catch (error) {
      console.error('Erreur génération PDF final:', error);
      return res.status(500).json({
        message: 'Erreur lors de la génération du PDF'
      });
    }
  } catch (erreur) {
    next(erreur);
  }
});

// Exporter les transactions en JSON
router.get('/transactions/json', async (req, res, next) => {
  try {
    const { startDate, endDate, type } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        message: 'Date de début et date de fin requises'
      });
    }

    // Récupérer toutes les transactions de la période
    const transactions = await Transaction.trouverParUtilisateur(req.utilisateur_id, {
      page: 1,
      limit: 10000,
      type,
      startDate,
      endDate
    });

    const donneesExport = {
      dateExport: new Date().toISOString(),
      periode: { startDate, endDate },
      nombreTotalTransactions: transactions.length,
      transactions: transactions.map(transaction => ({
        id: transaction.id,
        date: transaction.date_transaction,
        type: transaction.type,
        montant: transaction.montant,
        categorie: transaction.nom_categorie,
        description: transaction.description,
        dateCreation: transaction.date_creation
      }))
    };

    const nomFichier = `transactions_${startDate}_${endDate}.json`;
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${nomFichier}"`);

    res.json(donneesExport);
  } catch (erreur) {
    next(erreur);
  }
});

// Générer un rapport mensuel
router.get('/report/monthly/:year/:month', async (req, res, next) => {
  try {
    const { year, month } = req.params;
    const { format = 'json' } = req.query;

    // Obtenir les statistiques du mois
    const statistiquesMensuelles = await Transaction.obtenirStatistiquesMensuelles(req.utilisateur_id, year, month);
    
    // Obtenir les dépenses par catégorie
    const dateDebut = new Date(year, month - 1, 1).toISOString().split('T')[0];
    const dateFin = new Date(year, month, 0).toISOString().split('T')[0];
    
    const depensesParCategorie = await Transaction.obtenirDepensesParCategorie(
      req.utilisateur_id,
      dateDebut,
      dateFin
    );

    // Obtenir les transactions du mois
    const transactions = await Transaction.trouverParUtilisateur(req.utilisateur_id, {
      page: 1,
      limit: 1000,
      startDate: dateDebut,
      endDate: dateFin
    });

    // Obtenir les catégories utilisées
    const categories = await Categorie.trouverParUtilisateur(req.utilisateur_id);

    const donneesRapport = {
      typeRapport: 'monthly',
      periode: {
        annee: parseInt(year),
        mois: parseInt(month),
        nomMois: new Date(year, month - 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
      },
      resume: {
        revenusTotaux: statistiquesMensuelles.total_revenus,
        depensesTotales: statistiquesMensuelles.total_depenses,
        solde: statistiquesMensuelles.solde,
        nombreTotalTransactions: statistiquesMensuelles.nombre_transactions
      },
      depensesParCategorie: depensesParCategorie.map(element => ({
        categorie: element.nom_categorie,
        montant: parseFloat(element.montant_total),
        pourcentage: statistiquesMensuelles.total_depenses > 0 ? 
          ((parseFloat(element.montant_total) / statistiquesMensuelles.total_depenses) * 100).toFixed(1) : 0,
        nombreTransactions: element.nombre_transactions
      })),
      transactions: transactions.slice(0, 50), // Limiter à 50 transactions
      categories: categories,
      genereLe: new Date().toISOString()
    };

    if (format === 'csv') {
      // Générer un rapport CSV
      const enTeteCSV = 'Rapport Mensuel - MoneyWise\n\n';
      const sectionResume = `Résumé du mois de ${donneesRapport.periode.nomMois}\n`;
      const donneesResume = `Revenus totaux,${formaterMontant(donneesRapport.resume.revenusTotaux)}\n`;
      const donneesResume2 = `Dépenses totales,${formaterMontant(donneesRapport.resume.depensesTotales)}\n`;
      const donneesResume3 = `Solde,${formaterMontant(donneesRapport.resume.solde)}\n`;
      const donneesResume4 = `Nombre de transactions,${donneesRapport.resume.nombreTotalTransactions}\n\n`;
      
      const enTeteCategories = 'Dépenses par catégorie\n';
      const donneesCategories = 'Catégorie,Montant,Pourcentage,Nombre de transactions\n';
      const lignesCategories = donneesRapport.depensesParCategorie.map(element => 
        `${element.categorie},${formaterMontant(element.montant)},${element.pourcentage}%,${element.nombreTransactions}`
      ).join('\n');

      const contenuCSV = enTeteCSV + sectionResume + donneesResume + donneesResume2 + 
                        donneesResume3 + donneesResume4 + enTeteCategories + donneesCategories + lignesCategories;

      const nomFichier = `rapport_mensuel_${year}_${month.toString().padStart(2, '0')}.csv`;
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${nomFichier}"`);
      res.setHeader('Content-Length', Buffer.byteLength(contenuCSV, 'utf8'));

      res.send(contenuCSV);
    } else {
      // Format JSON par défaut
      const nomFichier = `rapport_mensuel_${year}_${month.toString().padStart(2, '0')}.json`;
      
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${nomFichier}"`);

      res.json(donneesRapport);
    }
  } catch (erreur) {
    next(erreur);
  }
});

// Générer un rapport annuel
router.get('/report/yearly/:year', async (req, res, next) => {
  try {
    const { year } = req.params;
    const { format = 'json' } = req.query;

    // Obtenir l'évolution mensuelle de l'année
    const evolutionMensuelle = await Transaction.obtenirEvolutionMensuelle(req.utilisateur_id, year);
    
    // Calculer les totaux annuels
    const totauxAnnuels = evolutionMensuelle.reduce((acc, mois) => {
      if (mois.type === 'revenu') {
        acc.revenus += parseFloat(mois.montant_total || 0);
      } else {
        acc.depenses += parseFloat(mois.montant_total || 0);
      }
      return acc;
    }, { revenus: 0, depenses: 0 });

    totauxAnnuels.solde = totauxAnnuels.revenus - totauxAnnuels.depenses;

    // Obtenir les dépenses par catégorie pour l'année
    const dateDebut = `${year}-01-01`;
    const dateFin = `${year}-12-31`;
    
    const depensesParCategorie = await Transaction.obtenirDepensesParCategorie(
      req.utilisateur_id,
      dateDebut,
      dateFin
    );

    const donneesRapport = {
      typeRapport: 'yearly',
      periode: {
        annee: parseInt(year)
      },
      resume: {
        revenusTotaux: totauxAnnuels.revenus,
        depensesTotales: totauxAnnuels.depenses,
        solde: totauxAnnuels.solde,
        revenusMensuelsMoyens: totauxAnnuels.revenus / 12,
        depensesMensuellesMoyennes: totauxAnnuels.depenses / 12
      },
      repartitionMensuelle: evolutionMensuelle.map(mois => ({
        mois: mois.mois,
        revenus: mois.type === 'revenu' ? parseFloat(mois.montant_total || 0) : 0,
        depenses: mois.type === 'depense' ? parseFloat(mois.montant_total || 0) : 0,
        solde: mois.type === 'revenu' ? parseFloat(mois.montant_total || 0) : -parseFloat(mois.montant_total || 0)
      })),
      depensesParCategorie: depensesParCategorie.map(element => ({
        categorie: element.nom_categorie,
        montant: parseFloat(element.montant_total),
        pourcentage: totauxAnnuels.depenses > 0 ? 
          ((parseFloat(element.montant_total) / totauxAnnuels.depenses) * 100).toFixed(1) : 0,
        nombreTransactions: element.nombre_transactions
      })),
      genereLe: new Date().toISOString()
    };

    if (format === 'csv') {
      // Générer un rapport CSV
      const enTeteCSV = `Rapport Annuel ${year} - MoneyWise\n\n`;
      const sectionResume = 'Résumé de l\'année\n';
      const donneesResume = `Revenus totaux,${formaterMontant(donneesRapport.resume.revenusTotaux)}\n`;
      const donneesResume2 = `Dépenses totales,${formaterMontant(donneesRapport.resume.depensesTotales)}\n`;
      const donneesResume3 = `Solde,${formaterMontant(donneesRapport.resume.solde)}\n`;
      const donneesResume4 = `Revenus mensuels moyens,${formaterMontant(donneesRapport.resume.revenusMensuelsMoyens)}\n`;
      const donneesResume5 = `Dépenses mensuelles moyennes,${formaterMontant(donneesRapport.resume.depensesMensuellesMoyennes)}\n\n`;
      
      const enTeteMensuel = 'Évolution mensuelle\n';
      const donneesMensuel = 'Mois,Revenus,Dépenses,Solde\n';
      const lignesMensuel = donneesRapport.repartitionMensuelle.map(element => 
        `${element.mois},${formaterMontant(element.revenus)},${formaterMontant(element.depenses)},${formaterMontant(element.solde)}`
      ).join('\n');

      const contenuCSV = enTeteCSV + sectionResume + donneesResume + donneesResume2 + 
                        donneesResume3 + donneesResume4 + donneesResume5 + enTeteMensuel + 
                        donneesMensuel + lignesMensuel;

      const nomFichier = `rapport_annuel_${year}.csv`;
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${nomFichier}"`);
      res.setHeader('Content-Length', Buffer.byteLength(contenuCSV, 'utf8'));

      res.send(contenuCSV);
    } else {
      // Format JSON par défaut
      const nomFichier = `rapport_annuel_${year}.json`;
      
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${nomFichier}"`);

      res.json(donneesRapport);
    }
  } catch (erreur) {
    next(erreur);
  }
});

module.exports = router;
