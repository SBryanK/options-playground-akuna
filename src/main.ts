import './styles.css';
import { mountApp } from './ui/app';

// Restore theme preference before first paint.
const storedTheme = localStorage.getItem('theme');
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
if (storedTheme === 'dark' || (!storedTheme && prefersDark)) {
  document.documentElement.classList.add('dark');
}

const root = document.getElementById('app');
if (!root) throw new Error('Missing #app root element');
mountApp(root);
