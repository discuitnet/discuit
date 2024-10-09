/* eslint-disable @typescript-eslint/no-explicit-any */
const localStorageKey = 'preferences';

let cache: { [key: string]: any } | null = null;

function parseStoredPrefs(): { [key: string]: any } {
  const prefStr = localStorage.getItem(localStorageKey);
  let json = {};
  if (prefStr) {
    try {
      json = JSON.parse(prefStr) as { [key: string]: any };
    } catch (error) {
      console.error('Unable to parse device preferences from localStorage: ', error);
    }
  }
  return json;
}

/**
 *
 * If a value for `name` doesn't exist, this function will return undefined.
 *
 */
export function getDevicePreference(name: string): any {
  if (cache !== null) {
    return cache[name];
  }
  const json = parseStoredPrefs();
  cache = {
    ...json,
  };
  return json[name];
}

export function setDevicePreference(name: string, value: any) {
  const prefs = parseStoredPrefs();
  prefs[name] = value;
  localStorage.setItem(localStorageKey, JSON.stringify(prefs));
  cache = null;
}
