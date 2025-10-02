import apiClient from './api';

let statusCache = null;
let inflightRequest = null;
const subscribers = new Set();

const buildStatuses = (rawStatuses = []) => {
  if (!Array.isArray(rawStatuses)) {
    return [];
  }
  return rawStatuses
    .filter((status) => status && typeof status === 'object')
    .map((status) => ({
      application_status_id: status.application_status_id ?? status.status_id ?? status.id ?? null,
      status_code: status.status_code ?? status.code ?? null,
      status_name: status.status_name ?? status.name ?? null,
      raw: status,
    }))
    .filter((status) => status.application_status_id != null);
};

const notify = () => {
  for (const callback of subscribers) {
    try {
      callback(statusCache);
    } catch (error) {
      console.error('[statusService] subscriber error', error);
    }
  }
};

export const statusService = {
  async fetchAll(options = {}) {
    const { force = false } = options;

    if (!force && statusCache) {
      return statusCache;
    }

    if (!inflightRequest || force) {
      inflightRequest = apiClient
        .get('/application-status')
        .then((response) => {
          const statuses = buildStatuses(response.statuses || response.data || []);
          statusCache = statuses;
          notify();
          return statuses;
        })
        .catch((error) => {
          if (!force) {
            throw error;
          }
          throw error;
        })
        .finally(() => {
          inflightRequest = null;
        });
    }

    return inflightRequest;
  },

  getCached() {
    return statusCache;
  },

  subscribe(callback) {
    if (typeof callback !== 'function') {
      return () => {};
    }

    subscribers.add(callback);
    if (statusCache) {
      try {
        callback(statusCache);
      } catch (error) {
        console.error('[statusService] subscriber callback error', error);
      }
    }
    return () => {
      subscribers.delete(callback);
    };
  },
};

export async function getStatusIdByName(statusName) {
  if (!statusName) {
    return undefined;
  }

  const statuses = await statusService.fetchAll();
  const match = statuses.find((status) => status.status_name === statusName);
  return match ? match.application_status_id : undefined;
}

export async function getStatusIdByCode(statusCode) {
  if (statusCode == null) {
    return undefined;
  }

  const statuses = await statusService.fetchAll();
  const normalizedCode = String(statusCode);
  const match = statuses.find((status) => String(status.status_code) === normalizedCode);
  return match ? match.application_status_id : undefined;
}

export function buildStatusMaps(statuses = []) {
  const byId = {};
  const byName = {};

  (Array.isArray(statuses) ? statuses : []).forEach((status) => {
    if (!status || typeof status !== 'object') return;

    const id = status.application_status_id ?? status.status_id;
    const name = status.status_name ?? status.name;
    const code = status.status_code ?? status.code;

    if (id != null) {
      byId[id] = status;
    }

    if (name) {
      byName[name] = status;
    }

    if (code) {
      byName[code] = status;
    }
  });

  return { byId, byName };
}