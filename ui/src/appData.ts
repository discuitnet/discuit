interface CustomWindow extends Window {
  appData?: GlobalAppData;
}

export class GlobalAppData {
  historyLength?: number;

  /**
   * This is really a BeforeInstallPromptEvent.
   */
  deferredInstallPrompt?: Event;
}

export function getGlobalAppData(): GlobalAppData {
  const _window = window as CustomWindow;
  if (!_window.appData) {
    _window.appData = new GlobalAppData();
  }
  return _window.appData;
}
