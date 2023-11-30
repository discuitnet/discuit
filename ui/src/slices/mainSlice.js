import { APIError, mfetch, mfetchjson } from '../helper';
import { communitiesAdded } from './communitiesSlice';

const initialNotifications = {
  loaded: false,
  items: [],
  next: '',
  count: 0,
  newCount: 0,
};

const initialState = {
  user: null, // Meaning not logged in.
  vapidPublicKey: null, // applicationServerKey for the Web Push API.
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
  alerts: [], // An array of { timestamp: 032948023, text: 'message' }.
  loginPromptOpen: false,
  reportReasons: [],
  sidebarOpen: false,
  noUsers: 0,
  bannedFrom: [],
  loginModalOpen: false,
  signupModalOpen: false,
  createCommunityModalOpen: false,
  mutes: {
    userMutes: [],
    communityMutes: [],
  },
};

export default function mainReducer(state = initialState, action) {
  switch (action.type) {
    case 'main/initialValuesAdded': {
      return {
        ...state,
        ...action.payload,
      };
    }
    case 'main/chatOpenToggled': {
      return {
        ...state,
        chatOpen: !state.chatOpen,
      };
    }
    case 'main/userLoggedIn': {
      const user = action.payload;
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
        sidebarCommunities: action.payload,
      };
    }
    case 'main/allCommunitiesUpdated': {
      return {
        ...state,
        allCommunities: action.payload,
      };
    }
    case 'main/noUsersUpdated': {
      return {
        ...state,
        noUsers: action.payload,
      };
    }
    case 'main/alertAdded': {
      const alerts = [];
      state.alerts.forEach((alert) => {
        if (alert.id === action.payload.id) {
          clearTimeout(alert.timer);
          return;
        }
        alerts.push(alert);
      });
      alerts.push(action.payload);
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
      const obj = action.payload;
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
      return {
        ...state,
        notifications: {
          ...state.notifications,
          loaded: true,
          items: [...state.notifications.items, ...(action.payload.items || [])],
          next: action.payload.next,
          count: action.payload.count,
          newCount: action.payload.newCount,
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
          items: state.notifications.items.map((item) => {
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
      return {
        ...state,
        notifications: {
          ...state.notifications,
          count: state.notifications.count--,
          items: state.notifications.items.filter((item) => item.id !== action.payload.id),
        },
      };
    }
    case 'main/notificationSeen': {
      const { notifId, seen } = action.payload;
      const newItems = [];
      state.notifications.items.forEach((item) => {
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
          ...state.user,
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
        reportReasons: action.payload,
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
        bannedFrom: action.payload,
      };
    }
    case 'main/bannedFromAdded': {
      return {
        ...state,
        bannedFrom: [...state.bannedFrom, action.payload],
      };
    }
    case 'main/signupModalOpened': {
      return {
        ...state,
        signupModalOpen: action.payload,
      };
    }
    case 'main/loginModalOpened': {
      return {
        ...state,
        loginModalOpen: action.payload,
      };
    }
    case 'main/createCommunityModalOpened': {
      return {
        ...state,
        createCommunityModalOpen: action.payload,
      };
    }
    case 'main/appInstallButtonUpdate': {
      return {
        ...state,
        appInstallButton: action.payload,
      };
    }
    case 'main/mutesAdded': {
      return {
        ...state,
        mutes: {
          ...state.mutes,
          ...action.payload,
        },
      };
    }
    case 'main/muteAdded': {
      const mute = action.payload;
      let communityMutes = [...state.mutes.communityMutes];
      let userMutes = [...state.mutes.userMutes];
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
      const { type, objectId } = action.payload;
      const filter = (mutes) => {
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
          communityMutes: filter(state.mutes.communityMutes),
          userMutes: filter(state.mutes.userMutes),
        },
      };
    }
    default:
      return state;
  }
}

export const initialValuesAdded = (initial) => {
  const payload = {
    vapidPublicKey: initial.vapidPublicKey,
  };
  return { type: 'main/initialValuesAdded', payload };
};

export const chatOpenToggled = () => {
  return { type: 'main/chatOpenToggled' };
};

export const userLoggedIn = (user) => {
  return { type: 'main/userLoggedIn', payload: user };
};

export const userLoggedOut = () => {
  return { type: 'main/userLoggedOut' };
};

export const sidebarCommunitiesUpdated = (communities) => {
  return { type: 'main/sidebarCommunitiesUpdated', payload: communities || [] };
};

export const allCommunitiesUpdated =
  (communities = []) =>
  (dispatch) => {
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
  (text, id, timeout = 3000) =>
  (dispatch) => {
    const alert = { id: id || Date.now(), text: text };
    dispatch({ type: 'main/alertAdded', payload: alert });
    alert.timer = setTimeout(() => {
      dispatch({ type: 'main/alertRemoved', payload: alert.id });
    }, timeout);
  };

export const snackAlertError = (error) => {
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

export const reportReasonsUpdated = (reasons) => {
  return { type: 'main/reportReasonsUpdated', payload: reasons || [] };
};

export const toggleSidebarOpen = () => {
  return { type: 'main/toggleSidebarOpen' };
};

export const noUsersUpdated = (noUsers) => {
  return { type: 'main/noUsersUpdated', payload: noUsers };
};

export const bannedFromUpdated = (communities) => {
  return { type: 'main/bannedFromUpdated', payload: communities };
};

export const bannedFromAdded = (community) => {
  return { type: 'main/bannedFromAdded', payload: community };
};

export const notificationsLoaded = (notifications) => {
  return {
    type: 'main/notificationsLoaded',
    payload: notifications,
  };
};

export const notificationsUpdated = (notification) => {
  return {
    type: 'main/notificationsUpdated',
    payload: notification,
  };
};

export const markNotificationAsSeen =
  (notif, seen = true) =>
  async (dispatch) => {
    const errMsg = 'Error marking notification as seen: ';
    try {
      await mfetchjson(
        `/api/notifications/${notif.id}?action=markAsSeen&seen=${seen ? 'true' : 'false'}`,
        {
          method: 'PUT',
        }
      );
      dispatch({ type: 'main/notificationSeen', payload: { notifId: notif.id, seen } });
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

export const notificationsDeleted = (notification) => {
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

export const showAppInstallButton = (show, deferredPrompt) => {
  return {
    type: 'main/appInstallButtonUpdate',
    payload: {
      show,
      deferredPrompt,
    },
  };
};

export const muteUser = (userId, username) => async (dispatch) => {
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

export const unmuteUser = (userId, username) => async (dispatch) => {
  try {
    const res = await mfetch(`/api/mutes/users/${userId}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      dispatch(muteRemoved('user', userId));
      dispatch(snackAlert(`Unmuted @${username}`));
    } else {
      throw new Error('Failed unmuting user: ' + (await res.text()));
    }
  } catch (error) {
    dispatch(snackAlertError(error));
  }
};

export const muteCommunity = (communityId, communityName) => async (dispatch) => {
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

export const unmuteCommunity = (communityId, communityName) => async (dispatch) => {
  try {
    const res = await mfetch(`/api/mutes/communities/${communityId}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      dispatch(muteRemoved('community', communityId));
      dispatch(snackAlert(`Unmuted /${communityName}`));
    } else {
      throw new Error('Failed unmuting user: ' + (await res.text()));
    }
  } catch (error) {
    dispatch(snackAlertError(error));
  }
};

export const mutesAdded = (mutes = {}) => {
  return { type: 'main/mutesAdded', payload: mutes };
};

export const muteAdded = (mute) => {
  return { type: 'main/muteAdded', payload: mute };
};

export const muteRemoved = (type = '', objectId = '') => {
  return { type: 'main/muteRemoved', payload: { type, objectId } };
};

export const selectIsUserMuted = (userId) => (state) => {
  const userMutes = state.main.mutes.userMutes;
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

export const selectIsCommunityMuted = (communityId) => (state) => {
  const communityMutes = state.main.mutes.communityMutes;
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
