import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  AlertCircle, ArrowLeft, ShieldCheck, Clock,
  CheckCircle2, XCircle, Gavel, ChevronDown, ChevronUp
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';

// ─── Helpers ────────────────────────────────────────────────────────────────

const API = axios.create({ baseURL: '/api' });

API.interceptors.request.use(cfg => {
  const token = localStorage.getItem('token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

const STATUS_META = {
  active:    { label: 'Active',              color: 'bg-red-100 text-red-700',    icon: <XCircle className="h-3 w-3 mr-1" /> },
  appealed:  { label: 'Appeal Pending',      color: 'bg-amber-100 text-amber-700',icon: <Clock className="h-3 w-3 mr-1" /> },
  revoked:   { label: 'Sanction Revoked',    color: 'bg-green-100 text-green-700',icon: <CheckCircle2 className="h-3 w-3 mr-1" /> },
  expired:   { label: 'Expired',             color: 'bg-slate-100 text-slate-500', icon: null },
  pending_secondary_approval: {
    label: 'Pending 2nd Approval',
    color: 'bg-orange-100 text-orange-700',
    icon: <Gavel className="h-3 w-3 mr-1" />
  }
};

const ACTION_LABELS = { warning: 'Warning', temp_ban: 'Temporary Ban', perm_ban: 'Permanent Ban' };
const ACTION_COLOR  = { warning: 'bg-yellow-100 text-yellow-800', temp_ban: 'bg-red-100 text-red-700', perm_ban: 'bg-red-200 text-red-900' };

// ─── Sub-components ──────────────────────────────────────────────────────────

function PenaltyCard({ penalty, onAppealClick, isSelected }) {
  const [expanded, setExpanded] = useState(false);
  const meta = STATUS_META[penalty.status] || STATUS_META.active;
  const canAppeal = penalty.status === 'active' && !penalty.appealedAt;
  const hasDecision = penalty.appealDecision;

  return (
    <Card className={`border shadow-md transition-all duration-200 ${isSelected ? 'ring-2 ring-blue-500' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <span className={`inline-flex items-center text-xs font-semibold px-2 py-1 rounded-full ${ACTION_COLOR[penalty.actionType]}`}>
              {ACTION_LABELS[penalty.actionType]}
            </span>
          </div>
          <span className={`inline-flex items-center text-xs font-medium px-2 py-1 rounded-full ${meta.color}`}>
            {meta.icon}{meta.label}
          </span>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div>
          <p className="text-sm font-medium text-slate-700">Reason</p>
          <p className="text-sm text-slate-500">{penalty.justification}</p>
        </div>

        <div className="flex gap-4 text-xs text-slate-400">
          <span>Issued: {new Date(penalty.createdAt).toLocaleDateString('en-IN')}</span>
          {penalty.expiresAt && (
            <span>Expires: {new Date(penalty.expiresAt).toLocaleDateString('en-IN')}</span>
          )}
        </div>

        {/* Appeal details (expandable) */}
        {penalty.appealedAt && (
          <div>
            <button
              className="flex items-center text-xs font-medium text-blue-600 hover:underline"
              onClick={() => setExpanded(e => !e)}
            >
              {expanded ? <ChevronUp className="h-3 w-3 mr-1" /> : <ChevronDown className="h-3 w-3 mr-1" />}
              Appeal details
            </button>

            {expanded && (
              <div className="mt-2 bg-slate-50 rounded-md p-3 space-y-2 text-sm">
                <p className="text-slate-500"><strong>Your appeal:</strong> {penalty.appealText}</p>
                <p className="text-xs text-slate-400">
                  Submitted: {new Date(penalty.appealedAt).toLocaleString('en-IN')}
                </p>
                {hasDecision && (
                  <div className={`mt-2 p-2 rounded ${penalty.appealDecision === 'APPROVED' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    <p className="font-semibold">
                      Appeal {penalty.appealDecision === 'APPROVED' ? '✅ Approved' : '❌ Rejected'}
                    </p>
                    <p className="text-xs mt-1">{penalty.appealDecisionText}</p>
                    {penalty.appealDecidedAt && (
                      <p className="text-xs mt-1 opacity-70">
                        Decided: {new Date(penalty.appealDecidedAt).toLocaleString('en-IN')}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Appeal button */}
        {canAppeal && (
          <Button
            size="sm"
            variant="outline"
            className="w-full mt-2 border-blue-300 text-blue-600 hover:bg-blue-50"
            onClick={() => onAppealClick(penalty.id)}
          >
            Submit Appeal
          </Button>
        )}

        {!canAppeal && !hasDecision && penalty.appealedAt && (
          <p className="text-xs text-center text-slate-400 pt-1">
            Appeal under review by an independent administrator
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AppealCenter() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [penalties, setPenalties]         = useState([]);
  const [loading, setLoading]             = useState(true);
  const [appealText, setAppealText]       = useState('');
  const [selectedActionId, setSelectedActionId] = useState(null);
  const [submitting, setSubmitting]       = useState(false);
  const [error, setError]                 = useState(null);
  const [success, setSuccess]             = useState(null);

  // ── Fetch user's own penalties from the real API endpoint (FR-54) ──
  const fetchPenalties = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await API.get('/moderation/my-penalties');
      setPenalties(data.data || []);
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to load penalties. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPenalties(); }, [fetchPenalties]);

  const handleAppealClick = (actionId) => {
    setSelectedActionId(actionId);
    setAppealText('');
    setError(null);
    setSuccess(null);
    // Scroll to form
    document.getElementById('appeal-form')?.scrollIntoView({ behavior: 'smooth' });
  };

  const submitAppeal = async (e) => {
    e.preventDefault();
    if (!appealText.trim() || !selectedActionId) return;
    if (appealText.trim().length < 20) {
      setError('Please provide a detailed appeal (min 20 characters).');
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      await API.post(`/moderation/${selectedActionId}/appeal`, { appealText: appealText.trim() });
      setSuccess('Appeal submitted. It will be reviewed by a different administrator — not the one who issued the sanction.');
      setAppealText('');
      setSelectedActionId(null);
      await fetchPenalties();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit appeal. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="page-wrapper">
        <div className="page-container-md page-section flex flex-col items-center justify-center min-h-[200px] space-y-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
          <p className="text-muted-foreground text-sm">Loading your penalties...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrapper">
      <div className="page-container-md page-section space-y-6">

        {/* Back button */}
        <Button variant="ghost" className="mb-2 text-slate-600 hover:text-slate-900" onClick={() => navigate('/dashboard')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>

        {/* Header */}
        <div className="flex items-center space-x-3">
          <ShieldCheck className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Appeal Center</h1>
            <p className="text-slate-500 text-sm mt-0.5">
              Review your account sanctions and submit an appeal. All appeals are reviewed by a different administrator.
            </p>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="bg-destructive/10 text-destructive p-4 flex items-center rounded-md text-sm">
            <AlertCircle className="h-5 w-5 mr-2 shrink-0" />
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-100 text-green-800 p-4 flex items-center rounded-md text-sm">
            <CheckCircle2 className="h-5 w-5 mr-2 shrink-0" />
            {success}
          </div>
        )}

        {/* No penalties state */}
        {penalties.length === 0 ? (
          <Card className="bg-white shadow-xl border-0 hover:-translate-y-1 transition">
            <CardContent className="p-10 text-center">
              <ShieldCheck className="h-14 w-14 text-green-400 mx-auto mb-4" />
              <h3 className="font-semibold text-lg text-slate-700">Account in Good Standing</h3>
              <p className="text-sm text-slate-400 mt-2">
                No penalties found on your account. Keep it up!
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Stats bar */}
            <div className="flex flex-wrap gap-3">
              {['active', 'appealed', 'revoked'].map(s => {
                const count = penalties.filter(p => p.status === s).length;
                if (!count) return null;
                const meta = STATUS_META[s];
                return (
                  <span key={s} className={`inline-flex items-center text-xs font-semibold px-3 py-1.5 rounded-full ${meta.color}`}>
                    {meta.icon}{count} {meta.label}
                  </span>
                );
              })}
              <span className="text-xs text-slate-400 self-center ml-auto">
                {penalties.length} total record{penalties.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Penalty cards */}
            <div className="grid gap-4 md:grid-cols-2">
              {penalties.map(penalty => (
                <PenaltyCard
                  key={penalty.id}
                  penalty={penalty}
                  onAppealClick={handleAppealClick}
                  isSelected={selectedActionId === penalty.id}
                />
              ))}
            </div>

            {/* Appeal form — shown when a penalty is selected */}
            {selectedActionId && (
              <Card id="appeal-form" className="border-blue-200 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Gavel className="h-5 w-5 text-blue-600" />
                    Submit Your Appeal
                  </CardTitle>
                  <CardDescription>
                    Provide a detailed reason for your appeal. This will be reviewed by an independent administrator — not the one who issued the sanction.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={submitAppeal} className="space-y-4">
                    <div>
                      <Label htmlFor="appeal-text">
                        Appeal Explanation
                        <span className="text-slate-400 text-xs ml-2">(min 20 characters)</span>
                      </Label>
                      <Textarea
                        id="appeal-text"
                        value={appealText}
                        onChange={e => setAppealText(e.target.value)}
                        placeholder="Explain clearly why you believe this sanction was applied in error..."
                        rows={5}
                        className="mt-1 resize-none"
                        maxLength={1000}
                      />
                      <p className="text-xs text-slate-400 text-right mt-1">
                        {appealText.length}/1000
                      </p>
                    </div>

                    <div className="flex gap-3">
                      <Button
                        type="submit"
                        disabled={submitting || appealText.trim().length < 20}
                        className="flex-1"
                      >
                        {submitting ? 'Submitting...' : 'Submit Appeal'}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => { setSelectedActionId(null); setAppealText(''); }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}
          </>
        )}

      </div>
    </div>
  );
}
