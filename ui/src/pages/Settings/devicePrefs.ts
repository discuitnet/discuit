/* eslint-disable @typescript-eslint/no-explicit-any */
const localStorageKey = 'preferences';

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
  return parseStoredPrefs()[name]; // if doesn't exist, will be undefined
}

export function setDevicePreference(name: string, value: any) {
  const prefs = parseStoredPrefs();
  prefs[name] = value;
  localStorage.setItem(localStorageKey, JSON.stringify(prefs));
}
