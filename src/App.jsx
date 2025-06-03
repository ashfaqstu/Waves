import { RouterProvider } from 'react-router-dom';
import approute from './route/route';
import './index.css';
function App() {
  return (
    <RouterProvider router={approute} /> 
  );
}

export default App;
