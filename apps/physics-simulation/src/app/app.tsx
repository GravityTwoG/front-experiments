import { Route, Routes, Link } from 'react-router-dom';

import { routes } from './routes';

export function App() {
  return (
    <div>
      <div role="navigation">
        <ul>
          {routes.map((route) => (
            <li key={route.path}>
              <Link to={route.path}>{route.name}</Link>
            </li>
          ))}
        </ul>
      </div>

      <Routes>
        {routes.map((route) => (
          <Route
            key={route.path}
            path={route.path}
            Component={route.component}
          />
        ))}
      </Routes>
    </div>
  );
}

export default App;
