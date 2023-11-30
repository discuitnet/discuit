const initialState = {
  usernames: [],
  items: {},
};

const typeUserAdded = 'users/userAdded';

export default function usersReducer(state = initialState, action) {
  switch (action.type) {
    case typeUserAdded: {
      const user = action.payload;
      const exists = Boolean(state.items[user.username]);
      return {
        ...state,
        usernames: exists ? [...state.usernames, user.username] : state.usernames,
        items: {
          ...state.items,
          [user.username]: user,
        },
      };
    }
    default:
      return state;
  }
}

export const selectUser = (username) => (state) => state.users.items[username];

export const userAdded = (user) => {
  return { type: typeUserAdded, payload: user };
};
