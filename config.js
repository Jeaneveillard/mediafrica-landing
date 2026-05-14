const CONFIG = {
    paypal: {
        handle: 'TON_COMPTE_PAYPAL', // ex: 'mediafrica' → paypal.me/mediafrica
        currency: 'CAD'
    },
    firebase: {
        apiKey: '',
        authDomain: '',
        projectId: '',
        storageBucket: '',
        messagingSenderId: '',
        appId: ''
    },
    prices: {
        // Clé = nom EXACT du produit tel qu'affiché dans le catalogue (h3)
        // Exemple :
        // "Paracétamol 500mg": 12.99,
        // "Vitamine C 1000mg": 8.99,
        // "Hair Growth Formula": 24.99,
        // Produit absent ici → affiché "Sur devis" dans le panier
    }
};

// Initialise Firebase dès que les clés sont renseignées
if (typeof firebase !== 'undefined' && CONFIG.firebase.apiKey) {
    firebase.initializeApp(CONFIG.firebase);
}
