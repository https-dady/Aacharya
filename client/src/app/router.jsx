import { Route, Routes } from 'react-router-dom';

/**

* Central application router.
*
* The current application is rendered through the children prop so the
* existing authentication UI continues to work while individual pages
* are migrated to dedicated route components.
*
* Future auth pages will be registered here as the migration progresses.
  */
  export default function AppRouter({ children }) {
  return ( <Routes> <Route path="*" element={children} /> </Routes>
  );
  }
