import { CustomersList } from '../components/CustomersList';

/** Top-level Customers page reached from the sidebar. */
export default function CustomersPage() {
  return (
    <div className="pt-4 sm:pt-6 md:pt-8">
      <CustomersList />
    </div>
  );
}
