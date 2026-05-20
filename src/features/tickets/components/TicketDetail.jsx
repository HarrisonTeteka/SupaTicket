import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Pencil, Trash2, X } from 'lucide-react';
import { useAuth } from '../../auth/components/AuthGate';
import { useComments } from '../hooks/useComments';
import { deleteTicket, updateTicket } from '../services/ticketsService';
import { StatusBadge } from './StatusBadge';
import { PriorityBadge } from './PriorityBadge';
import { AssigneePicker } from './AssigneePicker';
import { CommentList } from './CommentList';
import { CommentForm } from './CommentForm';
import { AttachmentList } from './AttachmentList';
import { AttachmentUploader } from './AttachmentUploader';
import { SubTicketList } from './SubTicketList';
import { Select } from '../../../shared/components/Select';
import { Button } from '../../../shared/components/Button';
import { Textarea } from '../../../shared/components/Input';
import {
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  formatDateTime,
  formatTicketNumber,
} from '../tickets.utils';

/**
 * Full ticket detail view: editable title meta, description, comments thread,
 * attachments and sub-tickets. `onLocalChange` lets the parent page apply an
 * updated ticket immediately (realtime confirms it shortly after).
 */
export function TicketDetail({ ticket, onLocalChange }) {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const { comments, loading: commentsLoading } = useComments(ticket.id);

  const [editingDesc, setEditingDesc] = useState(false);
  const [desc, setDesc] = useState(ticket.description);
  const [savingField, setSavingField] = useState(null);
  const [actionError, setActionError] = useState('');

  const patch = async (field, values) => {
    setSavingField(field);
    setActionError('');
    try {
      const updated = await updateTicket(ticket.id, values);
      onLocalChange?.(updated);
    } catch (err) {
      setActionError(err.message || 'Update failed.');
    } finally {
      setSavingField(null);
    }
  };

  const saveDescription = async () => {
    await patch('description', { description: desc.trim() });
    setEditingDesc(false);
  };

  const handleAssignee = (person) => {
    patch('assigned_to', {
      assigned_to: person?.id ?? null,
      assignee_name: person?.name ?? null,
    });
  };

  const handleDelete = async () => {
    if (
      !window.confirm(
        `Delete ticket ${formatTicketNumber(ticket.ticket_number)}? This cannot be undone.`
      )
    ) {
      return;
    }
    try {
      await deleteTicket(ticket.id);
      navigate('/tickets');
    } catch (err) {
      setActionError(err.message || 'Could not delete ticket.');
    }
  };

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={() => navigate('/tickets')}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#12344d]"
      >
        <ArrowLeft size={15} /> Back to tickets
      </button>

      {actionError && (
        <div className="p-3 bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl">
          {actionError}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-gray-200 rounded-2xl p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1 text-xs text-gray-400 font-bold">
                  <span>{formatTicketNumber(ticket.ticket_number)}</span>
                  <span>·</span>
                  <span>{ticket.category}</span>
                </div>
                <h1 className="text-xl font-black text-[#12344d]">{ticket.title}</h1>
              </div>
              {isAdmin && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDelete}
                  className="text-red-500 hover:text-red-600 hover:bg-red-50 shrink-0"
                >
                  <Trash2 size={14} /> Delete
                </Button>
              )}
            </div>

            <div className="mt-5">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">
                  Description
                </h3>
                {!editingDesc && (
                  <button
                    type="button"
                    onClick={() => {
                      setDesc(ticket.description);
                      setEditingDesc(true);
                    }}
                    className="text-gray-400 hover:text-[#12344d]"
                    title="Edit description"
                  >
                    <Pencil size={13} />
                  </button>
                )}
              </div>
              {editingDesc ? (
                <div className="space-y-2">
                  <Textarea
                    name="description"
                    value={desc}
                    onChange={(e) => setDesc(e.target.value)}
                    rows={5}
                  />
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setEditingDesc(false)}>
                      <X size={14} /> Cancel
                    </Button>
                    <Button
                      size="sm"
                      loading={savingField === 'description'}
                      onClick={saveDescription}
                      disabled={!desc.trim()}
                    >
                      <Check size={14} /> Save
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{ticket.description}</p>
              )}
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-black text-[#12344d] uppercase tracking-wide">
              Comments {comments.length > 0 && `(${comments.length})`}
            </h3>
            <CommentList comments={comments} loading={commentsLoading} />
            <CommentForm ticketId={ticket.id} />
          </div>
        </div>

        {/* Side column */}
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <StatusBadge status={ticket.status} />
              <PriorityBadge priority={ticket.priority} />
            </div>
            <Select
              label="Status"
              options={TICKET_STATUSES}
              value={ticket.status}
              disabled={savingField === 'status'}
              onChange={(e) => patch('status', { status: e.target.value })}
            />
            <Select
              label="Priority"
              options={TICKET_PRIORITIES}
              value={ticket.priority}
              disabled={savingField === 'priority'}
              onChange={(e) => patch('priority', { priority: e.target.value })}
            />
            <AssigneePicker
              label="Assignee"
              value={ticket.assigned_to}
              valueName={ticket.assignee_name}
              onChange={handleAssignee}
            />
            <div className="pt-3 border-t border-gray-100 text-xs text-gray-400 space-y-1">
              <p>
                Raised by{' '}
                <span className="font-bold text-gray-600">
                  {ticket.creator_name || 'Unknown'}
                </span>
              </p>
              <p>{formatDateTime(ticket.created_at)}</p>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-3">
            <h3 className="text-sm font-black text-[#12344d] uppercase tracking-wide">
              Attachments
            </h3>
            <AttachmentList
              ticket={ticket}
              onChange={(next) => onLocalChange?.({ ...ticket, attachments: next })}
            />
            <AttachmentUploader
              ticket={ticket}
              onChange={(next) => onLocalChange?.({ ...ticket, attachments: next })}
            />
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-5">
            <SubTicketList parentId={ticket.id} />
          </div>
        </div>
      </div>
    </div>
  );
}
