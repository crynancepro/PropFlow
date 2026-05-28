/**
 * Service pour gérer l'intégration des paiements avec NOWPayments pour PropFlow.
 * Par défaut, pour des raisons de sécurité critiques, la clé de l'API est masquée
 * au niveau du serveur Web (/api/nowpayments/invoice) pour éviter de l'exposer dans 
 * le code source client consultable par n'importe quel internaute.
 */

export async function createPremiumInvoice(userId: string): Promise<string> {
  console.log("Initialisation de la création de la facture pour l'utilisateur:", userId);
  
  // Build fallback urls
  const origin = window.location.origin;

  // 1. Essayer d'abord via le serveur de proxy pour sécuriser la clé d'API
  try {
    console.log("Tentative d'appel du proxy serveur: /api/nowpayments/invoice");
    const response = await fetch('/api/nowpayments/invoice', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data && data.invoice_url) {
        console.log("Succès via le proxy! URL de redirection:", data.invoice_url);
        try {
          const newWindow = window.open(data.invoice_url, '_blank', 'noopener,noreferrer');
          if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
            console.warn("L'ouverture automatique de l'onglet indépendant a été bloquée par le navigateur.");
          }
        } catch (openErr) {
          console.error("Erreur de redirection directe par window.open:", openErr);
        }
        return data.invoice_url;
      }
    }
    
    // Si le proxy a retourné un statut d'erreur, on extrait l'erreur pour la console
    const errorText = await response.text().catch(() => "Aucun détail");
    console.warn("Le proxy serveur a retourné une erreur, essai de contournement en direct client-side. Statut:", response.status, "Message:", errorText);
  } catch (proxyError) {
    console.error("Échec de connexion au proxy serveur:", proxyError);
  }

  // 2. Fallback Direct Client-Side (Contournement immédiat demandé par l'utilisateur)
  try {
    const directApiUrl = "https://api.nowpayments.io/v1/invoice";
    const apiKey = "KZ6P654-0TDMKEH-K8BZKF7-B1DBWBM";
    
    console.log("Appel direct de l'API NOWPayments en client-side. URL:", directApiUrl);
    
    const payload = {
      price_amount: 5,
      price_currency: "usd",
      order_id: userId,
      order_description: "Abonnement PropFlow Premium (Direct)",
      success_url: `${origin}/?payment=success`,
      cancel_url: `${origin}/?payment=cancel`
    };

    const response = await fetch(directApiUrl, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Direct NOWPayments response failure:", errorText, "Status:", response.status);
      throw new Error(`Erreur API NOWPayments Direct (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    if (data && data.invoice_url) {
      console.log("Succès via API Direct! Redirection vers:", data.invoice_url);
      try {
        const newWindow = window.open(data.invoice_url, '_blank', 'noopener,noreferrer');
        if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
          console.warn("L'ouverture automatique de l'onglet indépendant direct a été bloquée par le navigateur.");
        }
      } catch (openErr) {
        console.error("Erreur de redirection directe par window.open direct:", openErr);
      }
      return data.invoice_url;
    } else {
      throw new Error("L'API NOWPayments n'a pas retourné d'URL de facture.");
    }
  } catch (directError: any) {
    console.error("Erreur critique d'appel direct client-side à NOWPayments:", directError);
    throw directError;
  }
}

/**
 * Met à jour le statut Premium d'un utilisateur dans Firestore côté client.
 * Servira de secours et de transition solide avant que vous ne configuriez vos Webhoods IPN.
 */
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase-setup';

export async function setPremiumStatusFirestore(userId: string, isPremium: boolean): Promise<void> {
  if (!db) {
    localStorage.setItem(`trading_premium_local_${userId}`, isPremium ? 'true' : 'false');
    return;
  }
  try {
    const userDocRef = doc(db, 'users', userId);
    await updateDoc(userDocRef, { isPremium });
    console.log(`Statut Premium de l'utilisateur ${userId} enregistré dans Firestore: ${isPremium}`);
  } catch (error) {
    console.error("Erreur d'écriture du statut premium:", error);
  }
}
