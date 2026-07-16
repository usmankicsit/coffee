'use client';

import { FormEvent, useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import type { Order, OrderClaim, ProductReview } from '@/lib/types';
import { CustomSelect } from '@/components/CustomSelect';
import { IconButton } from '@/components/IconButton';

export function OrderFeedbackActions({
  order,
  onDone,
}: {
  order: Order;
  onDone?: () => void;
}) {
  const canReview =
    order.status === 'COMPLETED' || order.status === 'READY';
  const canClaim = order.status !== 'CANCELLED';

  const [showReview, setShowReview] = useState(false);
  const [showClaim, setShowClaim] = useState(false);
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [claims, setClaims] = useState<OrderClaim[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const [ratings, setRatings] = useState<
    Record<string, { rating: number; comment: string }>
  >({});
  const [claimForm, setClaimForm] = useState({
    reason: 'Wrong item',
    details: '',
  });

  useEffect(() => {
    if (!showReview && !showClaim) return;
    api<ProductReview[]>(`/reviews/mine?orderId=${order.id}`)
      .then((data) => {
        setReviews(data);
        const map: Record<string, { rating: number; comment: string }> = {};
        for (const item of order.items || []) {
          const existing = data.find((r) => r.productId === item.productId);
          map[item.productId] = {
            rating: existing?.rating || 5,
            comment: existing?.comment || '',
          };
        }
        setRatings(map);
      })
      .catch(() => undefined);
    api<OrderClaim[]>('/claims/mine')
      .then((data) => setClaims(data.filter((c) => c.orderId === order.id)))
      .catch(() => undefined);
  }, [showReview, showClaim, order]);

  async function submitReviews(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      for (const item of order.items || []) {
        const entry = ratings[item.productId];
        if (!entry) continue;
        await api('/reviews', {
          method: 'POST',
          body: JSON.stringify({
            orderId: order.id,
            productId: item.productId,
            rating: entry.rating,
            comment: entry.comment || undefined,
          }),
        });
      }
      setShowReview(false);
      onDone?.();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save reviews');
    } finally {
      setBusy(false);
    }
  }

  async function submitClaim(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api('/claims', {
        method: 'POST',
        body: JSON.stringify({
          orderId: order.id,
          reason: claimForm.reason,
          details: claimForm.details,
        }),
      });
      setShowClaim(false);
      setClaimForm({ reason: 'Wrong item', details: '' });
      onDone?.();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to submit claim');
    } finally {
      setBusy(false);
    }
  }

  const hasOpenClaim = claims.some((c) => c.status === 'OPEN' || c.status === 'IN_REVIEW');

  return (
    <>
      {canReview && (
        <IconButton
          label="Rate products"
          icon="star"
          variant="primary"
          onClick={() => setShowReview(true)}
        />
      )}
      {canClaim && (
        <IconButton
          label="Report / Claim"
          icon="flag"
          onClick={() => setShowClaim(true)}
        />
      )}

      {showReview && (
        <div className="dialog-backdrop" onClick={() => !busy && setShowReview(false)}>
          <div className="dialog-card dialog-wide" onClick={(e) => e.stopPropagation()}>
            <h2>Rate products — {order.orderNumber}</h2>
            <p>Share a rating for items from this order.</p>
            {error && <div className="error">{error}</div>}
            <form className="form-grid" onSubmit={submitReviews}>
              {(order.items || []).map((item) => (
                <div key={item.productId} className="review-row">
                  <strong>{item.productName}</strong>
                  <div className="star-row">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        className={`star-btn${(ratings[item.productId]?.rating || 0) >= n ? ' active' : ''}`}
                        onClick={() =>
                          setRatings((prev) => ({
                            ...prev,
                            [item.productId]: {
                              rating: n,
                              comment: prev[item.productId]?.comment || '',
                            },
                          }))
                        }
                      >
                        ★
                      </button>
                    ))}
                  </div>
                  <input
                    placeholder="Optional comment"
                    value={ratings[item.productId]?.comment || ''}
                    onChange={(e) =>
                      setRatings((prev) => ({
                        ...prev,
                        [item.productId]: {
                          rating: prev[item.productId]?.rating || 5,
                          comment: e.target.value,
                        },
                      }))
                    }
                  />
                  {reviews.some((r) => r.productId === item.productId) && (
                    <small className="muted-note">Previously rated — saving will update it</small>
                  )}
                </div>
              ))}
              <div className="dialog-actions">
                <button className="btn" type="button" disabled={busy} onClick={() => setShowReview(false)}>
                  Cancel
                </button>
                <button className="btn btn-primary" type="submit" disabled={busy}>
                  {busy ? 'Saving…' : 'Submit ratings'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showClaim && (
        <div className="dialog-backdrop" onClick={() => !busy && setShowClaim(false)}>
          <div className="dialog-card dialog-wide" onClick={(e) => e.stopPropagation()}>
            <h2>Report / claim — {order.orderNumber}</h2>
            <p>Tell us what went wrong with this order.</p>
            {hasOpenClaim && (
              <div className="error">You already have an open claim for this order.</div>
            )}
            {error && <div className="error">{error}</div>}
            <form className="form-grid" onSubmit={submitClaim}>
              <div className="form-row">
                <label>Reason</label>
                <CustomSelect
                  value={claimForm.reason}
                  onChange={(v) => setClaimForm({ ...claimForm, reason: v })}
                  options={[
                    { value: 'Wrong item', label: 'Wrong item' },
                    { value: 'Missing item', label: 'Missing item' },
                    { value: 'Quality issue', label: 'Quality issue' },
                    { value: 'Late order', label: 'Late order' },
                    { value: 'Billing issue', label: 'Billing issue' },
                    { value: 'Other', label: 'Other' },
                  ]}
                />
              </div>
              <div className="form-row">
                <label>Details</label>
                <textarea
                  rows={4}
                  required
                  minLength={5}
                  value={claimForm.details}
                  onChange={(e) => setClaimForm({ ...claimForm, details: e.target.value })}
                  placeholder="Describe the issue…"
                />
              </div>
              {claims.length > 0 && (
                <div className="muted-note">
                  Existing claims:{' '}
                  {claims.map((c) => `${c.reason} (${c.status})`).join(', ')}
                </div>
              )}
              <div className="dialog-actions">
                <button className="btn" type="button" disabled={busy} onClick={() => setShowClaim(false)}>
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  type="submit"
                  disabled={busy || hasOpenClaim}
                >
                  {busy ? 'Submitting…' : 'Submit claim'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
