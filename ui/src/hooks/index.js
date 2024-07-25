import { useInsertionEffect, useReducer, useRef } from 'react';
import { useEffect, useState } from 'react';
import { useHistory } from 'react-router';
import { useLocation } from 'react-router';
import { APIError, mfetch, mfetchjson, usernameLegalLetters } from '../helper';
import {
  muteCommunity,
  muteUser,
  selectIsCommunityMuted,
  selectIsUserMuted,
  snackAlertError,
  unmuteCommunity,
  unmuteUser,
} from '../slices/mainSlice';
import { useDispatch, useSelector } from 'react-redux';
import { selectUser, userAdded } from '../slices/usersSlice';
import { selectUsersLists, usersListsAdded } from '../slices/listsSlice';

export function useDelayedEffect(callback, deps, delay = 1000) {
  const [timer, setTimer] = useState(null);
  useEffect(() => {
    if (timer) {
      clearTimeout(timer);
    }
    const newTimer = setTimeout(() => {
      callback();
    }, delay);
    setTimer(newTimer);
  }, deps);
}

export function useInputUsername(maxLength, initialUsername = '') {
  const [value, setValue] = useState(initialUsername);
  const handleChange = (e) => {
    e.preventDefault();
    const { value } = e.target;
    for (let i = 0; i < value.length; i++) {
      let found = false;
      for (let j = 0; j < usernameLegalLetters.length; j++)
        if (value[i] === usernameLegalLetters[j]) found = true;
      if (!found) return;
    }
    if (value.length <= maxLength) {
      setValue(value);
    }
  };

  return [value, handleChange];
}

export function useWindowSize() {
  const getSize = () => {
    return {
      width: document.documentElement.clientWidth,
      height: document.documentElement.clientHeight,
    };
  };
  const [size, setSize] = useState(getSize());
  useEffect(() => {
    const listner = () => setSize(getSize());
    window.addEventListener('resize', listner);
    return () => window.removeEventListener('resize', listner);
  }, []);

  return size;
}

export function useWindowWidth() {
  return useWindowSize().width;
}

export function useWindowHeight() {
  return useWindowSize().height;
}

export const mobileBreakpointWidth = 768;

export function useIsMobile(breakpoint = mobileBreakpointWidth) {
  return useWindowWidth() <= breakpoint;
}

export function useLoading(initialState = 'initial', timeout = 80) {
  const [loading, setLoading] = useState(initialState);
  useEffect(() => {
    if (loading === initialState) {
      setTimeout(
        () =>
          setLoading((loading) => {
            if (loading === initialState) return 'loading';
            return loading;
          }),
        timeout
      );
    }
  }, [loading]);

  return [loading, setLoading];
}

export function usePagination(initial = 1) {
  const history = useHistory();

  const query = useQuery();
  let page = initial;
  if (query.has('page')) {
    const n = parseInt(query.get('page'));
    if (!isNaN(n)) page = n;
  }

  const setPage = (n, clearOtherParms = false) => {
    let path = '';
    if (clearOtherParms) {
      path = `${history.location.pathname}?page=${n}`;
    } else {
      const params = new URLSearchParams(history.location.search);
      params.set('page', n);
      path = `${history.location.pathname}?${params.toString()}`;
    }
    history.push(path);
  };

  return [page, setPage];
}

export function useQuery() {
  return new URLSearchParams(useLocation().search);
}

export function useIsChanged(deps = []) {
  const [c, setC] = useState(0);
  useEffect(() => {
    if (c < 3) setC((c) => c + 1);
  }, deps);
  const resetChanged = () => setC(1);
  return [c > 1, resetChanged];
}

export function useVoting(initialVote, initialUpvotes, initialDownvotes) {
  const [state, setState] = useState({
    upvotes: initialUpvotes,
    downvotes: initialDownvotes,
    vote: initialVote,
  });
  useEffect(() => {
    setState({
      upvotes: initialUpvotes,
      downvotes: initialDownvotes,
      vote: initialVote,
    });
  }, [initialVote, initialUpvotes, initialDownvotes]);
  const setVote = (up) => {
    setState((prev) => {
      let { upvotes, downvotes, vote } = prev;
      if (vote === null) {
        vote = up;
        if (up) upvotes++;
        else downvotes++;
      } else {
        if (vote === true) {
          vote = up ? null : false;
          upvotes--;
          if (!up) downvotes++;
        } else {
          vote = up ? true : null;
          downvotes--;
          if (up) upvotes++;
        }
      }
      return {
        upvotes,
        downvotes,
        vote,
      };
    });
  };

  const [requesting, setRequesting] = useState(false);
  const doVote = async (up, fetch, onSuccess, onFailure) => {
    if (requesting) return;
    setRequesting(true);
    const prev = {
      ...state,
    };
    setVote(up);
    try {
      const res = await fetch();
      onSuccess(res);
    } catch (error) {
      setState(prev);
      onFailure(error);
    } finally {
      setRequesting(false);
    }
  };

  return {
    upvotes: state.upvotes,
    downvotes: state.downvotes,
    vote: state.vote,
    doVote,
  };
}

// If the condition is true and the user pressed the escape key the
// callback is run.
export function useEscapeKeydown(callback, condition = true) {
  useEffect(() => {
    if (condition) {
      const listner = (e) => {
        if (condition && e.key === 'Escape') {
          callback(e);
          e.stopPropagation();
        }
      };
      window.addEventListener('keydown', listner);
      return () => {
        window.removeEventListener('keydown', listner);
      };
    }
  }, [condition]);
}

function removeCanonicalTag() {
  const metaTags = Array.from(document.head.querySelectorAll('meta'));
  for (let i = 0; i < metaTags.length; i++) {
    if (metaTags[i].getAttribute('rel') === 'canonical') {
      metaTags[i].remove();
      return true;
    }
  }
  return false;
}

export function useCanonicalTag(href, deps) {
  useEffect(() => {
    removeCanonicalTag();
    if (href) {
      const tag = document.createElement('meta');
      tag.setAttribute('rel', 'canonical');
      tag.setAttribute('href', href);
      document.head.append(tag);
    }
  }, deps);
  useEffect(() => {
    return () => removeCanonicalTag();
  }, []);
}

export function useRemoveCanonicalTag(deps) {
  useEffect(() => {
    removeCanonicalTag();
  }, deps);
}

export function useImageLoaded(imgSrc) {
  const [loaded, setLoaded] = useState(true);
  const timer = useRef();
  useInsertionEffect(() => {
    setLoaded(true);
    timer.current = setTimeout(() => {
      setLoaded(false);
    }, 10);
    return () => clearTimeout(timer.current);
  }, [imgSrc]);
  const handleLoad = () => {
    clearTimeout(timer.current);
    setLoaded(true);
  };
  return [loaded, handleLoad];
}

function changeMetaColorTheme(theme = 'light') {
  Array.from(document.head.querySelectorAll('meta[name="theme-color"]')).forEach((item) =>
    item.remove()
  );
  const meta = document.createElement('meta');
  meta.setAttribute('name', 'theme-color');
  meta.setAttribute('content', getComputedStyle(document.body).getPropertyValue('--color-bg'));
  document.head.appendChild(meta);
}

// Use this hook only in one place for the moment. Otherwise, there's going to
// be bugs.
export function useTheme() {
  const getUserColorSchemePreference = () => {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  };
  const getLocalStorageTheme = () => {
    const t = localStorage.getItem('theme');
    if (t === 'light' || t === 'dark') {
      return t;
    }
    return getUserColorSchemePreference();
  };
  const [theme, setTheme] = useState(getLocalStorageTheme()); // always either 'light' or 'dark'
  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.remove('theme-dark');
    } else {
      document.documentElement.classList.add('theme-dark');
    }
    if (theme === getUserColorSchemePreference()) {
      // No persistence is necessary if theme matches OS/browser preferences
      localStorage.removeItem('theme');
    } else {
      localStorage.setItem('theme', theme);
    }
    changeMetaColorTheme(theme);
  }, [theme]);
  useEffect(() => {
    if (!window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const listner = () => {
      setTheme(getLocalStorageTheme());
    };
    mediaQuery.addEventListener('change', listner);
    return () => {
      mediaQuery.removeEventListener('change', listner);
    };
  }, []);
  const toggleTheme = () => setTheme(theme === 'light' ? 'dark' : 'light');
  return { theme, setTheme, toggleTheme };
}

export function useForceUpdate() {
  const [, forceUpdate] = useReducer((x) => x + 1, 0);
  return forceUpdate;
}

export function useMuteUser({ userId, username }) {
  const dispatch = useDispatch();
  const isMuted = useSelector(selectIsUserMuted(userId));
  const toggleMute = () => {
    const f = isMuted ? unmuteUser : muteUser;
    dispatch(f(userId, username));
  };
  return {
    isMuted,
    toggleMute,
    displayText: (isMuted ? 'Unmute' : 'Mute') + ` @${username}`,
  };
}

export function useMuteCommunity({ communityId, communityName }) {
  const dispatch = useDispatch();
  const isMuted = useSelector(selectIsCommunityMuted(communityId));
  const toggleMute = () => {
    const f = isMuted ? unmuteCommunity : muteCommunity;
    dispatch(f(communityId, communityName));
  };
  return {
    isMuted,
    toggleMute,
    displayText: (isMuted ? 'Unmute' : 'Mute') + ` /${communityName}`,
  };
}

/**
 * Fetches a user by calling the API. If the user is found in the Redux store,
 * however, no networks calls are made and the user object is fetched from the
 * store.
 *
 */
export function useFetchUser(username, showSnackAlertOnError = true) {
  const dispatch = useDispatch();
  const user = useSelector(selectUser(username));
  const [loading, setLoading] = useState(!user);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (user) {
      return;
    }
    const f = async () => {
      try {
        setLoading(true);
        const res = await mfetch(`/api/users/${username}`);
        if (!res.ok) {
          if (res.status === 404) {
            setLoading(false);
            return;
          }
          throw new APIError(res.status, await res.json());
        }
        dispatch(userAdded(await res.json()));
      } catch (error) {
        setError(error);
        if (showSnackAlertOnError) {
          dispatch(snackAlertError(error));
        }
      } finally {
        setLoading(false);
      }
    };
    f();
  }, [username]);

  return {
    user,
    loading,
    error,
  };
}

export function useFetchUsersLists(username, showSnackAlertOnError = true) {
  const dispatch = useDispatch();
  const { lists, order, filter } = useSelector(selectUsersLists(username));
  const [error, setError] = useState(null);

  useEffect(() => {
    if (lists) {
      return;
    }
    const f = async () => {
      try {
        setError(null);
        const lists = await mfetchjson(
          `/api/users/${username}/lists?sort=${order}&filter=${filter}`
        );
        dispatch(usersListsAdded(username, lists, order, filter));
      } catch (error) {
        setError(error);
        if (showSnackAlertOnError) {
          dispatch(snackAlertError(error));
        }
      }
    };
    f();
  }, [username, order, filter]);

  return {
    lists,
    order,
    filter,
    loading: !(lists && !error),
    error,
  };
}
