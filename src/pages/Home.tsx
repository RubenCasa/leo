import React from 'react';
import { Hero } from '../components/Hero';
import { Products } from '../components/Products';
import { History } from '../components/History';
import { Contact } from '../components/Contact';

export const Home: React.FC = () => {
  return (
    <main>
      <Hero />
      <History />
      <Products />
      <Contact />
    </main>
  );
};
