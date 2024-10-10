import { applyMiddleware, createStore } from 'redux';
import { composeWithDevTools } from 'redux-devtools-extension';
import thunkMiddleware from 'redux-thunk';
import rootReducer from './reducer';

const store = createStore(rootReducer, composeWithDevTools(applyMiddleware(thunkMiddleware)));

export type UnknownAction = { type: string; payload: unknown };
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;
