const initialState = {
  ids: [], // Array of list ids.
  usersLists: {
    /*
    ["username"]:  {
      listIds: [], 
      order: "name",  // one of: name, lastAdded.
      filter: "all", // one of: all, public, private.
    }
    */
  },
  items: {
    /*
    ["list_id"]: {
        ... list object fields,
    }
    */
  },
  nameToId: {
    /*
    ["username_listname"]: list_id,
    */
  },
  /* The feed of each list is stored in the feedsSlice. */
};

const typeUsersListsAdded = 'lists/usersListsAdded';
const typeListsOrderChanged = 'lists/orderChanged';
const typeListsFilterChanged = 'lists/filterChanged';
const typeListAdded = `lists/listAdded`;

export default function listsReducer(state = initialState, action) {
  switch (action.type) {
    case typeUsersListsAdded: {
      const { username, lists, order, filter } = action.payload;
      let newItems = {};
      const newNameToIds = {};
      let newIds = [];
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
      const { username, order } = action.payload;
      return {
        ...state,
        usersLists: {
          ...state.usersLists,
          [username]: {
            ...state.usersLists[username],
            listIds: null,
            order,
          },
        },
      };
    }
    case typeListsFilterChanged: {
      const { username, filter } = action.payload;
      return {
        ...state,
        usersLists: {
          ...state.usersLists,
          [username]: {
            ...state.usersLists[username],
            listIds: null,
            filter,
          },
        },
      };
    }
    case typeListAdded: {
      const { username, list } = action.payload;
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

const defaultOrder = 'lastAdded';
const defaultFilter = 'all';

/** Actions:  */

export const usersListsAdded = (
  username,
  lists = [],
  order = defaultOrder,
  filter = defaultFilter
) => {
  return { type: typeUsersListsAdded, payload: { username, lists, order, filter } };
};

export const listsOrderChanged = (username, order) => {
  return { type: typeListsOrderChanged, payload: { username, order } };
};

export const listsFilterChanged = (username, filter) => {
  return { type: typeListsFilterChanged, payload: { username, filter } };
};

export const listAdded = (username, list) => {
  return { type: typeListAdded, payload: { username, list } };
};

/** Selectors:  */

export const selectUsersLists = (username) => (state) => {
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

export const selectList = (username, listname) => (state) => {
  const listId = state.lists.nameToId[nameToIdKey(username, listname)];
  if (!listId) {
    return null;
  }
  return state.lists.items[listId];
};

const nameToIdKey = (username, listname) => {
  return `${username}_${listname}`;
};
