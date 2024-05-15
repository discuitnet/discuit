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
  /* The feed of each list is stored in the feedsSlice. */
};

const typeUsersListsAdded = 'lists/usersListsAdded';
const typeListsOrderChanged = 'lists/orderChanged';
const typeListsFilterChanged = 'lists/filterChanged';

export default function listsReducer(state = initialState, action) {
  switch (action.type) {
    case typeUsersListsAdded: {
      const { username, lists, order, filter } = action.payload;
      console.log(action.payload);
      let newItems = {};
      let newIds = [];
      lists.forEach((list) => {
        if (!state.items[list.id]) {
          newIds.push(list.id);
          newItems[list.id] = list;
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
