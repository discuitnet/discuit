import { selectImageCopyURL, stringCount } from './src/helper';

const CACHE_VERSION = CONFIG.cacheStorageVersion;

const cacheEndpoints = async (urls = []) => {
  const cache = await caches.open(CACHE_VERSION);
  await cache.addAll(urls);
};

const putInCache = async (request, response) => {
  const cache = await caches.open(CACHE_VERSION);
  await cache.put(request, response);
};

self.addEventListener('install', (e) => {
  e.waitUntil(cacheEndpoints(['/', '/manifest.json']));
  self.skipWaiting();
});

// Enable navigation preload.
const enableNavigationPreload = async () => {
  if (self.registration.navigationPreload) {
    await self.registration.navigationPreload.enable();
  }
};

const deleteCache = async (key) => {
  await caches.delete(key);
};

const deleteOldCaches = async () => {
  const cacheKeepList = [CACHE_VERSION];
  const keyList = await caches.keys();
  const cachesToDelete = keyList.filter((key) => !cacheKeepList.includes(key));
  await Promise.all(cachesToDelete.map(deleteCache));
};

self.addEventListener('activate', (e) => {
  e.waitUntil(Promise.all([deleteOldCaches(), enableNavigationPreload()]));
  self.clients.claim();
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

// Returns true if the request is an app asset.
const shouldCache = (request) => {
  if (request.method !== 'GET') {
    return false;
  }

  const url = new URL(request.url, `${self.location.protocol}//${self.location.host}`);
  const { pathname } = url;

  if (pathname.startsWith('/app.') && endsWithOneOf(pathname, ['.js', '.css'])) {
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
  const cachedRes = await caches.match(request);
  if (cachedRes) {
    return cachedRes;
  }

  // Next try to use (and cache) the preloaded response, if it's there
  try {
    const preloadResponse = await preloadResponsePromise;
    if (preloadResponse) {
      if (shouldCache(request)) {
        putInCache(request, preloadResponse.clone());
      }
      return preloadResponse;
    }
  } catch (_) {}

  try {
    const networkRes = await fetch(request);
    if (shouldCache(request)) {
      putInCache(request, networkRes.clone());
    }
    return networkRes;
  } catch (error) {
    if (request.method === 'GET' && request.headers.get('accept').includes('text/html')) {
      const cache = await caches.open(CACHE_VERSION);
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
  const { type, notif } = notification;

  const ret = {
    title: '',
    options: {
      body: '',
      icon: '',
      badge: '/discuit-logo-pwa-badge.png',
      tag: notification.id,
      data: {
        notificationId: notification.id,
        toURL: undefined,
        csrfToken,
      },
    },
  };

  const setImage = (url) => {
    ret.options.icon = url;
    // ret.options.badge = '/favicon.png';
  };

  const maxText = (text = '', maxLength = 120) => {
    if (text.length > maxLength) {
      return text.substring(0, maxLength) + '...';
    }
    return text;
  };

  const setToURL = (to = '') => {
    ret.options.data.toURL = to;
  };

  setImage('/favicon.png');

  switch (type) {
    case 'new_comment':
      {
        let to = `/${notif.post.communityName}/post/${notif.post.publicId}`;
        if (notif.noComments === 1) {
          ret.title = `@${notif.commentAuthor} commented on your post '${notif.post.title}'`;
          to += `/${notif.commentId}`;
        } else {
          ret.title = `${notif.noComments} new comments on your post '${notif.post.title}'`;
        }
        setToURL(to);
      }
      break;
    case 'comment_reply':
      {
        let to = `/${notif.post.communityName}/post/${notif.post.publicId}`;
        if (notif.noComments === 1) {
          ret.title = `@${notif.commentAuthor} replied to your comment on post '${notif.post.title}'`;
          to += `/${notif.commentId}`;
        } else {
          ret.title = `${notif.noComments} new replies to your comment on post '${notif.post.title}'`;
        }
        setToURL(to);
      }
      break;
    case 'new_votes':
      if (notif.targetType === 'post') {
        ret.title = `${stringCount(notif.noVotes, false, 'new upvote')} on your post '${
          notif.post.title
        }'`;
        setToURL(`/${notif.post.communityName}/post/${notif.post.publicId}`);
      } else {
        ret.title = `${stringCount(notif.noVotes, false, 'new vote')} on your comment in '${
          notif.post.title
        }'`;
        setToURL(
          `/${notif.comment.communityName}/post/${notif.comment.postPublicId}/${notif.comment.id}`
        );
      }
      break;
    case 'deleted_post':
      const by =
        notif.deletedAs === 'mods' ? `moderators of ${notif.post.communityName}` : 'admins';
      ret.title = `Your post '${notif.post.title}' has been removed by the ${by}`;
      setToURL(`/${notif.post.communityName}/post/${notif.post.publicId}`);
      break;
    case 'mod_add':
      ret.title = `You are added as a moderator of /${notif.communityName} by @${notif.addedBy}`;
      setToURL(`/${notif.post.communityName}/post/${notif.post.publicId}`);
      break;
    default: {
      throw new Error('Unkown notification type');
    }
  }

  if (notif.post) {
    switch (notif.post.type) {
      case 'image':
        if (notif.post.image) {
          setImage(selectImageCopyURL('tiny', notif.post.image));
        }
        break;
      case 'link':
        if (notif.post.link && notif.post.link.image) {
          setImage(selectImageCopyURL('tiny', notif.post.link.image));
        }
        break;
    }
  } else if (typeof notif.community === 'object' && notif.community !== null) {
    if (notif.community.proPic) {
      setImage(selectImageCopyURL('small', notif.community.proPic));
    }
  }

  return ret;
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
      if (await isClientFocused()) return;

      const pushNotif = e.data.json();

      const res = await fetch(`/api/notifications/${pushNotif.id}`);

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
