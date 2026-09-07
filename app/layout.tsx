import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata={title:'Sylva — Floresta viva',description:'Entre em uma floresta viva. Explore livremente entre árvores, samambaias, musgo e luz.'};
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="pt-BR"><body>{children}</body></html>;}
