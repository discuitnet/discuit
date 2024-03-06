export function stringCount(num, onlyName = false, thingName = 'point', thingNameMultiple) {
  // let s = `${num} ${thingName}`;
  let s = onlyName ? '' : `${num} `;
  if (thingNameMultiple) {
    s += num === 1 ? thingName : thingNameMultiple;
  } else {
    s += thingName;
    if (num !== 1) s += 's';
  }
  return s;
}

export function kRound(num) {
  if (num > 990) {
    if (num > 999000) {
      return `${Math.round(num / 100000) / 10}m`;
    }
    if (num > 99498) {
      return `${Math.round(num / 1000)}k`;
    }
    return `${Math.round(num / 100) / 10}k`;
  }
  return num;
}

export function timeAgo(date, suffix = ' ago', justNow = true, short = false) {
  if (!(date instanceof Date)) {
    // eslint-disable-next-line no-param-reassign
    date = new Date(date);
  }
  const ms = (Date.now() - date) / 1000;

  if (ms < 60) {
    if (justNow) {
      return short ? '0m' : 'just now';
    }
    const s = Math.round(ms);
    return `${s}${short ? 's' : ' second'}${short || s === 1 ? '' : 's'}${suffix}`;
  } else if (ms < 3600) {
    const m = Math.round(ms / 60);
    return `${m}${short ? 'm' : ' minute'}${short || m === 1 ? '' : 's'}${suffix}`;
  } else if (ms < 24 * 3600) {
    const h = Math.round(ms / 3600);
    return `${h}${short ? 'h' : ' hour'}${short || h === 1 ? '' : 's'}${suffix}`;
  } else if (ms < 7 * 24 * 3600) {
    const d = Math.round(ms / (24 * 3600));
    return `${d}${short ? 'd' : ' day'}${short || d === 1 ? '' : 's'}${suffix}`;
  } else if (ms < 365 * 24 * 3600) {
    const w = Math.round(ms / (24 * 3600) / 7);
    return `${w}${short ? 'w' : ' week'}${short || w === 1 ? '' : 's'}${suffix}`;
  }

  const y = Math.floor(ms / (365 * 24 * 3600));
  return `${y}${short ? 'y' : ' year'}${short || y === 1 ? '' : 's'}${suffix}`;
}

export function isScrollbarVisible() {
  return document.documentElement.clientHeight < document.body.scrollHeight;
}

let scrollWidth = null;
export function getScrollbarWidth() {
  if (scrollWidth != null) {
    return scrollWidth;
  }
  // Creating invisible container
  const outer = document.createElement('div');
  outer.style.visibility = 'hidden';
  outer.style.overflow = 'scroll'; // forcing scrollbar to appear
  outer.style.msOverflowStyle = 'scrollbar'; // needed for WinJS apps
  document.body.appendChild(outer);

  // Creating inner element and placing it in the container
  const inner = document.createElement('div');
  outer.appendChild(inner);

  // Calculating difference between container's full width and the child width
  const scrollbarWidth = outer.offsetWidth - inner.offsetWidth;

  // Removing temporary elements from the DOM
  outer.parentNode.removeChild(outer);

  scrollWidth = scrollbarWidth;
  return scrollbarWidth;
}

export function randWords(noWords = 5) {
  const words = ['apple', 'tree', 'nikola', 'fun', 'gatsby', 'team', 'sensei', 'water', 'air'];
  let str = '';
  for (let i = 0; i < noWords; i++) {
    str += words[Math.floor(Math.random() * (words.length - 1))] + ' ';
  }
  return str;
}

export function onKeyEnter(e, callback) {
  if (e.key === 'Enter' || e.key === 'Space') {
    callback(e);
  }
}

export function onEscapeKey(e, callback, stopPropagation = true) {
  if (e.key === 'Escape') {
    callback(e);
    if (stopPropagation) e.stopPropagation();
  }
}

// Returns date in the format of '21 February 2021'.
export function dateString1(date) {
  const months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];
  if (!(date instanceof Date)) date = new Date(date);
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

export function validEmail(emailAddress) {
  const r = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return r.test(String(emailAddress).toLocaleLowerCase());
}

// From stackoverflow.com/a/33928558.
export function copyToClipboard(text) {
  if (window.clipboardData && window.clipboardData.setData) {
    // Internet Explorer-specific code path to prevent textarea being shown while dialog is visible.
    return window.clipboardData.setData('Text', text);
  } else if (document.queryCommandSupported && document.queryCommandSupported('copy')) {
    var textarea = document.createElement('textarea');
    textarea.textContent = text;
    textarea.style.position = 'fixed'; // Prevent scrolling to bottom of page in Microsoft Edge.
    document.body.appendChild(textarea);
    textarea.select();
    try {
      return document.execCommand('copy'); // Security exception may be thrown by some browsers.
    } catch (ex) {
      console.warn('Copy to clipboard failed.', ex);
      return false;
    } finally {
      document.body.removeChild(textarea);
    }
  }
}

export const usernameLegalLetters = [
  '0',
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  'a',
  'b',
  'c',
  'd',
  'e',
  'f',
  'g',
  'h',
  'i',
  'j',
  'k',
  'l',
  'm',
  'n',
  'o',
  'p',
  'q',
  'r',
  's',
  't',
  'u',
  'v',
  'w',
  'x',
  'y',
  'z',
  'A',
  'B',
  'C',
  'D',
  'E',
  'F',
  'G',
  'H',
  'I',
  'J',
  'K',
  'L',
  'M',
  'N',
  'O',
  'P',
  'Q',
  'R',
  'S',
  'T',
  'U',
  'V',
  'W',
  'X',
  'Y',
  'Z',
  '_',
];

export function publicURL(path) {
  const { host, protocol } = window.location;
  return `${protocol}//${host}${path}`;
}

export function userGroupSingular(type, long = false) {
  switch (type) {
    case 'mods':
      return long ? 'moderator' : 'mod';
    case 'admins':
      return long ? 'admin' : 'admin';
    case 'normal':
      return long ? 'user' : 'user';
  }
  throw new Error(`Invalid userGroup: ${type}`);
}

export function capitalizeFirstWord(str) {
  if (str === '') return '';
  return str[0].toUpperCase() + str.substr(1);
}

export function toTitleCase(str) {
  if (str === '') return '';
  const words = str.split(' ');
  let s = '';
  for (let i = 0; i < words.length; i++) {
    const word = words[i].trim();
    if (word === '') continue;
    s += word[0].toUpperCase() + word.substr(1);
    if (i < words.length - 1) s += ' ';
  }
  return s;
}

export function adjustTextareaHeight(e, plus = 0) {
  const { target } = e;

  let scrollingElement = target.parentElement;
  while (scrollingElement) {
    if (scrollingElement.clientHeight < scrollingElement.scrollHeight) break;
    scrollingElement = scrollingElement.parentElement;
  }

  let scrollLeft, scrollTop;
  if (scrollingElement) {
    scrollLeft = scrollingElement.scrollLeft;
    scrollTop = scrollingElement.scrollTop;
  }

  target.style.height = 'auto';
  target.style.height = `${target.scrollHeight + plus}px`;

  if (scrollingElement) scrollingElement.scrollTo(scrollLeft, scrollTop);
}

export function getImageContainSize(width, height, containerWidth, containerHeight) {
  let x = width,
    y = height,
    scale = 1;

  if (width > containerWidth) {
    scale = containerWidth / width;
    x = scale * width;
    y = scale * height;
  }
  if (y > containerHeight) {
    scale = containerHeight / y;
    x = scale * x;
    y = scale * y;
  }

  return {
    width: Math.round(x),
    height: Math.round(y),
  };
}

export class APIError extends Error {
  constructor(status, json = {}) {
    super();
    this.name = 'APIError';
    this.status = status;
    this.json = json;
  }
}

function getCsrfCookieToken() {
  // const cookie = document.cookie.split('; ').find((c) => c.startsWith('csrftoken='));
  // const n = cookie.indexOf('=');
  // return cookie.substr(n + 1);

  // Using localStorage for saving the csrf token as service workers do not
  // cache cookies.
  return window.localStorage.getItem('csrftoken');
}

export function mfetch(url, options = {}) {
  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'X-Csrf-Token': getCsrfCookieToken(),
    },
  });
}

export async function mfetchjson(url, options = {}) {
  const res = await mfetch(url, options);
  if (!res.ok) throw new APIError(res.status, await res.json());
  return await res.json();
}

export function isValidHttpUrl(string) {
  let url;

  try {
    url = new URL(string);
  } catch (_) {
    return false;
  }

  return url.protocol === 'http:' || url.protocol === 'https:';
}

export function omitWWWFromHostname(host) {
  if (host.startsWith('www.')) {
    return host.substr(4);
  }
  return host;
}

// For the Web Push API's applicationServerKey option.
export function urlBase64ToUint8Array(base64String) {
  var padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  // eslint-disable-next-line no-useless-escape
  var base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');

  var rawData = window.atob(base64);
  var outputArray = new Uint8Array(rawData.length);

  for (var i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function isDeviceIos() {
  const userAgent = window.navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod/.test(userAgent);
}

export function isDeviceStandalone() {
  // return window.navigator && 'standalone' in window.navigator;
  return navigator.standalone || window.matchMedia('(display-mode: standalone)').matches;
}

export function selectImageCopyURL(copyName = '', image = {}) {
  const { copies } = image;
  const matches = copies.filter((copy) => copy.name === copyName);
  if (matches.length === 0) {
    return image.url;
  }
  return matches[0].url;
}
