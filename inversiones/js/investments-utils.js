(function investmentsUtilsModule(global) {
  'use strict';

  const namespace = global.CashiroInvestments = global.CashiroInvestments || {};

  namespace.config = Object.freeze({
    spaceId: 'crossfit-box',
    allowedRoles: Object.freeze(['admin', 'investor', 'manager'])
  });

  function categorizeFirebaseError(error) {
    const code = error && error.code ? error.code : '';
    if (code === 'permission-denied' || code === 'firestore/permission-denied') {
      return 'permission-denied';
    }
    if (code === 'unavailable' || code === 'firestore/unavailable') {
      return 'unavailable';
    }
    if (code === 'auth/network-request-failed' || code === 'network-request-failed') {
      return 'network-request-failed';
    }
    return 'unexpected';
  }

  namespace.utils = Object.freeze({
    getDisplayName(user) {
      if (!user) return 'Usuario';
      return user.displayName || user.email || 'Usuario';
    },

    categorizeFirebaseError,

    friendlyFirebaseError(error) {
      const code = error && error.code ? error.code : '';
      const category = categorizeFirebaseError(error);

      if (code === 'auth/popup-blocked') {
        return 'El navegador bloqueó la ventana de acceso de Google.';
      }
      if (code === 'auth/popup-closed-by-user') {
        return 'Se cerró la ventana antes de completar el acceso.';
      }
      if (category === 'network-request-failed') {
        return 'No hay conexión disponible para validar la cuenta.';
      }
      if (category === 'permission-denied') {
        return 'Firestore rechazó la consulta de acceso.';
      }
      if (category === 'unavailable') {
        return 'Firestore no está disponible temporalmente.';
      }
      return 'Ocurrió un error inesperado al verificar el acceso.';
    }
  });
})(window);
