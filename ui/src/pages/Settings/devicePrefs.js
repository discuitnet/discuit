const localStorageKey = 'preferences';

function parseStoredPrefs() {
  const prefStr = localStorage.getItem(localStorageKey);
  let json = {};
  if (prefStr) {
    try {
      json = JSON.parse(prefStr);
    } catch (error) {
      console.error('Unable to parse device preferences from localStorage: ');
      console.error(error);
    }
  }
  return json;
}

export function getDevicePreference(name) {
  return parseStoredPrefs()[name]; // if doesn't exist, will be undefined
}

export function setDevicePreference(name, value) {
  const prefs = parseStoredPrefs();
  prefs[name] = value;
  localStorage.setItem(localStorageKey, JSON.stringify(prefs));
}
