import { ThunkDispatch } from 'redux-thunk';
import { APIError, mfetch, mfetchjson } from '../helper';
import { getDevicePreference, setDevicePreference } from '../pages/Settings/devicePrefs';
import {
  CommunitiesSort,
  Community,
  List,
  Mute,
  Mutes,
  Notification,
  NotificationView,
  ReportReason,
  User,
} from '../serverTypes';
import { AppDispatch, RootState, UnknownAction } from '../store';
import { communitiesAdded } from './communitiesSlice';

export interface Alert {
  id: string | number | null;
  text: string;
  timer?: number;
}

export interface NotificationsResponse {
  count: number;
  newCount: number;
  items: (Notification | NotificationView)[] | null;
  next: string;
}

export interface InitialValues {
  signupsDisabled: boolean;
  reportReasons: ReportReason[] | null;
  user: User | null;
  lists: List[];
  communities: Community[];
  noUsers: number;
  bannedFrom: string[];
  vapidPublicKey: string;
  mutes: Mutes;
  imagePostSubmitReqPoints: number;
  linkPostSubmitReqPoints: number;
}

export interface MainState {
  user: User | null; // If null, user is not logged in.
  vapidPublicKey: string | null; // The applicationServerKey for the Web Push API.
  appInstallButton: {
    show: boolean;
    deferredPrompt: unknown;
  };
  notifications: NotificationsResponse & { loaded: boolean };
  chatOpen: boolean;
  sidebarCommunities: Community[];
  allCommunities: {
    items: string[];
    loading: boolean;
  };
  alerts: Alert[]; // An array of { timestamp: 032948023, text: 'message' }.
  loginPromptOpen: boolean;
  signupsDisabled: boolean;
  reportReasons: InitialValues['reportReasons'];
  sidebarOpen: boolean;
  sidebarCommunitiesExpanded: boolean;
  sidebarScrollY: number;
  noUsers: number;
  bannedFrom: string[]; // List of community ids.
  loginModalOpen: boolean;
  signupModalOpen: boolean;
  createCommunityModalOpen: boolean;
  mutes: Mutes;
  lists: {
    loading: boolean;
    lists: List[];
  };
  saveToListModal: {
    open: boolean;
    toSaveItemId: string | null;
    toSaveItemType: string | null;
  };
  settingsChanged: number; // A counter to serve as a signal for when user settings change.
  feedLayout: string;
  allCommunitiesSort: CommunitiesSort;
  allCommunitiesSearchQuery: string;
  imagePostSubmitReqPoints: number;
  linkPostSubmitReqPoints: number;
  topNavbarAutohideDisabled: boolean;
}

const initialNotifications = {
  loaded: false,
  items: [],
  next: '',
  count: 0,
  newCount: 0,
};

const initialState: MainState = {
  user: null,
  vapidPublicKey: null,
  appInstallButton: {
    show: false,
    deferredPrompt: undefined,
  },
  notifications: initialNotifications,
  chatOpen: false,
  sidebarCommunities: [],
  allCommunities: {
    items: [],
    loading: true,
  },
  alerts: [],
  loginPromptOpen: false,
  signupsDisabled: false,
  reportReasons: [],
  sidebarOpen: false,
  sidebarCommunitiesExpanded: false,
  sidebarScrollY: 0,
  noUsers: 0,
  bannedFrom: [],
  loginModalOpen: false,
  signupModalOpen: false,
  createCommunityModalOpen: false,
  mutes: {
    userMutes: [],
    communityMutes: [],
  },
  lists: {
    loading: true,
    lists: [],
  },
  saveToListModal: {
    open: false,
    toSaveItemId: null,
    toSaveItemType: null,
  },
  settingsChanged: 0,
  feedLayout: (getDevicePreference('feed_layout') ?? 'card') as string,
  allCommunitiesSort: 'size',
  allCommunitiesSearchQuery: '',
  imagePostSubmitReqPoints: 0,
  linkPostSubmitReqPoints: 0,
  topNavbarAutohideDisabled: getDevicePreference('top_navbar_autohide_disabled') === 'true',
};

export default function mainReducer(
  state: MainState = initialState,
  action: UnknownAction
): MainState {
  switch (action.type) {
    case 'main/initialValuesAdded': {
      const payload = action.payload as InitialValues;
      const values = {
        vapidPublicKey: payload.vapidPublicKey,
        noUsers: payload.noUsers,
        signupsDisabled: payload.signupsDisabled,
        imagePostSubmitReqPoints: payload.imagePostSubmitReqPoints,
        linkPostSubmitReqPoints: payload.linkPostSubmitReqPoints,
      };
      return {
        ...state,
        ...values,
      };
    }
    case 'main/chatOpenToggled': {
      return {
        ...state,
        chatOpen: !state.chatOpen,
      };
    }
    case 'main/userLoggedIn': {
      const user = action.payload as User;
      return {
        ...state,
        user,
        notifications: {
          ...state.notifications,
          newCount: user.notificationsNewCount,
        },
      };
    }
    case 'main/userLoggedOut': {
      return {
        ...state,
        user: null,
      };
    }
    case 'main/sidebarCommunitiesUpdated': {
      return {
        ...state,
        sidebarCommunities: action.payload as Community[],
      };
    }
    case 'main/allCommunitiesUpdated': {
      return {
        ...state,
        allCommunities: action.payload as { items: string[]; loading: boolean },
      };
    }
    case 'main/alertAdded': {
      const alerts: Alert[] = [];
      const payloadAlert = action.payload as Alert;
      state.alerts.forEach((alert) => {
        if (alert.id === alert.id) {
          clearTimeout(alert.timer);
          return;
        }
        alerts.push(alert);
      });
      alerts.push(payloadAlert);
      return {
        ...state,
        alerts: alerts,
      };
    }
    case 'main/alertRemoved': {
      return {
        ...state,
        alerts: state.alerts.filter((alert) => alert.id !== action.payload),
      };
    }
    case 'main/loginPromptToggled': {
      return {
        ...state,
        loginPromptOpen: !state.loginPromptOpen,
      };
    }
    case 'main/notificationsLoaded': {
      const obj = action.payload as NotificationsResponse;
      return {
        ...state,
        notifications: {
          ...state.notifications,
          loaded: true,
          items: obj.items || [],
          next: obj.next,
          count: obj.count,
          newCount: obj.newCount,
        },
      };
    }
    case 'main/notificationsUpdated': {
      const payload = action.payload as NotificationsResponse;
      return {
        ...state,
        notifications: {
          ...state.notifications,
          loaded: true,
          items: [...state.notifications.items!, ...(payload.items || [])],
          next: payload.next,
          count: payload.count,
          newCount: payload.newCount,
        },
      };
    }
    case 'main/notificationsNewCountReset': {
      return {
        ...state,
        notifications: {
          ...state.notifications,
          newCount: 0,
        },
      };
    }
    case 'main/notificationsAllSeen': {
      const type = action.payload; // string
      return {
        ...state,
        notifications: {
          ...state.notifications,
          items: state.notifications.items!.map((item) => {
            return { ...item, seen: type === '' ? true : item.type === type ? true : item.seen };
          }),
        },
      };
    }
    case 'main/notificationsAllDeleted': {
      return {
        ...state,
        notifications: { ...initialNotifications, loaded: true },
      };
    }
    case 'main/notificationsDeleted': {
      const payload = action.payload as Notification;
      return {
        ...state,
        notifications: {
          ...state.notifications,
          count: state.notifications.count--,
          items: state.notifications.items!.filter((item) => item.id !== payload.id),
        },
      };
    }
    case 'main/notificationSeen': {
      const { notifId, seen } = action.payload as { notifId: number; seen: boolean };
      const newItems: (Notification | NotificationView)[] = [];
      state.notifications.items!.forEach((item) => {
        if (item.id === notifId) {
          newItems.push({
            ...item,
            seen: seen,
            seenAt: seen ? new Date().toISOString() : null,
          });
        } else {
          newItems.push(item);
        }
      });
      return {
        ...state,
        user: {
          ...state.user!,
          notificationsNewCount: 0,
        },
        notifications: {
          ...state.notifications,
          items: newItems,
        },
      };
    }
    case 'main/notificationsReloaded': {
      return {
        ...state,
        notifications: {
          ...state.notifications,
          loaded: false,
        },
      };
    }
    case 'main/reportReasonsUpdated': {
      return {
        ...state,
        reportReasons: action.payload as ReportReason[],
      };
    }
    case 'main/toggleSidebarOpen': {
      return {
        ...state,
        sidebarOpen: !state.sidebarOpen,
      };
    }
    case 'main/bannedFromUpdated': {
      return {
        ...state,
        bannedFrom: action.payload as string[],
      };
    }
    case 'main/bannedFromAdded': {
      return {
        ...state,
        bannedFrom: [...state.bannedFrom, action.payload as string],
      };
    }
    case 'main/signupModalOpened': {
      return {
        ...state,
        signupModalOpen: action.payload as boolean,
      };
    }
    case 'main/loginModalOpened': {
      return {
        ...state,
        loginModalOpen: action.payload as boolean,
      };
    }
    case 'main/createCommunityModalOpened': {
      return {
        ...state,
        createCommunityModalOpen: action.payload as boolean,
      };
    }
    case 'main/appInstallButtonUpdate': {
      return {
        ...state,
        appInstallButton: action.payload as { show: boolean; deferredPrompt: unknown },
      };
    }
    case 'main/mutesAdded': {
      return {
        ...state,
        mutes: {
          ...state.mutes,
          ...(action.payload as Mutes),
        },
      };
    }
    case 'main/muteAdded': {
      const mute = action.payload as Mute;
      const communityMutes = [...(state.mutes.communityMutes || [])];
      const userMutes = [...(state.mutes.userMutes || [])];
      if (mute.type === 'community') {
        communityMutes.push(mute);
      } else {
        userMutes.push(mute);
      }
      return {
        ...state,
        mutes: {
          communityMutes,
          userMutes,
        },
      };
    }
    case 'main/muteRemoved': {
      const { type, objectId } = action.payload as { type: string; objectId: string };
      const filter = (mutes: Mute[]) => {
        return mutes.filter((mute) => {
          if (type === 'community') {
            return mute.mutedCommunityId !== objectId;
          } else {
            return mute.mutedUserId !== objectId;
          }
        });
      };
      return {
        ...state,
        mutes: {
          communityMutes: filter(state.mutes.communityMutes || []),
          userMutes: filter(state.mutes.userMutes || []),
        },
      };
    }
    case 'main/sidebarCommunitiesExpandToggle': {
      return {
        ...state,
        sidebarCommunitiesExpanded: !state.sidebarCommunitiesExpanded,
      };
    }
    case 'main/sidebarScrollYUpdated': {
      return {
        ...state,
        sidebarScrollY: action.payload as number,
      };
    }
    case 'main/listsAdded': {
      return {
        ...state,
        lists: {
          loading: false,
          lists: action.payload as List[],
        },
      };
    }
    case 'main/saveToListModalOpened': {
      const { toSaveItemId, toSaveItemType } = action.payload as {
        toSaveItemId: string;
        toSaveItemType: string;
      };
      return {
        ...state,
        saveToListModal: {
          open: true,
          toSaveItemId: toSaveItemId,
          toSaveItemType: toSaveItemType,
        },
      };
    }
    case 'main/saveToListModalClosed': {
      return {
        ...state,
        saveToListModal: {
          ...state.saveToListModal,
          open: false,
          toSaveItemId: null,
          toSaveItemType: null,
        },
      };
    }
    case 'main/settingsChanged': {
      return {
        ...state,
        settingsChanged: state.settingsChanged + 1,
      };
    }
    case 'main/feedLayoutChanged': {
      setDevicePreference('feed_layout', action.payload);
      return {
        ...state,
        feedLayout: action.payload as string,
      };
    }
    case 'main/allCommunitiesSortChanged': {
      return {
        ...state,
        allCommunitiesSort: action.payload as CommunitiesSort,
      };
    }
    case 'main/allCommunitiesSearchQueryChanged': {
      return {
        ...state,
        allCommunitiesSearchQuery: action.payload as string,
      };
    }
    case 'main/topNavbarAutohideDisabledChanged': {
      return {
        ...state,
        topNavbarAutohideDisabled: action.payload as boolean,
      };
    }
    default:
      return state;
  }
}

// miscInitialValuesAdded sets all the values that were not set by other
// dispatch calls previously.
export const miscInitialValuesAdded = (payload: InitialValues) => {
  return { type: 'main/initialValuesAdded', payload };
};

export const chatOpenToggled = () => {
  return { type: 'main/chatOpenToggled' };
};

export const userLoggedIn = (user: User) => {
  return { type: 'main/userLoggedIn', payload: user };
};

export const userLoggedOut = () => {
  return { type: 'main/userLoggedOut' };
};

export const sidebarCommunitiesUpdated = (communities?: Community[] | null) => {
  return { type: 'main/sidebarCommunitiesUpdated', payload: communities || [] };
};

export const allCommunitiesUpdated =
  (communities: Community[] = []) =>
  (dispatch: ThunkDispatch<RootState, unknown, UnknownAction>) => {
    communities = communities || [];
    const names = communities.map((item) => item.name);
    dispatch({
      type: 'main/allCommunitiesUpdated',
      payload: {
        items: names || [],
        loading: false,
      },
    });
    dispatch(communitiesAdded(communities));
  };

export const snackAlert =
  (text: string, id?: string | number | null, timeout = 3000) =>
  (dispatch: AppDispatch) => {
    const alert: Alert = { id: id || Date.now(), text: text };
    dispatch({ type: 'main/alertAdded', payload: alert });
    alert.timer = window.setTimeout(() => {
      dispatch({ type: 'main/alertRemoved', payload: alert.id });
    }, timeout);
  };

export const snackAlertError = (error: unknown) => {
  console.error(error);
  if (error instanceof APIError) {
    if (error.status === 429) {
      return snackAlert('Whoah, slow down there!', 'too_many_requests');
    }
  }
  if (error instanceof TypeError) {
    return snackAlert(`Make sure you're connected to the internet`, 'network_error');
  }
  return snackAlert('Something went wrong.', 'generic');
};

export const loginPromptToggled = () => {
  return { type: 'main/loginPromptToggled' };
};

export const reportReasonsUpdated = (reasons: ReportReason[] | null) => {
  return { type: 'main/reportReasonsUpdated', payload: reasons || [] };
};

export const toggleSidebarOpen = () => {
  return { type: 'main/toggleSidebarOpen' };
};

export const bannedFromUpdated = (communities: string[]) => {
  return { type: 'main/bannedFromUpdated', payload: communities };
};

export const bannedFromAdded = (community: string) => {
  return { type: 'main/bannedFromAdded', payload: community };
};

export const notificationsLoaded = (notifications: NotificationsResponse) => {
  return {
    type: 'main/notificationsLoaded',
    payload: notifications,
  };
};

export const notificationsUpdated = (notification: NotificationsResponse) => {
  return {
    type: 'main/notificationsUpdated',
    payload: notification,
  };
};

const closePushNotification = async (notifId: string | number) => {
  if (!('serviceWorker' in navigator)) {
    return;
  }
  const reg = await navigator.serviceWorker.ready;
  const notifs = await reg.getNotifications();
  notifs.filter((notif) => notif.data.notificationId === notifId).forEach((notif) => notif.close());
};

export const markNotificationAsSeen =
  (notif: Notification | NotificationView | string | number, seen = true) =>
  async (dispatch: AppDispatch) => {
    const notifId = typeof notif === 'object' ? notif.id : notif;
    const errMsg = 'Error marking notification as seen: ';
    try {
      await mfetchjson(
        `/api/notifications/${notifId}?render=true&format=html&action=markAsSeen&seen=${seen ? 'true' : 'false'}`,
        {
          method: 'PUT',
        }
      );
      dispatch({ type: 'main/notificationSeen', payload: { notifId: notifId, seen } });
      if (seen) {
        await closePushNotification(notifId);
      }
    } catch (err) {
      console.error(errMsg, err);
    }
  };

export const notificationsNewCountReset = () => {
  return { type: 'main/notificationsNewCountReset' };
};

export const notificationsAllSeen = (type = '') => {
  return { type: 'main/notificationsAllSeen', payload: type };
};

export const notificationsAllDeleted = () => {
  return { type: 'main/notificationsAllDeleted' };
};

export const notificationsDeleted = (notification: Notification | NotificationView) => {
  return { type: 'main/notificationsDeleted', payload: notification };
};

export const notificationsReloaded = () => {
  return { type: 'main/notificationsReloaded' };
};

export const signupModalOpened = (open = true) => {
  return { type: 'main/signupModalOpened', payload: open };
};

export const loginModalOpened = (open = true) => {
  return { type: 'main/loginModalOpened', payload: open };
};

export const createCommunityModalOpened = (open = true) => {
  return { type: 'main/createCommunityModalOpened', payload: open };
};

export const showAppInstallButton = (show: boolean, deferredPrompt?: Event) => {
  return {
    type: 'main/appInstallButtonUpdate',
    payload: {
      show,
      deferredPrompt,
    },
  };
};

export const muteUser =
  (userId: string, username: string) =>
  async (dispatch: ThunkDispatch<RootState, unknown, UnknownAction>) => {
    try {
      const mutes = await mfetchjson('/api/mutes', {
        method: 'POST',
        body: JSON.stringify({
          userId: userId,
        }),
      });
      dispatch(mutesAdded(mutes));
      dispatch(
        snackAlert(
          `Posts from @${username} won't appear on any of your feeds from now on.`,
          null,
          5000
        )
      );
    } catch (error) {
      dispatch(snackAlertError(error));
    }
  };

export const unmuteUser =
  (userId: string, username: string) =>
  async (dispatch: ThunkDispatch<RootState, unknown, UnknownAction>) => {
    try {
      const res = await mfetch(`/api/mutes/users/${userId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        dispatch(muteRemoved('user', userId));
        dispatch(snackAlert(`Unmuted @${username}`, null));
      } else {
        throw new Error('Failed unmuting user: ' + (await res.text()));
      }
    } catch (error) {
      dispatch(snackAlertError(error));
    }
  };

export const muteCommunity =
  (communityId: string, communityName: string) =>
  async (dispatch: ThunkDispatch<RootState, unknown, UnknownAction>) => {
    try {
      const mutes = await mfetchjson('/api/mutes', {
        method: 'POST',
        body: JSON.stringify({
          communityId: communityId,
        }),
      });
      dispatch(mutesAdded(mutes));
      dispatch(snackAlert(`Posts from /${communityName} won't appear on All anymore.`, null, 5000));
    } catch (error) {
      dispatch(snackAlertError(error));
    }
  };

export const unmuteCommunity =
  (communityId: string, communityName: string) =>
  async (dispatch: ThunkDispatch<RootState, unknown, UnknownAction>) => {
    try {
      const res = await mfetch(`/api/mutes/communities/${communityId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        dispatch(muteRemoved('community', communityId));
        dispatch(snackAlert(`Unmuted /${communityName}`, null));
      } else {
        throw new Error('Failed unmuting user: ' + (await res.text()));
      }
    } catch (error) {
      dispatch(snackAlertError(error));
    }
  };

export const mutesAdded = (mutes: Mutes) => {
  return { type: 'main/mutesAdded', payload: mutes };
};

export const muteAdded = (mute: Mute) => {
  return { type: 'main/muteAdded', payload: mute };
};

export const muteRemoved = (type = '', objectId = '') => {
  return { type: 'main/muteRemoved', payload: { type, objectId } };
};

export const selectIsUserMuted = (userId: string) => (state: RootState) => {
  const userMutes = state.main.mutes.userMutes || [];
  let authorMuted = false;
  for (let i = 0; i < userMutes.length; i++) {
    const mute = userMutes[i];
    if (mute.mutedUserId === userId) {
      authorMuted = true;
      break;
    }
  }
  return authorMuted;
};

export const selectIsCommunityMuted = (communityId: string) => (state: RootState) => {
  const communityMutes = state.main.mutes.communityMutes || [];
  let muted = false;
  for (let i = 0; i < communityMutes.length; i++) {
    const mute = communityMutes[i];
    if (mute.mutedCommunityId === communityId) {
      muted = true;
      break;
    }
  }
  return muted;
};

export const sidebarScrollYUpdated = (scrollY: number) => {
  return { type: 'main/sidebarScrollYUpdated', payload: scrollY };
};

export const listsAdded = (lists: List[]) => {
  return { type: 'main/listsAdded', payload: lists };
};

export const saveToListModalOpened = (toSaveItemId: string, toSaveItemType: string) => {
  return { type: 'main/saveToListModalOpened', payload: { toSaveItemId, toSaveItemType } };
};

export const saveToListModalClosed = () => {
  return { type: 'main/saveToListModalClosed' };
};

export const settingsChanged = () => {
  return { type: 'main/settingsChanged' };
};

export const feedLayoutChanged = (newLayout: string) => {
  return { type: 'main/feedLayoutChanged', payload: newLayout };
};

export const initialFieldsSet = (initial: InitialValues) => (dispatch: AppDispatch) => {
  if (initial.user) {
    dispatch(userLoggedIn(initial.user));
  }
  dispatch(sidebarCommunitiesUpdated(initial.communities));
  dispatch(reportReasonsUpdated(initial.reportReasons));
  dispatch(bannedFromUpdated(initial.bannedFrom || []));
  dispatch(mutesAdded(initial.mutes));
  dispatch(listsAdded(initial.lists));
  dispatch(miscInitialValuesAdded(initial));
};

export const allCommunitiesSortChanged = (sort: CommunitiesSort) => {
  return { type: 'main/allCommunitiesSortChanged', payload: sort };
};

export const allCommunitiesSearchQueryChanged = (query: string) => {
  return { type: 'main/allCommunitiesSearchQueryChanged', payload: query };
};

export const topNavbarAutohideDisabledChanged = (disabled: boolean) => {
  return { type: 'main/topNavbarAutohideDisabledChanged', payload: disabled };
};
