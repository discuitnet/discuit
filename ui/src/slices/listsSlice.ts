import { List } from '../serverTypes';
import { RootState } from '../store';

export type ListsFilter = 'all' | 'public' | 'private';
export type ListsOrder = 'lastAdded' | 'name';

type ListsStateItems = {
  [key: string]: List; // key is a list id
};

interface ListsState {
  ids: number[]; // list ids
  usersLists: {
    // key is a username
    [key: string]: {
      listIds: number[];
      order: ListsOrder;
      filter: ListsFilter;
    };
  };
  items: ListsStateItems;
  nameToId: {
    [key: string]: number; // key is of the format username_listname;
  };
  /* The feed of each list is stored in the feedsSlice. */
}

const initialState: ListsState = {
  ids: [],
  usersLists: {},
  items: {},
  nameToId: {},
};

const typeUsersListsAdded = 'lists/usersListsAdded';
const typeListsOrderChanged = 'lists/orderChanged';
const typeListsFilterChanged = 'lists/filterChanged';
const typeListAdded = `lists/listAdded`;

export default function listsReducer(
  state: ListsState = initialState,
  action: { type: string; payload: unknown }
): ListsState {
  switch (action.type) {
    case typeUsersListsAdded: {
      const { username, lists, order, filter } = action.payload as {
        username: string;
        lists: List[];
        order: ListsOrder;
        filter: ListsFilter;
      };
      const newItems: ListsStateItems = {};
      const newNameToIds: { [key: string]: number } = {};
      const newIds: number[] = [];
      lists.forEach((list) => {
        if (!state.items[list.id]) {
          newIds.push(list.id);
          newItems[list.id] = list;
        }
        const key = nameToIdKey(username, list.name);
        if (!state.nameToId[key]) {
          newNameToIds[key] = list.id;
        }
      });
      return {
        ...state,
        ids: [...state.ids, ...newIds],
        usersLists: {
          ...state.usersLists,
          [username]: {
            listIds: lists.map((list) => list.id),
            order,
            filter,
          },
        },
        items: {
          ...state.items,
          ...newItems,
        },
        nameToId: {
          ...state.nameToId,
          ...newNameToIds,
        },
      };
    }
    case typeListsOrderChanged: {
      const { username, order } = action.payload as { username: string; order: ListsOrder };
      return {
        ...state,
        usersLists: {
          ...state.usersLists,
          [username]: {
            ...state.usersLists[username],
            // listIds: null,
            order,
          },
        },
      };
    }
    case typeListsFilterChanged: {
      const { username, filter } = action.payload as { username: string; filter: ListsFilter };
      return {
        ...state,
        usersLists: {
          ...state.usersLists,
          [username]: {
            ...state.usersLists[username],
            // listIds: null,
            filter,
          },
        },
      };
    }
    case typeListAdded: {
      const { username, list } = action.payload as { username: string; list: List };
      return {
        ...state,
        items: {
          ...state.items,
          [list.id]: list,
        },
        nameToId: {
          ...state.nameToId,
          [nameToIdKey(username, list.name)]: list.id,
        },
      };
    }
    default:
      return state;
  }
}

const defaultOrder: ListsOrder = 'lastAdded';
const defaultFilter: ListsFilter = 'all';

/** Actions:  */

export const usersListsAdded = (
  username: string,
  lists: List[] = [],
  order: ListsOrder = defaultOrder,
  filter: ListsFilter = defaultFilter
) => {
  return { type: typeUsersListsAdded, payload: { username, lists, order, filter } };
};

export const listsOrderChanged = (username: string, order: ListsOrder) => {
  return { type: typeListsOrderChanged, payload: { username, order } };
};

export const listsFilterChanged = (username: string, filter: ListsFilter) => {
  return { type: typeListsFilterChanged, payload: { username, filter } };
};

export const listAdded = (username: string, list: List) => {
  return { type: typeListAdded, payload: { username, list } };
};

/** Selectors:  */

export const selectUsersLists = (username: string) => (state: RootState) => {
  if (!state.lists.usersLists[username]) {
    return { lists: null, order: defaultOrder, filter: defaultFilter };
  }
  const listsState = state.lists.usersLists[username];
  const ids = listsState.listIds;
  let items = null;
  if (ids) {
    items = [];
    ids.forEach((id) => {
      items.push(state.lists.items[id]);
    });
  }
  return {
    lists: items,
    order: listsState.order,
    filter: listsState.filter,
  };
};

export const selectList = (username: string, listname: string) => (state: RootState) => {
  const listId = state.lists.nameToId[nameToIdKey(username, listname)];
  if (!listId) {
    return null;
  }
  return state.lists.items[listId];
};

const nameToIdKey = (username: string, listname: string): string => {
  return `${username}_${listname}`;
};
