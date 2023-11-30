const initialState = {
  names: [],
  items: {},
};

const typeCommunityAdded = 'communities/communityAdded';

export default function communitiesReducer(state = initialState, action) {
  switch (action.type) {
    case typeCommunityAdded: {
      const community = action.payload;
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

export const selectCommunity = (name) => (state) => state.communities.items[name];

export const communityAdded = (community) => {
  return { type: typeCommunityAdded, payload: community };
};

export const communitiesAdded =
  (list = []) =>
  (dispatch) => {
    list.forEach((item) => dispatch(communityAdded(item)));
  };
