(function investmentsStateModule(global) {
  'use strict';

  const namespace = global.CashiroInvestments = global.CashiroInvestments || {};
  const listeners = [];

  let current = Object.freeze({
    status: 'loading',
    user: null,
    membership: null,
    space: null,
    error: null
  });

  namespace.state = Object.freeze({
    get() {
      return current;
    },

    set(nextState) {
      current = Object.freeze({ ...current, ...nextState });
      listeners.forEach(listener => listener(current));
    },

    subscribe(listener) {
      listeners.push(listener);
      listener(current);
      return function unsubscribe() {
        const index = listeners.indexOf(listener);
        if (index >= 0) listeners.splice(index, 1);
      };
    }
  });
})(window);
