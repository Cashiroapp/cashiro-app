(function investmentsAppModule(global) {
  'use strict';

  const app = global.CashiroInvestments;
  let authReady = false;
  let verificationCounter = 0;

  function invalidateVerifications() {
    verificationCounter += 1;
  }

  function isCurrentVerification(verificationId, user) {
    const currentUser = global.firebase.auth().currentUser;
    return verificationId === verificationCounter
      && Boolean(currentUser)
      && currentUser.uid === user.uid;
  }

  function showState(status) {
    document.querySelectorAll('[data-access-state]').forEach(element => {
      element.classList.toggle('is-visible', element.dataset.accessState === status);
    });
  }

  function render(state) {
    showState(state.status);

    if (state.status === 'no-membership' && state.user) {
      document.getElementById('no-membership-email').textContent = state.user.email || '';
    }

    if (state.status === 'denied') {
      const messages = {
        'non-google-session': 'Esta sesión no fue iniciada con Google. Cambia de cuenta para continuar.',
        'disabled-membership': 'La membresía de esta cuenta se encuentra desactivada.',
        'invalid-membership': 'La membresía no contiene una configuración de roles válida.'
      };
      document.getElementById('denied-detail').textContent =
        messages[state.denialReason] || 'No se encontró un rol válido para esta membresía.';
    }

    if (state.status === 'error') {
      const presentations = {
        'permission-denied': {
          title: 'Consulta de acceso rechazada',
          message: 'Firestore rechazó la consulta de acceso. Verifica que las reglas de Inversiones estén configuradas.'
        },
        unavailable: {
          title: 'Conexión temporalmente no disponible',
          message: 'Firestore no está disponible temporalmente. Intenta nuevamente en unos minutos.'
        },
        'network-request-failed': {
          title: 'Sin conexión',
          message: 'No fue posible conectar con Firebase. Revisa tu conexión e intenta nuevamente.'
        },
        unexpected: {
          title: 'No fue posible verificar el acceso',
          message: 'Ocurrió un error inesperado. Tus finanzas personales no se han modificado.'
        }
      };
      const presentation = presentations[state.errorCategory] || presentations.unexpected;
      document.getElementById('access-error-title').textContent = presentation.title;
      document.getElementById('access-error-message').textContent = presentation.message;
      document.getElementById('connection-error-detail').textContent = '';
    }

    if (state.status === 'allowed') {
      const roles = app.permissions.normalizeRoles(state.membership);
      document.getElementById('welcome-title').textContent =
        `Hola, ${app.utils.getDisplayName(state.user)}`;
      document.getElementById('welcome-email').textContent = state.user.email || '';
      document.getElementById('space-name').textContent =
        (state.space && state.space.name) || 'Box de CrossFit';

      document.querySelectorAll('[data-role-panel]').forEach(panel => {
        panel.classList.toggle('is-visible', roles.includes(panel.dataset.rolePanel));
      });
    }
  }

  async function verifyMembership(user) {
    const verificationId = ++verificationCounter;

    if (!user) {
      app.state.set({
        status: 'signed-out',
        user: null,
        membership: null,
        space: null,
        error: null,
        errorCategory: null,
        denialReason: null
      });
      return;
    }

    app.state.set({
      status: 'loading',
      user,
      membership: null,
      space: null,
      error: null,
      errorCategory: null,
      denialReason: null
    });

    try {
      const isGoogleSession = await app.investmentsAuth.isGoogleSession(user);
      if (!isCurrentVerification(verificationId, user)) return;

      if (!isGoogleSession) {
        app.state.set({
          status: 'denied',
          user,
          membership: null,
          space: null,
          error: null,
          errorCategory: null,
          denialReason: 'non-google-session'
        });
        return;
      }

      const membership = await app.repository.getMembership(app.config.spaceId, user.uid);
      if (!isCurrentVerification(verificationId, user)) return;

      const access = app.permissions.evaluate(membership);
      if (!access.allowed) {
        app.state.set({
          status: access.reason === 'no-membership' ? 'no-membership' : 'denied',
          user,
          membership,
          space: null,
          error: null,
          errorCategory: null,
          denialReason: access.reason
        });
        return;
      }

      const space = await app.repository.getSpace(app.config.spaceId);
      if (!isCurrentVerification(verificationId, user)) return;

      app.state.set({
        status: 'allowed',
        user,
        membership,
        space,
        error: null,
        errorCategory: null,
        denialReason: null
      });
    } catch (error) {
      if (!isCurrentVerification(verificationId, user)) return;
      const errorCategory = app.utils.categorizeFirebaseError(error);
      console.error(`[INVESTMENTS_ACCESS_${errorCategory.toUpperCase()}]`, error);
      app.state.set({
        status: 'error',
        user,
        membership: null,
        space: null,
        error,
        errorCategory,
        denialReason: null
      });
    }
  }

  async function handleGoogleLogin() {
    const errorElement = document.getElementById('login-error');
    errorElement.textContent = '';

    try {
      app.state.set({ status: 'loading', error: null });
      await app.investmentsAuth.signInWithGoogle();
    } catch (error) {
      const errorCategory = app.utils.categorizeFirebaseError(error);
      console.error(`[INVESTMENTS_LOGIN_${errorCategory.toUpperCase()}]`, error);
      app.state.set({ status: 'signed-out', error, errorCategory });
      errorElement.textContent = app.utils.friendlyFirebaseError(error);
    }
  }

  async function handleSignOut() {
    try {
      invalidateVerifications();
      app.state.set({ status: 'loading', error: null });
      await app.investmentsAuth.signOut();
    } catch (error) {
      const errorCategory = app.utils.categorizeFirebaseError(error);
      console.error(`[INVESTMENTS_LOGOUT_${errorCategory.toUpperCase()}]`, error);
      app.state.set({ status: 'error', error, errorCategory });
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    app.state.subscribe(render);

    document.getElementById('btn-google-login')
      .addEventListener('click', handleGoogleLogin);

    document.getElementById('btn-retry')
      .addEventListener('click', () => verifyMembership(global.firebase.auth().currentUser));

    document.querySelectorAll('[data-action="sign-out"]').forEach(button => {
      button.addEventListener('click', handleSignOut);
    });

    app.investmentsAuth.observeSession(user => {
      authReady = true;
      invalidateVerifications();
      verifyMembership(user);
    });

    global.setTimeout(() => {
      if (!authReady) {
        const error = { code: 'auth/network-request-failed' };
        console.error('[INVESTMENTS_AUTH_NETWORK-REQUEST-FAILED]', error);
        app.state.set({
          status: 'error',
          error,
          errorCategory: 'network-request-failed'
        });
      }
    }, 10000);
  });
})(window);
