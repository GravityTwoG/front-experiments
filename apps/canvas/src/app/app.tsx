import { Route, Routes, Link } from 'react-router-dom';

import { routes } from './routes';
import {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuLink,
  navigationMenuTriggerStyle,
} from '@front-experiments/ui/components/ui/navigation-menu';

export function App() {
  return (
    <div className="max-w-5xl mx-auto">
      <NavigationMenu className="p-1">
        <NavigationMenuList>
          {routes.map((route) => (
            <NavigationMenuItem key={route.path}>
              <Link to={route.path}>
                <NavigationMenuLink
                  className={navigationMenuTriggerStyle()}
                  asChild
                >
                  <span>{route.name}</span>
                </NavigationMenuLink>
              </Link>
            </NavigationMenuItem>
          ))}
        </NavigationMenuList>
      </NavigationMenu>

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
