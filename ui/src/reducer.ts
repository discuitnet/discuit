import { combineReducers } from 'redux';
import commentsReducer from './slices/commentsSlice';
import communitiesReducer from './slices/communitiesSlice';
import feedsReducer from './slices/feedsSlice';
import listsReducer from './slices/listsSlice';
import mainReducer from './slices/mainSlice';
import postsReducer from './slices/postsSlice';
import usersReducer from './slices/usersSlice';

const rootReducer = combineReducers({
  main: mainReducer,
  posts: postsReducer,
  feeds: feedsReducer,
  comments: commentsReducer,
  communities: communitiesReducer,
  users: usersReducer,
  lists: listsReducer,
});

export default rootReducer;
