import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Send, Ticket } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../auth/components/AuthGate';
import {
  addMyComment,
  getMyTicket,
  listMyComments,
} from '../services/portalService';
import { PortalCommentList } from '../components/PortalCommentList';
import { StatusBadge } from '../../tickets/components/StatusBadge';
import { PriorityBadge } from '../../tickets/components/PriorityBadge';
import { SatisfactionRating } from '../../tickets/components/SatisfactionRating';
import { Button } from '../../../shared/components/Button';
import { Textarea } from '../../../shared/components/Input';
import { EmptyState } from '../../../shared/components/EmptyState';
import { formatDateTime, formatTicketNumber } from '../../tickets/tickets.utils';

/** Customer ticket view: meta, description, comments, reply form, CSAT. */
export default function PortalTicketDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();

  const [ticket, setTicket] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [commentText, setCommentText] = useState('');
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState('');

  useEffect(() => {
    if (!id) return undefined;
    let cancelled = false;

    const load = async () => {
      try {
        const [t, cs] = await Promise.all([getMyTicket(id), listMyComments(id)]);
        if (!cancelled) {
          setTicket(t);
          setComments(cs);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) setError(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    const reloadTicket = async () => {
      const t = await getMyTicket(id);
      if (!cancelled) setTicket(t);
    };
    const reloadComments = async () => {
      const cs = await listMyComments(id);
      if (!cancelled) setComments(cs);
    };

    const ticketChannel = supabase
      .channel(`portal:ticket:${id}:${crypto.randomUUID()}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tickets', filter: `id=eq.${id}` },
        reloadTicket
      )
      .subscribe();

    const commentsChannel = supabase
      .channel(`portal:comments:${id}:${crypto.randomUUID()}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'comments', filter: `ticket_id=eq.${id}` },
        reloadComments
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(ticketChannel);
      supabase.removeChannel(commentsChannel);
    };
  }, [id]);

  const postComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    setPosting(true);
    setPostError('');
    try {
      await addMyComment({ ticketId: id, text: commentText }, profile);
      setCommentText('');
    } catch (err) {
      setPostError(err.message || 'Could not post reply.');
    } finally {
      setPosting(false);
    }
  };

  if (loading) {
    return <div className="h-64 bg-white border border-gray-200 rounded-2xl animate-pulse" />;
  }

  if (error || !ticket) {
    return (
      <EmptyState
        icon={Ticket}
        title="Ticket not found"
        description="This ticket doesn't exist, or you don't have access to it."
      />
    );
  }

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => navigate('/portal')}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#336021]"
      >
        <ArrowLeft size={15} /> Back to my tickets
      </button>

      <div className="bg-white border border-gray-200 rounded-2xl p-6">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1 text-xs text-gray-400 font-bold">
              <span>{formatTicketNumber(ticket.ticket_number)}</span>
              <span>·</span>
              <span>{ticket.category}</span>
            </div>
            <h1 className="text-xl font-black text-[#336021]">{ticket.title}</h1>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <PriorityBadge priority={ticket.priority} />
            <StatusBadge status={ticket.status} />
          </div>
        </div>

        <p className="text-sm text-gray-700 whitespace-pre-wrap">{ticket.description}</p>

        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
          <span>Raised {formatDateTime(ticket.created_at)}</span>
          <span>
            Assigned to{' '}
            <span className="font-bold text-gray-600">
              {ticket.assignee_name || 'Unassigned'}
            </span>
          </span>
        </div>

        {ticket.status === 'Resolved' && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <SatisfactionRating
              ticket={ticket}
              canRate={profile?.id === ticket.created_by}
              onRated={setTicket}
            />
          </div>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
        <h3 className="text-sm font-black text-[#336021] uppercase tracking-wide">
          Replies {comments.length > 0 && `(${comments.length})`}
        </h3>

        <PortalCommentList comments={comments} loading={false} />

        <form onSubmit={postComment} className="space-y-2 pt-2 border-t border-gray-100">
          <Textarea
            name="comment"
            rows={3}
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Write a reply..."
          />
          {postError && <p className="text-xs text-red-600">{postError}</p>}
          <div className="flex justify-end">
            <Button type="submit" loading={posting} disabled={!commentText.trim()}>
              <Send size={14} /> Reply
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
