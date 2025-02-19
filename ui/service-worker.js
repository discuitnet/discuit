const SW_BUILD_ID = import.meta.env.VITE_SW_BUILD_ID;

// Log the service-worker version for debugging.
console.log(`Service worker version: ${SW_BUILD_ID}`);

const cacheEndpoints = async (urls = []) => {
  const cache = await caches.open(SW_BUILD_ID);
  await cache.addAll(urls);
};

const putInCache = async (request, response) => {
  // If the headers contain an x-service-worker-cache header or if the response
  // code isn't in the range of 2xx, then the file is not cached, even if it
  // meets prior criteria for caching.
  if (response.ok && !response.headers.has('X-Service-Worker-Cache')) {
    // Note that the argument to headers.has() in the above line is
    // case-insensitive. In HTTP/2, all headers are lowercased in any case
    // before they are transmitted.
    const cache = await caches.open(SW_BUILD_ID);
    await cache.put(request, response);
  }
};

self.addEventListener('install', (e) => {
  e.waitUntil(cacheEndpoints(['/', '/manifest.json']));
  self.skipWaiting();
});

const enableNavigationPreload = async () => {
  if (self.registration.navigationPreload) {
    await self.registration.navigationPreload.enable();
  }
};

const deleteCache = async (key) => {
  await caches.delete(key);
};

const deleteOldCaches = async () => {
  const cacheKeepList = [SW_BUILD_ID];
  const keyList = await caches.keys();
  const cachesToDelete = keyList.filter((key) => !cacheKeepList.includes(key));
  await Promise.all(cachesToDelete.map(deleteCache));
};

self.addEventListener('activate', (e) => {
  e.waitUntil(Promise.all([deleteOldCaches(), enableNavigationPreload()]));
  self.clients.claim();

  // Periodically, check if there are any push notifications that have been
  // marked as seen, and, if any exists, close them.
  self.setInterval(async () => {
    try {
      console.log('Background checking push notifications status (4)');
      await closeSeenNotifications();
    } catch (error) {
      console.log(`Error closeSeenNotifications: ${error}`);
    }
  }, 60000 /* 1 minute */);
});

self.addEventListener('message', (e) => {
  if (e.data === 'skipWaiting') {
    self.skipWaiting();
  }
});

const endsWithOneOf = (searchString, endPositions = []) => {
  for (let i = 0; i < endPositions.length; i++) {
    if (searchString.endsWith(endPositions[i])) {
      return true;
    }
  }
  return false;
};

const fetchRequest = (request) => {
  const headers = new Headers(request.headers);
  headers.set('X-Service-Worker-Version', SW_BUILD_ID);
  return fetch(
    new Request(request, {
      headers,
    })
  );
};

// Returns true if the request is an app asset.
const shouldCache = (request) => {
  if (request.method !== 'GET') {
    return false;
  }
  const url = new URL(request.url, `${self.location.protocol}//${self.location.host}`);
  const { pathname } = url;
  if (pathname.startsWith('/assets/') && endsWithOneOf(pathname, ['.js', '.css'])) {
    return true;
  }
  if (
    endsWithOneOf(pathname, ['.jpg', '.jpeg', '.png', '.svg', '.webp']) &&
    !pathname.startsWith('/images/')
  ) {
    return true;
  }
  return false;
};

const cacheFirst = async ({ request, preloadResponsePromise }) => {
  // See if a caches response to the request is available. If so, immediately
  // respond with that.
  const cachedRes = await caches.match(request);
  if (cachedRes) {
    return cachedRes;
  }

  // Next try to use (and cache) the preloaded response, if it exists. And if it
  // exists, respond with that.
  try {
    const preloadResponse = await preloadResponsePromise;
    if (preloadResponse) {
      if (shouldCache(request)) {
        putInCache(request, preloadResponse.clone());
      }
      return preloadResponse;
    }
  } catch (error) {
    console.error(error);
  }

  try {
    const networkRes = await fetchRequest(request);
    if (shouldCache(request)) {
      putInCache(request, networkRes.clone());
    }
    return networkRes;
  } catch (error) {
    console.error(error);
    if (request.method === 'GET' && request.headers.get('accept').includes('text/html')) {
      const cache = await caches.open(SW_BUILD_ID);
      const fallbackRes = await cache.match('/');
      if (fallbackRes) return fallbackRes;
    }
    return new Response(
      JSON.stringify({
        status: 408,
        code: 'network_error',
      }),
      {
        status: 408,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};

self.addEventListener('fetch', (e) => {
  e.respondWith(cacheFirst({ request: e.request, preloadResponsePromise: e.preloadResponse }));
});

const getNotificationInfo = (notification, csrfToken) => {
  let icon = '';
  if (notification.icons !== null) {
    icon = notification.icons[0];
  }
  return {
    title: notification.title,
    options: {
      body: notification.body,
      icon,
      badge: '/discuit-logo-pwa-badge.png',
      tag: notification.id,
      data: {
        notificationId: notification.id,
        toURL: notification.toURL,
        csrfToken,
      },
    },
  };
};

const isClientFocused = async () => {
  const windowClients = await clients.matchAll({
    type: 'window',
    includeUncontrolled: true,
  });
  let clientIsFocused = false;
  for (let i = 0; i < windowClients.length; i++) {
    const windowClient = windowClients[i];
    if (windowClient.focused) {
      clientIsFocused = true;
      break;
    }
  }
  return clientIsFocused;
};

self.addEventListener('push', (e) => {
  const f = async () => {
    try {
      if (await isClientFocused()) {
        return;
      }
      const pushNotif = e.data.json();
      const res = await fetch(`/api/notifications/${pushNotif.id}?render=true`);
      if (!res.ok) {
        console.log('notification error');
        return;
      }
      const info = getNotificationInfo(await res.json(), res.headers.get('Csrf-Token'));
      return self.registration.showNotification(info.title, info.options);
    } catch (error) {
      console.error(error);
    }
  };
  e.waitUntil(f());
});

self.addEventListener('notificationclick', (e) => {
  const { notification } = e;
  const { data } = notification;
  notification.close();
  const markAsSeen = async () => {
    try {
      const res = await fetch(
        `/api/notifications/${data.notificationId}?action=markAsSeen&seenFrom=webpush`,
        {
          method: 'PUT',
          headers: {
            'X-Csrf-Token': data.csrfToken,
          },
        }
      );
      if (!res.ok) {
        throw new Error(await res.text());
      }
    } catch (error) {
      console.log(error);
    }
  };
  e.waitUntil(Promise.all([markAsSeen(), self.clients.openWindow(data.toURL)]));
});

/**
 * Closes all push notifications that have been marked as seen (presumably by
 * another device on which the user is logged in, because otherwise the push
 * notification wouldn't be here).
 *
 */
const closeSeenNotifications = async () => {
  const existingNotifs = await self.registration.getNotifications();
  if (existingNotifs.length === 0) {
    return;
  }
  const res = await (await fetch('/api/notifications?render=true')).json();
  const notifs = res.items || [];
  existingNotifs.forEach((exNotif) => {
    for (let i = 0; i < notifs.length; i++) {
      if (exNotif.data.notificationId === notifs[i].id && notifs[i].seen) {
        console.log(
          `Background closing notification (it was marked as seen by another device): ${notifs[i].id}`
        );
        exNotif.close();
      }
    }
  });
};
