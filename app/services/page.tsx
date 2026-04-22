import { Metadata } from 'next';
import ServicesClient from './ServicesClient';

export const metadata: Metadata = {
  title: 'Professional E-commerce Services | Smart Seller Tools',
  description: 'Expert Amazon, Flipkart, and Meesho account management, PPC optimization, and listing services.',
};

export default function ServicesPage() {
  return <ServicesClient />;
}