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

    // Validation des paramètres
    const validation = validerParametresExport({ startDate, endDate, type });
    if (!validation.valide) {
      return res.status(400).json({
        message: 'Paramètres invalides',
        erreurs: validation.erreurs
      });
    }

    // Récupérer toutes les transactions de la période avec les catégories
    const transactions = await Transaction.trouverParUtilisateurAvecCategories(req.utilisateur_id, {
      page: 1,
      limit: 10000, // Limite élevée pour l'export
      type,
      startDate,
      endDate
    });

    // Créer le contenu CSV
    const enTeteCSV = 'Date,Type,Montant,Catégorie,Description\n';
    const lignesCSV = transactions.map(transaction => {
      const typeTransaction = transaction.type === 'revenu' ? 'Revenu' : 'Dépense';
      const montant = transaction.type === 'revenu' ? transaction.montant : `-${transaction.montant}`;
      const categorie = transaction.nom_categorie || 'Non catégorisé';
      const description = transaction.description || '';
      
      return `${transaction.date_transaction},${typeTransaction},${montant},${categorie},"${description}"`;
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

    // Validation des paramètres
    const validation = validerParametresExport({ startDate, endDate, type });
    if (!validation.valide) {
      return res.status(400).json({
        message: 'Paramètres invalides',
        erreurs: validation.erreurs
      });
    }

    // Récupérer toutes les transactions de la période avec les catégories
    const transactions = await Transaction.trouverParUtilisateurAvecCategories(req.utilisateur_id, {
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

    // Fonction pour ajouter du texte avec gestion d'erreurs
    function addText(text, x, y, fontSize = 12, fontStyle = 'normal', color = colors.dark) {
      try {
        doc.setTextColor(...color);
        doc.setFontSize(fontSize);
        doc.setFont('helvetica', fontStyle);
        doc.text(text, x, y);
      } catch (error) {
        console.error('Erreur ajout texte:', error);
      }
    }
    
    // En-tête avec logo et titre
    try {
      const logoUrl = 'https://res.cloudinary.com/dljxkppye/image/upload/v1756213896/logo_aq4isa.jpg';
      doc.addImage(logoUrl, 'JPEG', 20, 15, 45, 25);
      
    } catch (error) {
      console.log('⚠️ Erreur lors du chargement du logo:', error.message);
      // Continuer sans logo
    }
    
    // Titre principal avec style
    addText('Rapport des Transactions', 75, 25, 24, 'bold', colors.primary);
    addText('MoneyWise', 75, 35, 16, 'normal', colors.primary);
    
    // Ligne décorative sous le titre
    drawDecorativeLine(20, 45, 170, colors.primary);
    
    // Informations de la période dans un encadré
    drawRoundedRect(20, 55, 170, 25, 3, colors.light);
    addText(`Période : ${formaterDate(startDate)} à ${formaterDate(endDate)}`, 30, 65, 12, 'normal', colors.dark);
    addText(`Nombre de transactions : ${transactions.length}`, 30, 75, 12, 'normal', colors.dark);
    
    // En-têtes du tableau avec style
    const tableY = 95;
    drawRoundedRect(20, tableY - 5, 170, 15, 3, colors.primary);
    
    addText('Date', 30, tableY + 2, 11, 'bold', [255, 255, 255]);
    addText('Type', 60, tableY + 2, 11, 'bold', [255, 255, 255]);
    addText('Montant', 90, tableY + 2, 11, 'bold', [255, 255, 255]);
    addText('Catégorie', 130, tableY + 2, 11, 'bold', [255, 255, 255]);
    addText('Description', 170, tableY + 2, 11, 'bold', [255, 255, 255]);
    
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
          addText('Date', 30, yPosition + 2, 11, 'bold', [255, 255, 255]);
          addText('Type', 60, yPosition + 2, 11, 'bold', [255, 255, 255]);
          addText('Montant', 90, yPosition + 2, 11, 'bold', [255, 255, 255]);
          addText('Catégorie', 130, yPosition + 2, 11, 'bold', [255, 255, 255]);
          addText('Description', 170, yPosition + 2, 11, 'bold', [255, 255, 255]);
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
          addText(formaterDate(transactionValidee.date), 30, yPosition + 2, 9, 'normal', colors.dark);
          addText(typeTransaction, 60, yPosition + 2, 9, 'bold', typeColor);
          addText(montant, 90, yPosition + 2, 9, 'bold', montantColor);
          addText(categorie, 130, yPosition + 2, 9, 'normal', colors.dark);
          addText(description, 170, yPosition + 2, 9, 'normal', colors.dark);
        } catch (textError) {
          console.error('Erreur ajout texte PDF:', textError);
          // Ajouter un texte d'erreur par défaut
          addText('Erreur affichage', 30, yPosition + 2, 8, 'normal', colors.danger);
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
    addText('Résumé Financier', 20, 25, 20, 'bold', colors.primary);
    
    // Ligne décorative
    drawDecorativeLine(20, 30, 170, colors.primary);
    
    // Cartes de statistiques
    const cardWidth = 50;
    const cardHeight = 30;
    const startX = 20;
    const startY = 45;
    
    // Carte Revenus
    drawRoundedRect(startX, startY, cardWidth, cardHeight, 5, colors.success);
    addText('Revenus', startX + 5, startY + 10, 10, 'bold', [255, 255, 255]);
    addText(formaterMontant(totalRevenus), startX + 5, startY + 25, 12, 'bold', [255, 255, 255]);
    
    // Carte Dépenses
    drawRoundedRect(startX + cardWidth + 10, startY, cardWidth, cardHeight, 5, colors.danger);
    addText('Dépenses', startX + cardWidth + 15, startY + 10, 10, 'bold', [255, 255, 255]);
    addText(formaterMontant(totalDepenses), startX + cardWidth + 15, startY + 25, 12, 'bold', [255, 255, 255]);
    
    // Carte Solde - AFFICHAGE COMPLET ET VISIBLE
    const soldeColor = solde >= 0 ? colors.success : colors.danger;
    drawRoundedRect(startX + (cardWidth + 10) * 2, startY, cardWidth, cardHeight, 5, soldeColor);
    addText('Solde', startX + (cardWidth + 10) * 2 + 5, startY + 10, 10, 'bold', [255, 255, 255]);
    addText(formaterMontant(solde), startX + (cardWidth + 10) * 2 + 5, startY + 25, 12, 'bold', [255, 255, 255]);
    
    // Tableau récapitulatif détaillé
    const tableResumeY = startY + cardHeight + 20;
    drawRoundedRect(20, tableResumeY - 5, 170, 35, 3, colors.light);
    
    addText('Indicateur', 30, tableResumeY + 5, 10, 'bold', colors.dark);
    addText('Montant', 120, tableResumeY + 5, 10, 'bold', colors.dark);
    
    addText('Revenus totaux', 30, tableResumeY + 15, 9, 'normal', colors.dark);
    addText(formaterMontant(totalRevenus), 120, tableResumeY + 15, 9, 'bold', colors.success);
    
    addText('Dépenses totales', 30, tableResumeY + 25, 9, 'normal', colors.dark);
    addText(formaterMontant(totalDepenses), 120, tableResumeY + 25, 9, 'bold', colors.danger);
    
    // Graphique en barres simple (représentation visuelle)
    const graphY = tableResumeY + 50;
    addText('Répartition', 20, graphY, 14, 'bold', colors.dark);
    
    // Barres de revenus et dépenses
    const maxValue = Math.max(totalRevenus, totalDepenses);
    const barWidth = 150;
    const barHeight = 8;
    
    if (maxValue > 0) {
      // Barre des revenus
      const revenusWidth = (totalRevenus / maxValue) * barWidth;
      drawRoundedRect(20, graphY + 10, revenusWidth, barHeight, 2, colors.success);
      addText('Revenus', 20, graphY + 25, 10, 'bold', colors.success);
      
      // Barre des dépenses
      const depensesWidth = (totalDepenses / maxValue) * barWidth;
      drawRoundedRect(20, graphY + 35, depensesWidth, barHeight, 2, colors.danger);
      addText('Dépenses', 20, graphY + 50, 10, 'bold', colors.danger);
    }
    
    // Pied de page avec informations
    const footerY = 250;
    drawRoundedRect(20, footerY, 170, 25, 3, colors.light);
    addText(`Généré le : ${formaterDate(new Date().toISOString())}`, 30, footerY + 10, 10, 'normal', colors.dark);
    addText(`MoneyWise - Votre partenaire financier`, 30, footerY + 20, 10, 'normal', colors.primary);

    // Définir les headers pour le téléchargement
    const nomFichier = `transactions_${startDate}_${endDate}.pdf`;
    
    try {
      const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${nomFichier}"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      
      console.log(`PDF généré avec succès: ${nomFichier} (${pdfBuffer.length} bytes)`);
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

    // Récupérer toutes les transactions de la période avec les catégories
    const transactions = await Transaction.trouverParUtilisateurAvecCategories(req.utilisateur_id, {
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

// Générer un rapport mensuel PDF professionnel
router.get('/report/monthly/:year/:month/pdf', async (req, res, next) => {
  try {
    const { year, month } = req.params;

    // Validation des paramètres
    const validation = validerParametresRapportMensuel({ year, month });
    if (!validation.valide) {
      return res.status(400).json({
        message: 'Paramètres invalides',
        erreurs: validation.erreurs
      });
    }

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

    // Obtenir les revenus par catégorie
    const revenusParCategorie = await Transaction.obtenirRevenusParCategorie(
      req.utilisateur_id,
      dateDebut,
      dateFin
    );

    // Obtenir les transactions du mois avec les catégories
    const transactions = await Transaction.trouverParUtilisateurAvecCategories(req.utilisateur_id, {
      page: 1,
      limit: 1000,
      startDate: dateDebut,
      endDate: dateFin
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
    
    // Couleurs pour le design professionnel
    const colors = {
      primary: [41, 128, 185],    // Bleu MoneyWise
      secondary: [52, 152, 219],  // Bleu clair
      success: [39, 174, 96],     // Vert pour les revenus
      danger: [231, 76, 60],      // Rouge pour les dépenses
      warning: [243, 156, 18],    // Orange
      light: [236, 240, 241],     // Gris clair
      dark: [44, 62, 80],         // Gris foncé
      white: [255, 255, 255]      // Blanc
    };
    
    // Fonction pour dessiner un rectangle avec coins arrondis
    function drawRoundedRect(x, y, width, height, radius, color) {
      try {
        if (!Array.isArray(color) || color.length !== 3) {
          color = [0, 0, 0];
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
          color = [0, 0, 0];
        }
        doc.setDrawColor(...color);
        doc.setLineWidth(2);
        doc.line(x, y, x + width, y);
      } catch (error) {
        console.error('Erreur dessin ligne:', error);
      }
    }

    // Fonction pour ajouter du texte avec gestion d'erreurs
    function addText(text, x, y, fontSize = 12, fontStyle = 'normal', color = colors.dark) {
      try {
        doc.setTextColor(...color);
        doc.setFontSize(fontSize);
        doc.setFont('helvetica', fontStyle);
        doc.text(text, x, y);
      } catch (error) {
        console.error('Erreur ajout texte:', error);
      }
    }

    // 1. 📘 PAGE DE COUVERTURE
    try {
      // Logo
      const logoUrl = 'https://res.cloudinary.com/dljxkppye/image/upload/v1756213896/logo_aq4isa.jpg';
      doc.addImage(logoUrl, 'JPEG', 75, 20, 60, 35);
      console.log('Logo ajouté avec succès');
    } catch (error) {
      console.log('Erreur lors du chargement du logo:', error.message);
    }
    
    // Titre principal
    addText('RAPPORT FINANCIER MENSUEL', 105, 80, 18, 'bold', colors.primary);
    
    // Période
    const nomMois = new Date(year, month - 1).toLocaleDateString('fr-FR', { 
      month: 'long', 
      year: 'numeric' 
    });
    addText(nomMois.toUpperCase(), 105, 95, 14, 'bold', colors.dark);
    
    // Ligne décorative
    drawDecorativeLine(50, 105, 110, colors.primary);
    
    // Informations de génération
    addText('Généré le : ' + formaterDate(new Date().toISOString()), 105, 130, 10, 'normal', colors.dark);
    addText('MoneyWise - Votre partenaire financier', 105, 140, 10, 'normal', colors.primary);
    
    // 2. 🗣️ INTRODUCTION (Nouvelle page)
    doc.addPage();
    
    addText('INTRODUCTION', 20, 25, 16, 'bold', colors.primary);
    drawDecorativeLine(20, 30, 170, colors.primary);
    
    addText('Objectif du rapport', 20, 45, 12, 'bold', colors.dark);
    addText('Ce rapport présente une analyse détaillée des transactions financières', 20, 55, 10, 'normal', colors.dark);
    addText('du mois de ' + nomMois + '. Il vise à fournir une vue d\'ensemble claire', 20, 62, 10, 'normal', colors.dark);
    addText('de la situation financière et à identifier les tendances importantes.', 20, 69, 10, 'normal', colors.dark);
    
    addText('Contexte des activités', 20, 85, 12, 'bold', colors.dark);
    addText('Période analysée : ' + nomMois, 20, 95, 10, 'normal', colors.dark);
    addText('Nombre total de transactions : ' + (statistiquesMensuelles.nombre_transactions || 0), 20, 102, 10, 'normal', colors.dark);
    addText('Date de début : ' + formaterDate(dateDebut), 20, 109, 10, 'normal', colors.dark);
    addText('Date de fin : ' + formaterDate(dateFin), 20, 116, 10, 'normal', colors.dark);
    
    // 3. 📊 RÉSUMÉ FINANCIER (Nouvelle page)
    doc.addPage();
    
    addText('RÉSUMÉ FINANCIER', 20, 25, 16, 'bold', colors.primary);
    drawDecorativeLine(20, 30, 170, colors.primary);
    
    // Cartes de statistiques
    const cardWidth = 50;
    const cardHeight = 35;
    const startX = 20;
    const startY = 45;
    
    // Carte Revenus
    drawRoundedRect(startX, startY, cardWidth, cardHeight, 5, colors.success);
    addText('REVENUS', startX + 5, startY + 10, 10, 'bold', colors.white);
    addText(formaterMontant(statistiquesMensuelles.total_revenus), startX + 5, startY + 22, 11, 'bold', colors.white);
    
    // Carte Dépenses
    drawRoundedRect(startX + cardWidth + 10, startY, cardWidth, cardHeight, 5, colors.danger);
    addText('DÉPENSES', startX + cardWidth + 15, startY + 10, 10, 'bold', colors.white);
    addText(formaterMontant(statistiquesMensuelles.total_depenses), startX + cardWidth + 15, startY + 22, 11, 'bold', colors.white);
    
    // Carte Solde
    const soldeColor = statistiquesMensuelles.solde >= 0 ? colors.success : colors.danger;
    drawRoundedRect(startX + (cardWidth + 10) * 2, startY, cardWidth, cardHeight, 5, soldeColor);
    addText('SOLDE', startX + (cardWidth + 10) * 2 + 5, startY + 10, 10, 'bold', colors.white);
    addText(formaterMontant(statistiquesMensuelles.solde), startX + (cardWidth + 10) * 2 + 5, startY + 22, 11, 'bold', colors.white);
    
    // Tableau récapitulatif
    const tableY = startY + cardHeight + 20;
    drawRoundedRect(20, tableY - 5, 170, 25, 3, colors.light);
    
    addText('Indicateur', 30, tableY + 5, 10, 'bold', colors.dark);
    addText('Montant', 120, tableY + 5, 10, 'bold', colors.dark);
    
    addText('Revenus totaux', 30, tableY + 15, 9, 'normal', colors.dark);
    addText(formaterMontant(statistiquesMensuelles.total_revenus), 120, tableY + 15, 9, 'bold', colors.success);
    
    addText('Dépenses totales', 30, tableY + 25, 9, 'normal', colors.dark);
    addText(formaterMontant(statistiquesMensuelles.total_depenses), 120, tableY + 25, 9, 'bold', colors.danger);
    
    // 4. 💰 DÉTAIL DES REVENUS (Nouvelle page)
    doc.addPage();
    
    addText('DÉTAIL DES REVENUS', 20, 25, 16, 'bold', colors.primary);
    drawDecorativeLine(20, 30, 170, colors.primary);
    
    if (revenusParCategorie && revenusParCategorie.length > 0) {
      // En-tête du tableau
      const revenusTableY = 45;
      drawRoundedRect(20, revenusTableY - 5, 170, 15, 3, colors.success);
      
      addText('Catégorie', 30, revenusTableY + 2, 10, 'bold', colors.white);
      addText('Montant', 100, revenusTableY + 2, 10, 'bold', colors.white);
      addText('Pourcentage', 140, revenusTableY + 2, 10, 'bold', colors.white);
      
      // Lignes du tableau
      let yPos = revenusTableY + 15;
      revenusParCategorie.forEach((revenu, index) => {
        if (yPos > 250) {
          doc.addPage();
          yPos = 20;
        }
        
        const bgColor = index % 2 === 0 ? [248, 249, 250] : [255, 255, 255];
        drawRoundedRect(20, yPos - 3, 170, 12, 2, bgColor);
        
        addText(nettoyerTexte(revenu.nom_categorie, 20), 30, yPos + 2, 9, 'normal', colors.dark);
        addText(formaterMontant(revenu.montant_total), 100, yPos + 2, 9, 'bold', colors.success);
        
        const pourcentage = statistiquesMensuelles.total_revenus > 0 ? 
          ((parseFloat(revenu.montant_total) / statistiquesMensuelles.total_revenus) * 100).toFixed(1) : 0;
        addText(pourcentage + '%', 140, yPos + 2, 9, 'normal', colors.dark);
        
        yPos += 12;
      });
    } else {
      addText('Aucun revenu enregistré pour cette période', 30, 60, 10, 'normal', colors.dark);
    }
    
    // 5. 🧾 DÉTAIL DES DÉPENSES (Nouvelle page)
    doc.addPage();
    
    addText('DÉTAIL DES DÉPENSES', 20, 25, 16, 'bold', colors.primary);
    drawDecorativeLine(20, 30, 170, colors.primary);
    
    if (depensesParCategorie && depensesParCategorie.length > 0) {
      // En-tête du tableau
      const depensesTableY = 45;
      drawRoundedRect(20, depensesTableY - 5, 170, 15, 3, colors.danger);
      
      addText('Catégorie', 30, depensesTableY + 2, 10, 'bold', colors.white);
      addText('Montant', 100, depensesTableY + 2, 10, 'bold', colors.white);
      addText('Pourcentage', 140, depensesTableY + 2, 10, 'bold', colors.white);
      
      // Lignes du tableau
      let yPos = depensesTableY + 15;
      depensesParCategorie.forEach((depense, index) => {
        if (yPos > 250) {
          doc.addPage();
          yPos = 20;
        }
        
        const bgColor = index % 2 === 0 ? [248, 249, 250] : [255, 255, 255];
        drawRoundedRect(20, yPos - 3, 170, 12, 2, bgColor);
        
        addText(nettoyerTexte(depense.nom_categorie, 20), 30, yPos + 2, 9, 'normal', colors.dark);
        addText(formaterMontant(depense.montant_total), 100, yPos + 2, 9, 'bold', colors.danger);
        const pourcentage = statistiquesMensuelles.total_depenses > 0 ? 
          ((parseFloat(depense.montant_total) / statistiquesMensuelles.total_depenses) * 100).toFixed(1) : 0;
        addText(pourcentage + '%', 140, yPos + 2, 9, 'normal', colors.dark);
        
        yPos += 12;
      });
    } else {
      addText('Aucune dépense enregistrée pour cette période', 30, 60, 10, 'normal', colors.dark);
    }
    
    // 5.5. 💰 DÉTAIL DES REVENUS (Nouvelle page)
    doc.addPage();
    
    addText('DÉTAIL DES REVENUS', 20, 25, 16, 'bold', colors.primary);
    drawDecorativeLine(20, 30, 170, colors.primary);
    
    if (revenusParCategorie && revenusParCategorie.length > 0) {
      // En-tête du tableau
      const revenusTableY = 45;
      drawRoundedRect(20, revenusTableY - 5, 170, 15, 3, colors.success);
      
      addText('Catégorie', 30, revenusTableY + 2, 10, 'bold', colors.white);
      addText('Montant', 100, revenusTableY + 2, 10, 'bold', colors.white);
      addText('Pourcentage', 140, revenusTableY + 2, 10, 'bold', colors.white);
      
      // Lignes du tableau
      let yPos = revenusTableY + 15;
      revenusParCategorie.forEach((revenu, index) => {
        if (yPos > 250) {
          doc.addPage();
          yPos = 20;
        }
        
        const bgColor = index % 2 === 0 ? [248, 249, 250] : [255, 255, 255];
        drawRoundedRect(20, yPos - 3, 170, 12, 2, bgColor);
        
        addText(nettoyerTexte(revenu.nom_categorie, 20), 30, yPos + 2, 9, 'normal', colors.dark);
        addText(formaterMontant(revenu.montant_total), 100, yPos + 2, 9, 'bold', colors.success);
        const pourcentage = statistiquesMensuelles.total_revenus > 0 ? 
          ((parseFloat(revenu.montant_total) / statistiquesMensuelles.total_revenus) * 100).toFixed(1) : 0;
        addText(pourcentage + '%', 140, yPos + 2, 9, 'normal', colors.dark);
        
        yPos += 12;
      });
    } else {
      addText('Aucun revenu enregistré pour cette période', 30, 60, 10, 'normal', colors.dark);
    }
    
    // 6. 📈 ANALYSE DES ÉCARTS (Nouvelle page)
    doc.addPage();
    
    addText('ANALYSE DES ÉCARTS', 20, 25, 16, 'bold', colors.primary);
    drawDecorativeLine(20, 30, 170, colors.primary);
    
    // Calcul des écarts
    const solde = statistiquesMensuelles.solde;
    const ratioRevenusDepenses = statistiquesMensuelles.total_depenses > 0 ? 
      (statistiquesMensuelles.total_revenus / statistiquesMensuelles.total_depenses) : 0;
    
    addText('Explication des écarts significatifs', 20, 45, 12, 'bold', colors.dark);
    
    if (solde >= 0) {
      addText('Excédent financier : Le solde est positif, indiquant une', 20, 55, 10, 'normal', colors.dark);
      addText('gestion financière saine avec des revenus supérieurs aux dépenses.', 20, 62, 10, 'normal', colors.dark);
    } else {
      addText('Déficit financier : Le solde est négatif, nécessitant', 20, 55, 10, 'normal', colors.dark);
      addText('une attention particulière sur la gestion des dépenses.', 20, 62, 10, 'normal', colors.dark);
    }
    
    addText('Ratio revenus/dépenses : ' + ratioRevenusDepenses.toFixed(2), 20, 75, 10, 'normal', colors.dark);
    
    if (ratioRevenusDepenses > 1.2) {
      addText('Excellente performance : Les revenus dépassent largement les dépenses', 20, 85, 10, 'normal', colors.success);
    } else if (ratioRevenusDepenses > 1) {
      addText('Performance correcte : Équilibre positif maintenu', 20, 85, 10, 'normal', colors.warning);
    } else {
      addText('Attention requise : Les dépenses dépassent les revenus', 20, 85, 10, 'normal', colors.danger);
    }
    
    // Graphique en barres simple
    const graphY = 110;
    addText('Répartition visuelle', 20, graphY, 12, 'bold', colors.dark);
    
    const maxValue = Math.max(statistiquesMensuelles.total_revenus, statistiquesMensuelles.total_depenses);
    const barWidth = 150;
    const barHeight = 8;
    
    if (maxValue > 0) {
      // Barre des revenus
      const revenusWidth = (statistiquesMensuelles.total_revenus / maxValue) * barWidth;
      drawRoundedRect(20, graphY + 10, revenusWidth, barHeight, 2, colors.success);
      addText('Revenus', 20, graphY + 25, 10, 'bold', colors.success);
      
      // Barre des dépenses
      const depensesWidth = (statistiquesMensuelles.total_depenses / maxValue) * barWidth;
      drawRoundedRect(20, graphY + 35, depensesWidth, barHeight, 2, colors.danger);
      addText('Dépenses', 20, graphY + 50, 10, 'bold', colors.danger);
    }
    
    // 7. 📌 RECOMMANDATIONS (Nouvelle page)
    doc.addPage();
    
    addText('RECOMMANDATIONS ET CONCLUSIONS', 20, 25, 16, 'bold', colors.primary);
    drawDecorativeLine(20, 30, 170, colors.primary);
    
    addText('Points forts', 20, 45, 12, 'bold', colors.success);
    if (solde >= 0) {
      addText('Gestion financière équilibrée', 20, 55, 10, 'normal', colors.dark);
      addText('Revenus suffisants pour couvrir les dépenses', 20, 62, 10, 'normal', colors.dark);
      addText('Solde positif maintenu', 20, 69, 10, 'normal', colors.dark);
    } else {
      addText('Système de suivi financier en place', 20, 55, 10, 'normal', colors.dark);
      addText('Données complètes disponibles pour analyse', 20, 62, 10, 'normal', colors.dark);
    }
    
    addText('Points d\'attention', 20, 85, 12, 'bold', colors.warning);
    if (solde < 0) {
      addText('Réduire les dépenses non essentielles', 20, 95, 10, 'normal', colors.dark);
      addText('Augmenter les sources de revenus', 20, 102, 10, 'normal', colors.dark);
      addText('Établir un budget mensuel strict', 20, 109, 10, 'normal', colors.dark);
    } else {
      addText('Maintenir cette discipline financière', 20, 95, 10, 'normal', colors.dark);
      addText('Considérer l\'épargne ou l\'investissement', 20, 102, 10, 'normal', colors.dark);
    }
    
    addText('Recommandations', 20, 125, 12, 'bold', colors.primary);
    addText('Continuer le suivi régulier des transactions', 20, 135, 10, 'normal', colors.dark);
    addText('Analyser les tendances sur plusieurs mois', 20, 142, 10, 'normal', colors.dark);
    addText('Établir des objectifs financiers mensuels', 20, 149, 10, 'normal', colors.dark);
    
    // Pied de page
    const footerY = 250;
    drawRoundedRect(20, footerY, 170, 25, 3, colors.light);
    addText('Rapport généré le : ' + formaterDate(new Date().toISOString()), 30, footerY + 10, 9, 'normal', colors.dark);
    addText('MoneyWise - Votre partenaire financier', 30, footerY + 20, 9, 'normal', colors.primary);

    // Définir les headers pour le téléchargement
    const nomFichier = `rapport_mensuel_${year}_${month.toString().padStart(2, '0')}.pdf`;
    
    try {
      const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${nomFichier}"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      
      res.send(pdfBuffer);
    } catch (error) {
      console.error('Erreur génération rapport PDF:', error);
      return res.status(500).json({
        message: 'Erreur lors de la génération du rapport PDF'
      });
    }
  } catch (erreur) {
    next(erreur);
  }
});

// Générer un rapport mensuel
router.get('/report/monthly/:year/:month', async (req, res, next) => {
  try {
    const { year, month } = req.params;

    // Validation des paramètres
    const validation = validerParametresRapportMensuel({ year, month });
    if (!validation.valide) {
      return res.status(400).json({
        message: 'Paramètres invalides',
        erreurs: validation.erreurs
      });
    }
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

    // Obtenir les revenus par catégorie
    const revenusParCategorie = await Transaction.obtenirRevenusParCategorie(
      req.utilisateur_id,
      dateDebut,
      dateFin
    );

    // Obtenir les transactions du mois avec les catégories
    const transactions = await Transaction.trouverParUtilisateurAvecCategories(req.utilisateur_id, {
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
      const donneesResume = `Revenus totaux,${donneesRapport.resume.revenusTotaux}\n`;
      const donneesResume2 = `Dépenses totales,${donneesRapport.resume.depensesTotales}\n`;
      const donneesResume3 = `Solde,${donneesRapport.resume.solde}\n`;
      const donneesResume4 = `Nombre de transactions,${donneesRapport.resume.nombreTotalTransactions}\n\n`;
      
      const enTeteCategories = 'Dépenses par catégorie\n';
      const donneesCategories = 'Catégorie,Montant,Pourcentage,Nombre de transactions\n';
      const lignesCategories = donneesRapport.depensesParCategorie.map(element => 
        `${element.categorie},${element.montant},${element.pourcentage}%,${element.nombreTransactions}`
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
      const donneesResume = `Revenus totaux,${donneesRapport.resume.revenusTotaux}\n`;
      const donneesResume2 = `Dépenses totales,${donneesRapport.resume.depensesTotales}\n`;
      const donneesResume3 = `Solde,${donneesRapport.resume.solde}\n`;
      const donneesResume4 = `Revenus mensuels moyens,${donneesRapport.resume.revenusMensuelsMoyens.toFixed(2)}\n`;
      const donneesResume5 = `Dépenses mensuelles moyennes,${donneesRapport.resume.depensesMensuellesMoyennes.toFixed(2)}\n\n`;
      
      const enTeteMensuel = 'Évolution mensuelle\n';
      const donneesMensuel = 'Mois,Revenus,Dépenses,Solde\n';
      const lignesMensuel = donneesRapport.repartitionMensuelle.map(element => 
        `${element.mois},${element.revenus},${element.depenses},${element.solde}`
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

// ========================================
// FONCTIONS DE VALIDATION
// ========================================

/**
 * Valide une date au format YYYY-MM-DD
 * @param {string} dateString - Date à valider
 * @returns {boolean} True si la date est valide
 */
function validerDate(dateString) {
  try {
    if (!dateString || typeof dateString !== 'string') return false;
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return false;
    
    // Vérifier que la date correspond au format YYYY-MM-DD
    const parts = dateString.split('-');
    if (parts.length !== 3) return false;
    
    const year = parseInt(parts[0]);
    const month = parseInt(parts[1]);
    const day = parseInt(parts[2]);
    
    if (year < 1900 || year > 2100) return false;
    if (month < 1 || month > 12) return false;
    if (day < 1 || day > 31) return false;
    
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Valide les paramètres d'export
 * @param {Object} params - Paramètres à valider
 * @returns {Object} Résultat de validation
 */
function validerParametresExport(params) {
  const { startDate, endDate, type } = params;
  const erreurs = [];
  
  // Validation des dates
  if (!startDate) {
    erreurs.push('Date de début requise');
  } else if (!validerDate(startDate)) {
    erreurs.push('Format de date de début invalide (utilisez YYYY-MM-DD)');
  }
  
  if (!endDate) {
    erreurs.push('Date de fin requise');
  } else if (!validerDate(endDate)) {
    erreurs.push('Format de date de fin invalide (utilisez YYYY-MM-DD)');
  }
  
  // Validation de la cohérence des dates
  if (startDate && endDate && validerDate(startDate) && validerDate(endDate)) {
    const dateDebut = new Date(startDate);
    const dateFin = new Date(endDate);
    
    if (dateDebut > dateFin) {
      erreurs.push('La date de début ne peut pas être postérieure à la date de fin');
    }
    
    // Vérifier que la période n'est pas trop longue (max 5 ans)
    const diffTime = Math.abs(dateFin - dateDebut);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const maxDays = 365 * 5; // 5 ans
    
    if (diffDays > maxDays) {
      erreurs.push('La période ne peut pas dépasser 5 ans');
    }
  }
  
  // Validation du type
  if (type && !['revenu', 'depense'].includes(type)) {
    erreurs.push('Type invalide (doit être "revenu" ou "depense")');
  }
  
  return {
    valide: erreurs.length === 0,
    erreurs
  };
}

/**
 * Valide les paramètres de rapport mensuel
 * @param {Object} params - Paramètres à valider
 * @returns {Object} Résultat de validation
 */
function validerParametresRapportMensuel(params) {
  const { year, month } = params;
  const erreurs = [];
  
  // Validation de l'année
  if (!year) {
    erreurs.push('Année requise');
  } else {
    const yearNum = parseInt(year);
    if (isNaN(yearNum) || yearNum < 1900 || yearNum > 2100) {
      erreurs.push('Année invalide (doit être entre 1900 et 2100)');
    }
  }
  
  // Validation du mois
  if (!month) {
    erreurs.push('Mois requis');
  } else {
    const monthNum = parseInt(month);
    if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      erreurs.push('Mois invalide (doit être entre 1 et 12)');
    }
  }
  
  return {
    valide: erreurs.length === 0,
    erreurs
  };
}

// ========================================
// FONCTIONS UTILITAIRES POUR L'EXPORT
// ========================================

/**
 * Formate une date au format J-M-AAAA
 * @param {string} dateString - Date au format ISO ou autre
 * @returns {string} Date formatée
 */
function formaterDate(dateString) {
  try {
    if (!dateString) return 'Date invalide';
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Date invalide';
    
    const jour = date.getDate();
    const mois = date.getMonth() + 1;
    const annee = date.getFullYear();
    
    return `${jour}-${mois}-${annee}`;
  } catch (error) {
    console.error('Erreur formatage date:', error);
    return 'Date invalide';
  }
}

/**
 * Formate un montant en FCFA
 * @param {number|string} montant - Montant à formater
 * @returns {string} Montant formaté
 */
function formaterMontant(montant) {
  try {
    if (montant === null || montant === undefined || montant === '') {
      return '0 FCFA';
    }
    
    // Nettoyer le montant si c'est une chaîne avec des caractères spéciaux
    let montantNettoye = montant;
    if (typeof montant === 'string') {
      // Supprimer les espaces, les /, et autres caractères non numériques sauf le point et la virgule
      montantNettoye = montant.replace(/[^\d.,]/g, '');
      // Remplacer la virgule par un point pour la conversion
      montantNettoye = montantNettoye.replace(',', '.');
    }
    
    const montantNum = parseFloat(montantNettoye);
    if (isNaN(montantNum)) {
      return '0 FCFA';
    }
    
    // Formater avec séparateurs de milliers
    const montantFormate = Math.abs(montantNum).toLocaleString('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
    
    return `${montantFormate} FCFA`;
  } catch (error) {
    console.error('Erreur formatage montant:', error);
    return '0 FCFA';
  }
}

/**
 * Nettoie et tronque un texte pour l'affichage
 * @param {string} texte - Texte à nettoyer
 * @param {number} maxLength - Longueur maximale
 * @returns {string} Texte nettoyé
 */
function nettoyerTexte(texte, maxLength = 50) {
  try {
    if (!texte) return '';
    
    // Convertir en string si ce n'est pas déjà le cas
    let texteString = String(texte);
    
    // Supprimer les caractères spéciaux problématiques
    texteString = texteString
      .replace(/[^\w\s\-.,!?()]/g, '') // Garder seulement les caractères sûrs
      .replace(/\s+/g, ' ') // Remplacer les espaces multiples
      .trim();
    
    // Tronquer si nécessaire
    if (texteString.length > maxLength) {
      texteString = texteString.substring(0, maxLength - 3) + '...';
    }
    
    return texteString;
  } catch (error) {
    console.error('Erreur nettoyage texte:', error);
    return '';
  }
}

/**
 * Valide et nettoie une transaction
 * @param {Object} transaction - Transaction à valider
 * @returns {Object} Transaction validée
 */
function validerTransaction(transaction) {
  try {
    if (!transaction) {
      return {
        id: 'N/A',
        date: 'Date invalide',
        type: 'inconnu',
        montant: 0,
        categorie: 'Non catégorisé',
        description: 'Aucune description'
      };
    }
    
    // Amélioration de la gestion des catégories
    let categorie = 'Non catégorisé';
    if (transaction.nom_categorie && transaction.nom_categorie.trim() !== '') {
      categorie = transaction.nom_categorie.trim();
    } else if (transaction.categorie && transaction.categorie.trim() !== '') {
      categorie = transaction.categorie.trim();
    }
    
    // Amélioration de la gestion des descriptions
    let description = 'Aucune description';
    if (transaction.description && transaction.description.trim() !== '') {
      description = transaction.description.trim();
    }
    
    return {
      id: transaction.id || 'N/A',
      date: transaction.date_transaction || transaction.date || 'Date invalide',
      type: transaction.type || 'inconnu',
      montant: parseFloat(transaction.montant) || 0,
      categorie: categorie,
      description: description
    };
  } catch (error) {
    console.error('Erreur validation transaction:', error);
    return {
      id: 'N/A',
      date: 'Date invalide',
      type: 'inconnu',
      montant: 0,
      categorie: 'Non catégorisé',
      description: 'Aucune description'
    };
  }
}

/**
 * Vérifie si une URL d'image est valide
 * @param {string} url - URL à vérifier
 * @returns {boolean} True si l'URL est valide
 */
function estUrlImageValide(url) {
  try {
    if (!url || typeof url !== 'string') return false;
    
    // Vérifier que c'est une URL valide
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch (error) {
    return false;
  }
}

// ========================================
// ROUTES D'EXPORT
// ========================================

module.exports = router;
