import { Community } from '../serverTypes';
import { AppDispatch, RootState } from '../store';

export interface CommunitiesState {
  names: string[];
  items: { [name: string]: Community };
}

const initialState: CommunitiesState = {
  names: [],
  items: {},
};

const typeCommunityAdded = 'communities/communityAdded';

export default function communitiesReducer(
  state: CommunitiesState = initialState,
  action: { type: string; payload: unknown }
): CommunitiesState {
  switch (action.type) {
    case typeCommunityAdded: {
      const community = action.payload as Community;
      const exists = new Boolean(state.items[community.name]);
      return {
        ...state,
        names: exists ? state.names : [...state.names, community.name],
        items: {
          ...state.items,
          [community.name]: exists ? { ...state.items[community.name], ...community } : community,
        },
      };
    }
    default:
      return state;
  }
}

export const selectCommunity = (name: string) => (state: RootState) =>
  state.communities.items[name];

export const communityAdded = (community: Community) => {
  return { type: typeCommunityAdded, payload: community };
};

export const communitiesAdded =
  (list: Community[] = []) =>
  (dispatch: AppDispatch) => {
    list.forEach((item) => dispatch(communityAdded(item)));
  };
