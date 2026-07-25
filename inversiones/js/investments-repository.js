(function investmentsRepositoryModule(global) {
  'use strict';

  const namespace = global.CashiroInvestments = global.CashiroInvestments || {};

  function firestore() {
    return global.firebase.firestore();
  }

  namespace.repository = Object.freeze({
    async getMembership(spaceId, uid) {
      const snapshot = await firestore()
        .collection('investmentSpaces')
        .doc(spaceId)
        .collection('members')
        .doc(uid)
        .get();

      return snapshot.exists
        ? { id: snapshot.id, ...snapshot.data() }
        : null;
    },

    async getSpace(spaceId) {
      const snapshot = await firestore()
        .collection('investmentSpaces')
        .doc(spaceId)
        .get();

      return snapshot.exists
        ? { id: snapshot.id, ...snapshot.data() }
        : { id: spaceId, name: 'Box de CrossFit' };
    }
  });
})(window);
