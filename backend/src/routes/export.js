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

    // Créer le PDF
    const doc = new jsPDF.default();
    
    // Titre
    doc.setFontSize(20);
    doc.text('Rapport des Transactions - MoneyWise', 20, 20);
    
    // Informations de la période
    doc.setFontSize(12);
    doc.text(`Periode : ${startDate} a ${endDate}`, 20, 35);
    doc.text(`Nombre de transactions : ${transactions.length}`, 20, 45);
    
    // En-têtes du tableau
    doc.setFontSize(10);
    doc.text('Date', 20, 60);
    doc.text('Type', 50, 60);
    doc.text('Montant', 80, 60);
    doc.text('Catégorie', 120, 60);
    doc.text('Description', 160, 60);
    
    // Lignes du tableau
    let yPosition = 70;
    transactions.forEach((transaction, index) => {
      if (yPosition > 250) {
        doc.addPage();
        yPosition = 20;
      }
      
      const typeTransaction = transaction.type === 'revenu' ? 'Revenu' : 'Depense';
      const montant = transaction.type === 'revenu' ? `+${transaction.montant}` : `-${transaction.montant}`;
      const categorie = transaction.nom_categorie || 'Non categorise';
      const description = transaction.description || '';
      
      doc.text(String(transaction.date_transaction), 20, yPosition);
      doc.text(String(typeTransaction), 50, yPosition);
      doc.text(String(montant), 80, yPosition);
      doc.text(String(categorie), 120, yPosition);
      doc.text(String(description).substring(0, 30), 160, yPosition);
      
      yPosition += 10;
    });
    
    // Résumé
    const totalRevenus = transactions
      .filter(t => t.type === 'revenu')
      .reduce((sum, t) => sum + parseFloat(t.montant), 0);
    const totalDepenses = transactions
      .filter(t => t.type === 'depense')
      .reduce((sum, t) => sum + parseFloat(t.montant), 0);
    const solde = totalRevenus - totalDepenses;
    
    doc.addPage();
    doc.setFontSize(16);
    doc.text('Résumé', 20, 20);
    doc.setFontSize(12);
    doc.text(`Total Revenus : ${totalRevenus.toFixed(2)} €`, 20, 40);
    doc.text(`Total Depenses : ${totalDepenses.toFixed(2)} €`, 20, 50);
    doc.text(`Solde : ${solde.toFixed(2)} €`, 20, 60);
    doc.text(`Genere le : ${new Date().toLocaleDateString('fr-FR')}`, 20, 80);

    // Définir les headers pour le téléchargement
    const nomFichier = `transactions_${startDate}_${endDate}.pdf`;
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${nomFichier}"`);
    
    res.send(Buffer.from(doc.output('arraybuffer')));
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

module.exports = router;
