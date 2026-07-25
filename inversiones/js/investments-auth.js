(function investmentsAuthModule(global) {
  'use strict';

  const namespace = global.CashiroInvestments = global.CashiroInvestments || {};

  function auth() {
    return global.firebase.auth();
  }

  namespace.investmentsAuth = Object.freeze({
    observeSession(callback) {
      return auth().onAuthStateChanged(callback);
    },

    async isGoogleSession(user) {
      if (!user) return false;
      const tokenResult = await user.getIdTokenResult();
      return Boolean(
        tokenResult.claims
        && tokenResult.claims.firebase
        && tokenResult.claims.firebase.sign_in_provider === 'google.com'
      );
    },

    async signInWithGoogle() {
      const provider = new global.firebase.auth.GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await auth().signInWithPopup(provider);
      return result.user;
    },

    async signOut() {
      await auth().signOut();
    }
  });
})(window);
