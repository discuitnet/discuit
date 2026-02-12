import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useDispatch, useSelector } from 'react-redux';
import { Link, Redirect, Route, Switch, useParams, useRouteMatch } from 'react-router-dom';
import Dashboard from '../../components/Dashboard';
import { APIError, mfetch } from '../../helper';
import { communityAdded, selectCommunity } from '../../slices/communitiesSlice';
import { MainState, snackAlertError } from '../../slices/mainSlice';
import { RootState } from '../../store';
import { SVGSettings } from '../../SVGs';
import Forbidden from '../Forbidden';
import PageNotLoaded from '../PageNotLoaded';
import Banned from './Banned';
import Mods from './Mods';
import Removed from './Removed';
import Reports from './Reports';
import Rules from './Rules';
import Settings from './Settings';

const svgs = {
  rules: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M20.5 16V18.5C20.5 20.43 18.93 22 17 22H7C5.07 22 3.5 20.43 3.5 18.5V17.85C3.5 16.28 4.78 15 6.35 15H19.5C20.05 15 20.5 15.45 20.5 16Z"
        fill="currentColor"
      />
      <path
        d="M15.5 2H8.5C4.5 2 3.5 3 3.5 7V14.58C4.26 13.91 5.26 13.5 6.35 13.5H19.5C20.05 13.5 20.5 13.05 20.5 12.5V7C20.5 3 19.5 2 15.5 2ZM13 10.75H8C7.59 10.75 7.25 10.41 7.25 10C7.25 9.59 7.59 9.25 8 9.25H13C13.41 9.25 13.75 9.59 13.75 10C13.75 10.41 13.41 10.75 13 10.75ZM16 7.25H8C7.59 7.25 7.25 6.91 7.25 6.5C7.25 6.09 7.59 5.75 8 5.75H16C16.41 5.75 16.75 6.09 16.75 6.5C16.75 6.91 16.41 7.25 16 7.25Z"
        fill="currentColor"
      />
    </svg>
  ),
  reports: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M8.28906 6.29C7.86906 6.29 7.53906 5.95 7.53906 5.54V2.75C7.53906 2.34 7.86906 2 8.28906 2C8.70906 2 9.03906 2.34 9.03906 2.75V5.53C9.03906 5.95 8.70906 6.29 8.28906 6.29Z"
        fill="currentColor"
      />
      <path
        d="M15.7109 6.29C15.2909 6.29 14.9609 5.95 14.9609 5.54V2.75C14.9609 2.33 15.3009 2 15.7109 2C16.1309 2 16.4609 2.34 16.4609 2.75V5.53C16.4609 5.95 16.1309 6.29 15.7109 6.29Z"
        fill="currentColor"
      />
      <path
        d="M19.57 4.5C18.91 4.01 17.96 4.48 17.96 5.31V5.41C17.96 6.58 17.12 7.66 15.95 7.78C14.6 7.92 13.46 6.86 13.46 5.54V4.5C13.46 3.95 13.01 3.5 12.46 3.5H11.54C10.99 3.5 10.54 3.95 10.54 4.5V5.54C10.54 6.33 10.13 7.03 9.51 7.42C9.42 7.48 9.32 7.53 9.22 7.58C9.13 7.63 9.03 7.67 8.92 7.7C8.8 7.74 8.67 7.77 8.53 7.78C8.37 7.8 8.21 7.8 8.05 7.78C7.91 7.77 7.78 7.74 7.66 7.7C7.56 7.67 7.46 7.63 7.36 7.58C7.26 7.53 7.16 7.48 7.07 7.42C6.44 6.98 6.04 6.22 6.04 5.41V5.31C6.04 4.54 5.22 4.08 4.57 4.41C4.56 4.42 4.55 4.42 4.54 4.43C4.5 4.45 4.47 4.47 4.43 4.5C4.4 4.53 4.36 4.55 4.33 4.58C4.05 4.8 3.8 5.05 3.59 5.32C3.48 5.44 3.39 5.57 3.31 5.7C3.3 5.71 3.29 5.72 3.28 5.74C3.19 5.87 3.11 6.02 3.04 6.16C3.02 6.18 3.01 6.19 3.01 6.21C2.95 6.33 2.89 6.45 2.85 6.58C2.82 6.63 2.81 6.67 2.79 6.72C2.73 6.87 2.69 7.02 2.65 7.17C2.61 7.31 2.58 7.46 2.56 7.61C2.54 7.72 2.53 7.83 2.52 7.95C2.51 8.09 2.5 8.23 2.5 8.37V17.13C2.5 19.82 4.68 22 7.37 22H16.63C19.32 22 21.5 19.82 21.5 17.13V8.37C21.5 6.78 20.74 5.39 19.57 4.5ZM12 17.42H7.36C6.95 17.42 6.61 17.08 6.61 16.67C6.61 16.25 6.95 15.91 7.36 15.91H12C12.42 15.91 12.75 16.25 12.75 16.67C12.75 17.08 12.42 17.42 12 17.42ZM14.78 13.71H7.36C6.95 13.71 6.61 13.37 6.61 12.96C6.61 12.54 6.95 12.2 7.36 12.2H14.78C15.2 12.2 15.54 12.54 15.54 12.96C15.54 13.37 15.2 13.71 14.78 13.71Z"
        fill="currentColor"
      />
    </svg>
  ),
  removed: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M5.97 1H3.03C1.76 1 1 1.76 1 3.03V5.97C1 7.24 1.76 8 3.03 8H5.97C7.24 8 8 7.24 8 5.97V3.03C8 1.76 7.24 1 5.97 1ZM6.47 5.56C6.72 5.81 6.72 6.22 6.47 6.47C6.34 6.59 6.17 6.65 6.01 6.65C5.85 6.65 5.69 6.59 5.56 6.47L4.49 5.41L3.45 6.47C3.32 6.59 3.16 6.65 2.98 6.65C2.82 6.65 2.66 6.59 2.53 6.47C2.28 6.22 2.28 5.81 2.53 5.56L3.6 4.5L2.54 3.45C2.29 3.2 2.29 2.79 2.54 2.54C2.79 2.29 3.2 2.29 3.45 2.54L4.49 3.6L5.55 2.54C5.8 2.29 6.21 2.29 6.46 2.54C6.71 2.79 6.71 3.2 6.46 3.45L5.41 4.5L6.47 5.56Z"
        fill="currentColor"
      />
      <path
        d="M21.4995 15.8197C21.4995 15.9697 21.4495 16.1197 21.3195 16.2497C19.8695 17.7097 17.2895 20.3097 15.8095 21.7997C15.6795 21.9397 15.5095 21.9997 15.3395 21.9997C15.0095 21.9997 14.6895 21.7397 14.6895 21.3597V17.8597C14.6895 16.3997 15.9295 15.1897 17.4495 15.1897C18.3995 15.1797 19.7195 15.1797 20.8495 15.1797C21.2395 15.1797 21.4995 15.4897 21.4995 15.8197Z"
        fill="currentColor"
      />
      <path
        d="M21.4995 15.8197C21.4995 15.9697 21.4495 16.1197 21.3195 16.2497C19.8695 17.7097 17.2895 20.3097 15.8095 21.7997C15.6795 21.9397 15.5095 21.9997 15.3395 21.9997C15.0095 21.9997 14.6895 21.7397 14.6895 21.3597V17.8597C14.6895 16.3997 15.9295 15.1897 17.4495 15.1897C18.3995 15.1797 19.7195 15.1797 20.8495 15.1797C21.2395 15.1797 21.4995 15.4897 21.4995 15.8197Z"
        fill="currentColor"
      />
      <path
        d="M16.63 2H10.5C9.95 2 9.5 2.45 9.5 3V6.5C9.5 8.16 8.16 9.5 6.5 9.5H3.5C2.95 9.5 2.5 9.95 2.5 10.5V17.13C2.5 19.82 4.68 22 7.37 22H12.19C12.74 22 13.19 21.55 13.19 21V17.86C13.19 15.56 15.1 13.69 17.45 13.69C17.98 13.68 19.27 13.68 20.5 13.68C21.05 13.68 21.5 13.24 21.5 12.68V6.87C21.5 4.18 19.32 2 16.63 2ZM8.72 17.01H6.08C5.67 17.01 5.33 16.67 5.33 16.26C5.33 15.84 5.67 15.5 6.08 15.5H8.72C9.15 15.5 9.47 15.84 9.47 16.26C9.47 16.67 9.15 17.01 8.72 17.01ZM11.51 13.3H6.08C5.67 13.3 5.33 12.96 5.33 12.55C5.33 12.13 5.67 11.79 6.08 11.79H11.51C11.92 11.79 12.27 12.13 12.27 12.55C12.27 12.96 11.92 13.3 11.51 13.3Z"
        fill="currentColor"
      />
    </svg>
  ),
  locked: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M18.75 8V10.1C18.31 10.04 17.81 10.01 17.25 10V8C17.25 4.85 16.36 2.75 12 2.75C7.64 2.75 6.75 4.85 6.75 8V10C6.19 10.01 5.69 10.04 5.25 10.1V8C5.25 5.1 5.95 1.25 12 1.25C18.05 1.25 18.75 5.1 18.75 8Z"
        fill="currentColor"
      />
      <path
        d="M18.75 10.1C18.31 10.04 17.81 10.01 17.25 10H6.75C6.19 10.01 5.69 10.04 5.25 10.1C2.7 10.41 2 11.66 2 15V17C2 21 3 22 7 22H17C21 22 22 21 22 17V15C22 11.66 21.3 10.41 18.75 10.1ZM8.71 16.71C8.52 16.89 8.26 17 8 17C7.87 17 7.74 16.97 7.62 16.92C7.49 16.87 7.39 16.8 7.29 16.71C7.11 16.52 7 16.26 7 16C7 15.87 7.03 15.74 7.08 15.62C7.13 15.5 7.2 15.39 7.29 15.29C7.39 15.2 7.49 15.13 7.62 15.08C7.99 14.92 8.43 15.01 8.71 15.29C8.8 15.39 8.87 15.5 8.92 15.62C8.97 15.74 9 15.87 9 16C9 16.26 8.89 16.52 8.71 16.71ZM12.92 16.38C12.87 16.5 12.8 16.61 12.71 16.71C12.52 16.89 12.26 17 12 17C11.73 17 11.48 16.89 11.29 16.71C11.2 16.61 11.13 16.5 11.08 16.38C11.03 16.26 11 16.13 11 16C11 15.73 11.11 15.48 11.29 15.29C11.66 14.92 12.33 14.92 12.71 15.29C12.89 15.48 13 15.73 13 16C13 16.13 12.97 16.26 12.92 16.38ZM16.71 16.71C16.52 16.89 16.26 17 16 17C15.74 17 15.48 16.89 15.29 16.71C15.11 16.52 15 16.27 15 16C15 15.73 15.11 15.48 15.29 15.29C15.67 14.92 16.34 14.92 16.71 15.29C16.75 15.34 16.79 15.39 16.83 15.45C16.87 15.5 16.9 15.56 16.92 15.62C16.95 15.68 16.97 15.74 16.98 15.8C16.99 15.87 17 15.94 17 16C17 16.26 16.89 16.52 16.71 16.71Z"
        fill="currentColor"
      />
    </svg>
  ),
  banned: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M12.0002 14C6.99016 14 2.91016 17.36 2.91016 21.5C2.91016 21.78 3.13016 22 3.41016 22H20.5902C20.8702 22 21.0902 21.78 21.0902 21.5C21.0902 17.36 17.0102 14 12.0002 14Z"
        fill="currentColor"
      />
      <path
        d="M15.71 3.66C14.81 2.64 13.47 2 12 2C10.6 2 9.32 2.57 8.41 3.51C7.54 4.41 7 5.65 7 7C7 7.94 7.26 8.82 7.73 9.57C7.98 10 8.3 10.39 8.68 10.71C9.55 11.51 10.71 12 12 12C13.83 12 15.41 11.02 16.28 9.57C16.54 9.14 16.74 8.66 16.85 8.16C16.95 7.79 17 7.4 17 7C17 5.72 16.51 4.55 15.71 3.66ZM13.87 7.92H10.13C9.61 7.92 9.19 7.5 9.19 6.98C9.19 6.46 9.61 6.04 10.13 6.04H13.87C14.39 6.04 14.81 6.46 14.81 6.98C14.81 7.5 14.39 7.92 13.87 7.92Z"
        fill="currentColor"
      />
    </svg>
  ),
  mods: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M18.5002 4.11031L13.5102 2.24031C12.6802 1.93031 11.3202 1.93031 10.4902 2.24031L5.50016 4.11031C4.35016 4.54031 3.41016 5.90031 3.41016 7.12031V14.5503C3.41016 15.7303 4.19016 17.2803 5.14016 17.9903L9.44016 21.2003C10.8502 22.2603 13.1702 22.2603 14.5802 21.2003L18.8802 17.9903C19.8302 17.2803 20.6102 15.7303 20.6102 14.5503V7.12031C20.5902 5.90031 19.6502 4.54031 18.5002 4.11031ZM11.9302 7.03031C13.1102 7.03031 14.0702 7.99031 14.0702 9.17031C14.0702 10.3303 13.1602 11.2603 12.0102 11.3003H11.9902H11.9702C11.9502 11.3003 11.9302 11.3003 11.9102 11.3003C10.7102 11.2603 9.81016 10.3303 9.81016 9.17031C9.80016 7.99031 10.7602 7.03031 11.9302 7.03031ZM14.1902 16.3603C13.5802 16.7603 12.7902 16.9703 12.0002 16.9703C11.2102 16.9703 10.4102 16.7703 9.81016 16.3603C9.24016 15.9803 8.93016 15.4603 8.92016 14.8903C8.92016 14.3303 9.24016 13.7903 9.81016 13.4103C11.0202 12.6103 12.9902 12.6103 14.2002 13.4103C14.7702 13.7903 15.0902 14.3103 15.0902 14.8803C15.0802 15.4403 14.7602 15.9803 14.1902 16.3603Z"
        fill="currentColor"
      />
    </svg>
  ),
};

const Modtools = () => {
  const dispatch = useDispatch();
  const { name: communityName } = useParams<{ [key: string]: string }>();

  // Modtools resides in a protected router; hence there is always a logged in user.
  const user = (useSelector<RootState>((state) => state.main.user) as MainState['user'])!;

  const community = useSelector(selectCommunity(communityName));
  const [loading, setLoading] = useState(community ? 'loaded' : 'loading');
  useEffect(() => {
    if (community) return;
    (async () => {
      setLoading('loading');
      try {
        const res = await mfetch(`/api/communities/${communityName}?byName=true`);
        if (!res.ok) {
          if (res.status === 404) {
            setLoading('notfound');
            return;
          }
          throw new APIError(res.status, await res.json());
        }
        const rcomm = await res.json();
        dispatch(communityAdded(rcomm));
        setLoading('loaded');
      } catch (error) {
        setLoading('error');
        dispatch(snackAlertError(error));
      }
    })();
  }, [communityName, community, dispatch]);

  const getSidebarMenuItemLink = (page: string) => `/${communityName}/modtools/${page}`;

  const { path } = useRouteMatch();

  if (loading !== 'loaded') {
    return <PageNotLoaded loading={loading} />;
  }

  if (!(community.userMod || (user && user.isAdmin))) {
    return <Forbidden />;
  }

  const title = (
    <span>
      <Link to={`/${communityName}`}>+{communityName}</Link> Modtools
    </span>
  );

  return (
    <Dashboard
      className="modtools"
      title={title}
      sidebarMenu={[
        { type: 'topic', name: 'Settings' },
        {
          name: 'Community settings',
          to: getSidebarMenuItemLink('settings'),
          icon: <SVGSettings />,
        },
        { name: 'Rules', to: getSidebarMenuItemLink('rules'), icon: svgs.rules },
        { type: 'topic', name: 'Content' },
        { name: 'Reports', to: getSidebarMenuItemLink('reports'), icon: svgs.reports },
        { name: 'Removed', to: getSidebarMenuItemLink('removed'), icon: svgs.removed },
        { name: 'Locked', to: getSidebarMenuItemLink('locked'), icon: svgs.locked },
        { type: 'topic', name: 'Users' },
        { name: 'Banned', to: getSidebarMenuItemLink('banned'), icon: svgs.banned },
        { name: 'Moderators', to: getSidebarMenuItemLink('mods'), icon: svgs.mods },
      ]}
    >
      <Helmet>
        <title>Modtools</title>
      </Helmet>
      <Switch>
        <Route exact path={path}>
          <Redirect to={`/${communityName}/modtools/settings`} />
        </Route>
        <Route exact path={`${path}/settings`}>
          <Settings community={community} />
        </Route>
        <Route path={`${path}/reports`}>
          <Reports community={community} />
        </Route>
        <Route path={`${path}/removed`}>
          <Removed community={community} filter="deleted" title="Removed" />
        </Route>
        <Route path={`${path}/locked`}>
          <Removed community={community} filter="locked" title="Locked" />
        </Route>
        <Route path={`${path}/banned`}>
          <Banned community={community} />
        </Route>
        <Route path={`${path}/mods`}>
          <Mods community={community} />
        </Route>
        <Route path={`${path}/rules`}>
          <Rules community={community} />
        </Route>
        <Route path="*">
          <div className="modtools-content flex flex-center">Not found.</div>
        </Route>
      </Switch>
    </Dashboard>
  );
};

export default Modtools;
