import { RouterProvider } from 'react-router-dom';
import approute from './route/route';
import './index.css';
import useButtonSounds from './hooks/useButtonSounds';
function App() {
  useButtonSounds();
  return (
    <RouterProvider router={approute} /> 
  );
}

export default App;
