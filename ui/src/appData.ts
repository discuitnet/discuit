interface CustomWindow extends Window {
  appData?: {
    historyLength?: number;
  };
}

export class GlobalAppData {
  historyLength?: number;
  deferredInstallPrompt?: Event; // this is really a BeforeInstallPromptEvent
}

export function getGlobalAppData(): GlobalAppData {
  const _window = window as CustomWindow;
  if (!_window.appData) {
    _window.appData = new GlobalAppData();
  }
  return _window.appData;
}
