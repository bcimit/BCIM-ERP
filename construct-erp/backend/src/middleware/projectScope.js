// src/middleware/projectScope.js
// Provides project-level access scoping helpers for non-global roles.

const { query } = require('../config/database');

// Roles that bypass project-level scoping (see everything in the company).
// Accountant/finance roles need cross-project visibility for AP/payment management.
const GLOBAL_ROLES = [
  'super_admin', 'admin', 'managing_director', 'director', 'ceo', 'cfo', 'md',
  'accountant', 'accounts_manager', 'finance_manager',
];

function isGlobalRole(role) {
  return GLOBAL_ROLES.includes(role);
}

/**
 * Loads the list of project IDs the current user is allowed to access.
 * Attaches `req.allowedProjectIds` (array of UUID strings) and
 * `req.isGlobalRole` (boolean). For global roles, allowedProjectIds is null
 * (meaning "no restriction").
 */
async function loadProjectScope(req, res, next) {
  try {
    if (!req.user) return next();
    if (isGlobalRole(req.user.role)) {
      req.isGlobalRole = true;
      req.allowedProjectIds = null; // no restriction
      return next();
    }
    const r = await query(
      `SELECT DISTINCT p.id
         FROM projects p
        WHERE p.company_id = $1
          AND (
            p.project_manager_id = $2
            OR p.site_engineer_id = $2
            OR p.qs_engineer_id   = $2
            OR EXISTS (SELECT 1 FROM project_members pmx WHERE pmx.project_id = p.id AND pmx.user_id = $2)
          )`,
      [req.user.company_id, req.user.id]
    );
    req.isGlobalRole = false;
    req.allowedProjectIds = r.rows.map(x => x.id);
    return next();
  } catch (err) {
    next(err);
  }
}

/**
 * Verifies the given project_id is in the user's allowed set.
 * Returns true if allowed, false otherwise.
 */
function userCanAccessProject(req, projectId) {
  if (!projectId) return true; // global queries handled by caller via allowedProjectIds
  if (req.isGlobalRole) return true;
  return Array.isArray(req.allowedProjectIds) && req.allowedProjectIds.includes(projectId);
}

/**
 * Appends a project_id scope clause to a SQL string.
 * - For global roles: returns the SQL/params unchanged.
 * - For scoped users: appends `AND <alias>.project_id = ANY($N::uuid[])`
 *   using the user's allowed project IDs.
 * If the user has zero allowed projects, returns a clause that yields no rows.
 *
 * @param {object} req
 * @param {string} sql        existing SQL string (must already have a WHERE)
 * @param {Array}  params     existing params array
 * @param {string} alias      table alias whose column to scope (default 'p' but commonly 'mr', 'g', etc.)
 * @param {string} column     column name (default 'project_id')
 * @returns {{ sql: string, params: Array }}
 */
function appendProjectScope(req, sql, params, alias, column = 'project_id') {
  if (req.isGlobalRole) return { sql, params };
  const ids = req.allowedProjectIds || [];
  if (ids.length === 0) {
    // user has no project access — force empty result
    return { sql: sql + ' AND FALSE', params };
  }
  params = params.slice();
  params.push(ids);
  const idx = params.length;
  return { sql: sql + ` AND ${alias}.${column} = ANY($${idx}::uuid[])`, params };
}

/**
 * Mutates `conditions`/`params` in place to add a project scope clause,
 * honoring an explicit requestedProjectId (validated against access) or
 * falling back to the user's allowed project set. Throws a 403-flagged
 * error if the user requests a project they can't access.
 *
 * @param {object} req
 * @param {Array}  conditions          array of SQL condition strings (mutated)
 * @param {Array}  params              query params array (mutated)
 * @param {string} alias               table alias whose project_id to scope
 * @param {string} requestedProjectId  optional explicit project_id filter
 */
function applyProjectScope(req, conditions, params, alias = 'b', requestedProjectId = null) {
  if (requestedProjectId && String(requestedProjectId).trim()) {
    if (!userCanAccessProject(req, requestedProjectId)) {
      const err = new Error('Access denied for this project.');
      err.statusCode = 403;
      throw err;
    }
    params.push(requestedProjectId);
    conditions.push(`${alias}.project_id = $${params.length}`);
    return;
  }

  if (req.isGlobalRole) return;
  const allowed = req.allowedProjectIds || [];
  if (allowed.length === 0) {
    conditions.push('FALSE');
    return;
  }
  params.push(allowed);
  conditions.push(`${alias}.project_id = ANY($${params.length}::uuid[])`);
}

/**
 * Returns the set of project IDs the request is scoped to: `undefined` for
 * global roles or a validated explicit requestedProjectId (meaning "no
 * restriction needed"), otherwise the user's allowed project ID array.
 * Throws a 403-flagged error if requestedProjectId isn't accessible.
 */
function scopedProjectIds(req, requestedProjectId = null) {
  if (requestedProjectId && String(requestedProjectId).trim()) {
    if (!userCanAccessProject(req, requestedProjectId)) {
      const err = new Error('Access denied for this project.');
      err.statusCode = 403;
      throw err;
    }
    return undefined;
  }
  return req.isGlobalRole ? undefined : (req.allowedProjectIds || []);
}

module.exports = {
  GLOBAL_ROLES,
  isGlobalRole,
  loadProjectScope,
  userCanAccessProject,
  appendProjectScope,
  applyProjectScope,
  scopedProjectIds,
};
