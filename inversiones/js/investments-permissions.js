(function investmentsPermissionsModule(global) {
  'use strict';

  const namespace = global.CashiroInvestments = global.CashiroInvestments || {};

  function normalizeRoles(membership) {
    return membership && Array.isArray(membership.roles)
      ? [...new Set(membership.roles)]
      : [];
  }

  function hasValidMembershipSchema(membership) {
    if (!membership || typeof membership !== 'object') return false;
    if (typeof membership.displayName !== 'string') return false;
    if (typeof membership.email !== 'string') return false;
    if (typeof membership.status !== 'string') return false;
    if (!Array.isArray(membership.roles)) return false;
    if (membership.roles.length < 1 || membership.roles.length > 3) return false;

    return membership.roles.every(role =>
      typeof role === 'string' && namespace.config.allowedRoles.includes(role)
    );
  }

  namespace.permissions = Object.freeze({
    normalizeRoles,
    hasValidMembershipSchema,

    evaluate(membership) {
      if (!membership) {
        return { allowed: false, reason: 'no-membership', roles: [] };
      }

      if (!hasValidMembershipSchema(membership)) {
        return { allowed: false, reason: 'invalid-membership', roles: [] };
      }

      const roles = normalizeRoles(membership);
      if (membership.status !== 'active') {
        return { allowed: false, reason: 'disabled-membership', roles };
      }

      return { allowed: true, reason: 'allowed', roles };
    },

    hasRole(membership, role) {
      return hasValidMembershipSchema(membership)
        && normalizeRoles(membership).includes(role);
    }
  });
})(window);
