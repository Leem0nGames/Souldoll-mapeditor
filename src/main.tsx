import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { validateDataDefinitions } from './data/validation';
import { runTests } from './core/tests';
import { ErrorHandler } from './core/errorHandler';
import './index.css';

ErrorHandler.init();
validateDataDefinitions();
runTests();

createRoot(document.getElementById('root')!).render(<App />);
