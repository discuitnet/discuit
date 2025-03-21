import { Location } from 'history';
import { useEffect, useInsertionEffect, useReducer, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useHistory, useLocation } from 'react-router';
import { APIError, mfetch, mfetchjson, usernameLegalLetters } from '../helper';
import { List } from '../serverTypes';
import { ListsFilter, ListsOrder, selectUsersLists, usersListsAdded } from '../slices/listsSlice';
import {
  muteCommunity,
  muteUser,
  selectIsCommunityMuted,
  selectIsUserMuted,
  snackAlertError,
  unmuteCommunity,
  unmuteUser,
} from '../slices/mainSlice';
import { selectUser, userAdded } from '../slices/usersSlice';

/**
 * Run a callback function after a specific amount of time.
 *
 * @param effect The callback function to run after the delay. You most definitely want to wrap this inside a `React.useCallback`.
 * @param delay In number of miliseconds.
 */
export function useDelayedEffect(effect: () => void, delay = 1000) {
  useEffect(() => {
    const timer = window.setTimeout(() => {
      effect();
    }, delay);
    return () => {
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effect, delay]);
}

/**
 * Makes an input or textarea element accept only characters valid in a
 * username. See the exported `usernameLegalLetters` array for a list of valid
 * usernname characters.
 *
 * @param maxLength Maximum length of the username.
 * @param initialUsername Initial value of the username.
 * @returns
 */
export function useInputUsername(maxLength: number, initialUsername = '') {
  const [value, setValue] = useState(initialUsername);
  const handleChange: React.ChangeEventHandler<HTMLInputElement | HTMLTextAreaElement> = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    event.preventDefault();
    const { value } = event.target;
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

export type LoadingState = 'initial' | 'loading' | 'loaded' | 'error';

export function useLoading(
  initialState: LoadingState = 'initial',
  timeout = 80
): [LoadingState, (loading: LoadingState) => void] {
  const [loading, setLoading] = useState<LoadingState>(initialState);
  useEffect(() => {
    if (loading === initialState) {
      const timer = window.setTimeout(() => {
        setLoading((loading) => {
          if (loading === initialState) return 'loading';
          return loading;
        });
      }, timeout);
      return () => {
        window.clearTimeout(timer);
      };
    }
  }, [loading, initialState, timeout]);

  return [loading, setLoading];
}

export function usePagination(initial = 1) {
  const history = useHistory();

  const query = useQuery();
  let page = initial;
  if (query.has('page')) {
    const _page = query.get('page');
    if (_page !== null) {
      const n = parseInt(_page);
      if (!isNaN(n)) {
        page = n;
      }
    }
  }

  const setPage = (n: number, clearOtherParms = false) => {
    let path = '';
    if (clearOtherParms) {
      path = `${history.location.pathname}?page=${n}`;
    } else {
      const params = new URLSearchParams(history.location.search);
      params.set('page', n.toString());
      path = `${history.location.pathname}?${params.toString()}`;
    }
    history.push(path);
  };

  return [page, setPage];
}

export function useQuery() {
  return new URLSearchParams(useLocation().search);
}

export function useIsChanged(deps: unknown[] = []): [boolean, () => void] {
  const [c, setC] = useState(0);
  useEffect(() => {
    if (c < 3) setC((c) => c + 1);
  }, deps);
  const resetChanged = () => setC(1);
  console.log('c: ', c);
  return [c > 1, resetChanged];
}

export function useVoting(
  initialVote: boolean | null,
  initialUpvotes: number,
  initialDownvotes: number
) {
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
  const setVote = (up: boolean) => {
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
  const doVote = async (
    up: boolean,
    fetch: () => Promise<unknown>,
    onSuccess: (arg0: unknown) => void,
    onFailure: (arg0: unknown) => void
  ) => {
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

export function useCanonicalTag(href: string, deps?: React.DependencyList) {
  useEffect(() => {
    removeCanonicalTag();
    if (href) {
      const tag = document.createElement('meta');
      tag.setAttribute('rel', 'canonical');
      tag.setAttribute('href', href);
      document.head.append(tag);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => {
    return () => {
      removeCanonicalTag();
    };
  }, []);
}

export function useRemoveCanonicalTag(deps?: React.DependencyList) {
  useEffect(() => {
    removeCanonicalTag();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

export function useImageLoaded(imgSrc: string) {
  const [loaded, setLoaded] = useState(true);
  const timer = useRef<number | null>(null);
  useInsertionEffect(() => {
    setLoaded(true);
    timer.current = window.setTimeout(() => {
      setLoaded(false);
    }, 10);
    return () => {
      if (timer.current !== null) {
        window.clearTimeout(timer.current);
      }
    };
  }, [imgSrc]);
  const handleLoad = () => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
    }
    setLoaded(true);
  };
  return [loaded, handleLoad];
}

function changeMetaColorTheme() {
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
    changeMetaColorTheme();
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

export function useMuteUser({ userId, username }: { userId: string; username: string }) {
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

export function useMuteCommunity({
  communityId,
  communityName,
}: {
  communityId: string;
  communityName: string;
}) {
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
export function useFetchUser(username: string, showSnackAlertOnError = true) {
  const dispatch = useDispatch();
  const user = useSelector(selectUser(username));
  const [loading, setLoading] = useState(!user);
  const [error, setError] = useState<unknown>(null);

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
      } catch (error: unknown) {
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

export function useFetchUsersLists(username: string, showSnackAlertOnError = true) {
  const dispatch = useDispatch();
  const {
    lists,
    order,
    filter,
  }: {
    lists: List[] | null;
    order: ListsOrder;
    filter: ListsFilter;
  } = useSelector(selectUsersLists(username));
  const [error, setError] = useState<unknown>(null);

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
      } catch (error: unknown) {
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

function locationToString<S = unknown>(location: Location<S>) {
  return `${location.pathname ?? ''}${location.search ?? ''}${location.hash ?? ''}`;
}

export function useLinkClick(
  to: string,
  onClick?: (event: React.MouseEvent) => void,
  target?: string,
  replace = false
): (event: React.MouseEvent) => void {
  const history = useHistory();
  const location = useLocation();

  const handleClick = (event: React.MouseEvent) => {
    if (onClick) onClick(event);
    if ((target ?? '_self') !== '_self') return;
    event.preventDefault();
    if (to === locationToString(location)) {
      window.scrollTo(0, 0);
      return;
    }
    if (replace) {
      history.replace(to);
    } else {
      history.push(to);
    }
  };

  return handleClick;
}
