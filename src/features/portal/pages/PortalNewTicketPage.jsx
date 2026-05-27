import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/components/AuthGate';
import { useToast } from '../../../shared/hooks/useToast';
import { createMyTicket, listPortalCategories } from '../services/portalService';
import { Input, Textarea } from '../../../shared/components/Input';
import { Select } from '../../../shared/components/Select';
import { Button } from '../../../shared/components/Button';
import { TICKET_PRIORITIES, formatTicketNumber } from '../../tickets/tickets.utils';

/** Customer's simplified "Raise Ticket" form (title/description/category/priority). */
export default function PortalNewTicketPage() {
  const { profile } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [categories, setCategories] = useState([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    listPortalCategories()
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!title.trim() || !description.trim() || !category) {
      setError('Please fill in all required fields.');
      return;
    }
    setBusy(true);
    try {
      const ticket = await createMyTicket(
        { title, description, category, priority },
        profile
      );
      showToast(`Ticket ${formatTicketNumber(ticket.ticket_number)} created`);
      navigate(`/portal/tickets/${ticket.id}`);
    } catch (err) {
      setError(err.message || 'Could not create ticket.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <h1 className="text-xl font-semibold mb-4">Raise a ticket</h1>
      <form
        onSubmit={submit}
        className="bg-surface border border-line-strong rounded-2xl p-6 space-y-4 max-w-2xl"
      >
        {error && (
          <div className="p-3 bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl">
            {error}
          </div>
        )}
        <Input
          label="Title"
          name="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Short summary of the issue"
        />
        <Textarea
          label="Description"
          name="description"
          rows={5}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What's going on?"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Category"
            placeholder="Select category"
            options={categories}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />
          <Select
            label="Priority"
            options={TICKET_PRIORITIES}
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={() => navigate('/portal')}>
            Cancel
          </Button>
          <Button type="submit" loading={busy}>
            Create ticket
          </Button>
        </div>
      </form>
    </div>
  );
}
