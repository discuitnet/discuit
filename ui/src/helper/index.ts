import { Image, UserGroup } from '../serverTypes';

export function stringCount(
  num: number,
  onlyName = false,
  thingName = 'point',
  thingNameMultiple?: string
) {
  let s = onlyName ? '' : `${num} `;
  if (thingNameMultiple) {
    s += num === 1 ? thingName : thingNameMultiple;
  } else {
    s += thingName;
    if (num !== 1) s += 's';
  }
  return s;
}

export function kRound(num: number) {
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

export function timeAgo(date: string | Date, suffix = ' ago', justNow = true, short = false) {
  if (!(date instanceof Date)) {
    // eslint-disable-next-line no-param-reassign
    date = new Date(date);
  }

  const ms = (Date.now() - date.valueOf()) / 1000;

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

let scrollWidth: number | null = null;

export function getScrollbarWidth(): number {
  if (scrollWidth != null) {
    return scrollWidth;
  }
  // Creating invisible container
  const outer = document.createElement('div');
  outer.style.visibility = 'hidden';
  outer.style.overflow = 'scroll'; // forcing scrollbar to appear
  (outer.style as CSSStyleDeclaration & { [key: string]: string }).msOverflowStyle = 'scrollbar'; // needed for WinJS apps
  document.body.appendChild(outer);

  // Creating inner element and placing it in the container
  const inner = document.createElement('div');
  outer.appendChild(inner);

  // Calculating difference between container's full width and the child width
  const scrollbarWidth = outer.offsetWidth - inner.offsetWidth;

  // Removing temporary elements from the DOM
  outer.parentNode?.removeChild(outer);

  scrollWidth = scrollbarWidth;
  return scrollbarWidth;
}

export function randWords(noWords = 5): string {
  const words = ['apple', 'tree', 'nikola', 'fun', 'gatsby', 'team', 'sensei', 'water', 'air'];
  let str = '';
  for (let i = 0; i < noWords; i++) {
    str += words[Math.floor(Math.random() * (words.length - 1))] + ' ';
  }
  return str;
}

export function onKeyEnter<T = HTMLDivElement>(
  event: React.KeyboardEvent<T>,
  callback: (event: React.KeyboardEvent<T>) => void
) {
  if (event.key === 'Enter' || event.key === 'Space') {
    callback(event);
  }
}

export function onEscapeKey<T = HTMLDivElement>(
  event: React.KeyboardEvent<T>,
  callback: (event: React.KeyboardEvent<T>) => void,
  stopPropagation = true
) {
  if (event.key === 'Escape') {
    callback(event);
    if (stopPropagation) event.stopPropagation();
  }
}

// Returns date in the format of '21 February 2021'.
export function dateString1(date: string | Date): string {
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

export function validEmail(emailAddress: string): boolean {
  const r = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return r.test(String(emailAddress).toLocaleLowerCase());
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

export function publicURL(path: string): string {
  const { host, protocol } = window.location;
  return `${protocol}//${host}${path}`;
}

export function userGroupSingular(type: UserGroup, long = false): string {
  switch (type) {
    case 'mods':
      return long ? 'moderator' : 'mod';
    case 'admins':
      return long ? 'admin' : 'admin';
    case 'normal':
      return long ? 'user' : 'user';
  }
}

export function capitalizeFirstWord(str: string): string {
  if (str === '') return '';
  return str[0].toUpperCase() + str.substring(1);
}

export function toTitleCase(str: string): string {
  if (str === '') return '';
  const words = str.split(' ');
  let s = '';
  for (let i = 0; i < words.length; i++) {
    const word = words[i].trim();
    if (word === '') continue;
    s += word[0].toUpperCase() + word.substring(1);
    if (i < words.length - 1) s += ' ';
  }
  return s;
}

export function adjustTextareaHeight(event: React.FormEvent<HTMLTextAreaElement>, plus = 0) {
  const target = event.target as HTMLTextAreaElement;

  let scrollingElement = target.parentElement;
  while (scrollingElement) {
    if (scrollingElement.clientHeight < scrollingElement.scrollHeight) break;
    scrollingElement = scrollingElement.parentElement;
  }

  let scrollLeft = 0,
    scrollTop = 0;
  if (scrollingElement) {
    scrollLeft = scrollingElement.scrollLeft;
    scrollTop = scrollingElement.scrollTop;
  }

  target.style.height = 'auto';
  target.style.height = `${target.scrollHeight + plus}px`;

  if (scrollingElement) {
    scrollingElement.scrollTo(scrollLeft, scrollTop);
  }
}

export function getImageContainSize(
  width: number,
  height: number,
  containerWidth: number,
  containerHeight: number
) {
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
  status: number;
  json: unknown;
  constructor(status: number, json = {}) {
    super();
    this.name = 'APIError';
    this.status = status;
    this.json = json;
  }
}

function getCsrfCookieToken(): string | undefined {
  const cookie = document.cookie.split('; ').find((c) => c.startsWith('csrftoken='));
  if (cookie) {
    const n = cookie.indexOf('=');
    return cookie.substring(n + 1);
  }
}

function getCsrfToken(): string {
  return window.localStorage.getItem('csrftoken') || getCsrfCookieToken() || '';
}

export function mfetch(url: string | URL, options: RequestInit = {}): Promise<Response> {
  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'X-Csrf-Token': getCsrfToken(),
    },
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function mfetchjson(url: string | URL, options: RequestInit = {}): Promise<any> {
  const res = await mfetch(url, options);
  if (!res.ok) throw new APIError(res.status, await res.json());
  return await res.json();
}

export function isValidHttpUrl(string: string): boolean {
  let url;

  try {
    url = new URL(string);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    return false;
  }

  return url.protocol === 'http:' || url.protocol === 'https:';
}

export function omitWWWFromHostname(host: string): string {
  if (host.startsWith('www.')) {
    return host.substring(4);
  }
  return host;
}

// For the Web Push API's applicationServerKey option.
export function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  // eslint-disable-next-line no-useless-escape
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function isDeviceIos(): boolean {
  const userAgent = window.navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod/.test(userAgent);
}

/**
 * Reports whether the device is running as a standalone application (basically,
 * reports whether it's running as a PWA).
 */
export function isDeviceStandalone(): boolean {
  // Navigator.standalone only exists in iOS Safari.
  return (
    (navigator as Navigator & { standalone: boolean }).standalone ||
    window.matchMedia('(display-mode: standalone)').matches
  );
}

export function selectImageCopyURL(copyName = '', image: Image): string {
  const { copies } = image;
  if (copies) {
    const matches = copies.filter((copy) => copy.name === copyName);
    if (matches.length === 0) {
      return image.url;
    }
    return matches[0].url;
  }
  return '';
}

/**
 * Takes in a string of the form 'host:port' and returns a full URL. Either the
 * 'host' part or the 'port' could be ommitted, but not both.
 *
 */
export function hostnameToURL(addr: string) {
  let scheme = '',
    hostname = '',
    port = '';

  let n = addr.indexOf('://');
  if (n !== -1) {
    scheme = addr.substring(0, n);
    addr = addr.substring(n + 3);
    if (!(scheme === 'http' || scheme === 'https')) {
      throw new Error(`unknown scheme: ${scheme}`);
    }
  }

  n = addr.indexOf(':');
  if (n !== -1) {
    hostname = addr.substring(0, n);
    port = addr.substring(n);
    const portErr = new Error('port is not a number');
    if (port.length === 1) {
      throw portErr;
    }
    port = port.substring(1);
    if (isNaN(parseInt(port.substring(1), 10))) {
      throw portErr;
    }
  } else {
    hostname = addr;
  }

  if (!hostname && !port) {
    throw new Error('empty address');
  }

  if (!hostname) {
    hostname = 'localhost';
  }

  if (!scheme) {
    scheme = port === '443' ? 'https' : 'http';
  }

  let portString = '';
  if (port && !((scheme === 'http' && port === '80') || (scheme === 'https' && port === '443'))) {
    portString = `:${port}`;
  }
  return `${scheme}://${hostname}${portString}`;
}

/**
 * Copy text to the clipboard. This function is cross-browser compatible.
 *
 * @deprecated
 */
export function copyToClipboard(text: string): boolean {
  const _window = window as unknown as Window & ClipboardEvent;
  if (_window.clipboardData && _window.clipboardData.setData) {
    // Internet Explorer-specific code path to prevent textarea being shown while dialog is visible.
    _window.clipboardData.setData('Text', text);
    return true;
  } else if (document.queryCommandSupported && document.queryCommandSupported('copy')) {
    const textarea = document.createElement('textarea');
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
  return false;
}
