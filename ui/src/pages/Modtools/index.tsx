import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useDispatch, useSelector } from 'react-redux';
import { Link, Redirect, Route, Switch, useParams, useRouteMatch } from 'react-router-dom';
import Dashboard from '../../components/Dashboard';
import { SidebarMenuItem, SidebarTopic } from '../../components/Dashboard/Sidebar';
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
      sidebarMenu={
        <>
          <SidebarMenuItem
            name="Community settings"
            to={getSidebarMenuItemLink('settings')}
            icon={<SVGSettings />}
          />
          <SidebarTopic name="Content" />
          <SidebarMenuItem
            name="Reports"
            to={getSidebarMenuItemLink('reports')}
            icon={<SVGSettings />}
          />
          <SidebarMenuItem
            name="Removed"
            to={getSidebarMenuItemLink('removed')}
            icon={<SVGSettings />}
          />
          <SidebarMenuItem
            name="Locked"
            to={getSidebarMenuItemLink('locked')}
            icon={<SVGSettings />}
          />
          <SidebarTopic name="Users" />
          <SidebarMenuItem
            name="Banned"
            to={getSidebarMenuItemLink('banned')}
            icon={<SVGSettings />}
          />
          <SidebarMenuItem
            name="Moderators"
            to={getSidebarMenuItemLink('mods')}
            icon={<SVGSettings />}
          />
          <SidebarTopic name="Rules" />
          <SidebarMenuItem
            name="Rules"
            to={getSidebarMenuItemLink('rules')}
            icon={<SVGSettings />}
          />
        </>
      }
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
