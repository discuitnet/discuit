import { User } from '../serverTypes';
import { RootState } from '../store';

export interface UsersState {
  usernames: string[];
  items: { [key: string]: User | undefined };
}

const initialState: UsersState = {
  usernames: [],
  items: {},
};

const typeUserAdded = 'users/userAdded';

export default function usersReducer(
  state: UsersState = initialState,
  action: { type: string; payload: unknown }
): UsersState {
  switch (action.type) {
    case typeUserAdded: {
      const user = action.payload as User;
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

export const selectUser = (username: string) => (state: RootState) => state.users.items[username];

export const userAdded = (user: User) => {
  return { type: typeUserAdded, payload: user };
};
