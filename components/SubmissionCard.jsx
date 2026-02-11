'use client'

import { useState } from 'react'

export default function SubmissionCard({ submission, onApprove, onReject, saving, readonly, relatedApprovedSubmissions = [] }) {
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [showFullImage, setShowFullImage] = useState(false)
  const [viewingRelatedImage, setViewingRelatedImage] = useState(null)

  const team = submission.teams
  const tile = submission.tiles
  const isMultiItem = tile?.is_multi_item || false
  const requiredSubmissions = tile?.required_submissions || 1
  const currentApproved = relatedApprovedSubmissions.length

  const handleReject = () => {
    onReject(rejectionReason)
    setShowRejectModal(false)
    setRejectionReason('')
  }

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <div>
          <span style={styles.teamName}>{team?.name || 'Unknown Team'}</span>
          <span style={styles.tileInfo}>
            {tile?.board?.toUpperCase()} - {tile?.title || `Ring ${tile?.ring} Path ${tile?.path + 1}`}
          </span>
        </div>
        <span style={{
          ...styles.statusBadge,
          background: submission.status === 'pending' ? '#f39c12' :
                      submission.status === 'approved' ? '#2ecc71' : '#e74c3c'
        }}>
          {submission.status}
        </span>
      </div>

      <div style={styles.imageContainer}>
        <img
          src={submission.image_url}
          alt="Proof"
          style={styles.image}
          onClick={() => setShowFullImage(true)}
        />
        <p style={styles.clickHint}>
          Click to view full size
        </p>
      </div>

      {/* Full Image Viewer */}
      {showFullImage && (
        <div style={styles.imageViewerOverlay} onClick={() => setShowFullImage(false)}>
          <button style={styles.imageViewerClose} onClick={() => setShowFullImage(false)}>
            ×
          </button>
          <img
            src={submission.image_url}
            alt="Full size proof"
            style={styles.imageViewerImg}
            onClick={e => e.stopPropagation()}
          />
          <p style={styles.imageViewerHint}>Click outside or × to close</p>
        </div>
      )}

      <div style={styles.meta}>
        <span>Submitted: {new Date(submission.submitted_at).toLocaleString()}</span>
        <span>{tile?.points || '—'} points</span>
      </div>

      {/* Multi-item tile info */}
      {isMultiItem && (
        <div style={styles.multiItemInfo}>
          <div style={styles.multiItemHeader}>
            <span style={styles.multiItemBadge}>Multi-Item Tile</span>
            <span style={styles.progressCount}>
              {currentApproved}/{requiredSubmissions} approved
            </span>
          </div>

          {currentApproved > 0 && (
            <div style={styles.relatedSubmissions}>
              <p style={styles.relatedTitle}>Previously approved submissions:</p>
              <div style={styles.relatedGrid}>
                {relatedApprovedSubmissions.map(sub => (
                  <img
                    key={sub.id}
                    src={sub.image_url}
                    alt={`Approved ${new Date(sub.reviewed_at).toLocaleDateString()}`}
                    style={styles.relatedThumb}
                    onClick={() => setViewingRelatedImage(sub.image_url)}
                    title={`Approved on ${new Date(sub.reviewed_at).toLocaleString()}`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Related image viewer */}
      {viewingRelatedImage && (
        <div style={styles.imageViewerOverlay} onClick={() => setViewingRelatedImage(null)}>
          <button style={styles.imageViewerClose} onClick={() => setViewingRelatedImage(null)}>
            ×
          </button>
          <img
            src={viewingRelatedImage}
            alt="Related submission"
            style={styles.imageViewerImg}
            onClick={e => e.stopPropagation()}
          />
          <p style={styles.imageViewerHint}>Click outside or × to close</p>
        </div>
      )}

      {!readonly && submission.status === 'pending' && (
        <div style={styles.actions}>
          <button
            onClick={onApprove}
            disabled={saving}
            style={{
              ...styles.approveBtn,
              opacity: saving ? 0.5 : 1
            }}
          >
            Approve
          </button>
          <button
            onClick={() => setShowRejectModal(true)}
            disabled={saving}
            style={{
              ...styles.rejectBtn,
              opacity: saving ? 0.5 : 1
            }}
          >
            Reject
          </button>
        </div>
      )}

      {submission.status === 'rejected' && submission.rejection_reason && (
        <div style={styles.rejectionReason}>
          <strong>Rejection reason:</strong> {submission.rejection_reason}
        </div>
      )}

      {submission.status === 'approved' && submission.reviewed_at && (
        <div style={styles.approvedInfo}>
          Approved on {new Date(submission.reviewed_at).toLocaleString()}
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div style={styles.modalOverlay} onClick={() => setShowRejectModal(false)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <h4 style={styles.modalTitle}>Reject Submission</h4>
            <p style={styles.modalSubtitle}>
              {team?.name} - {tile?.title}
            </p>
            <textarea
              value={rejectionReason}
              onChange={e => setRejectionReason(e.target.value)}
              placeholder="Reason for rejection (optional but helpful for the team)"
              style={styles.textarea}
            />
            <div style={styles.modalActions}>
              <button onClick={handleReject} style={styles.confirmRejectBtn}>
                Confirm Reject
              </button>
              <button onClick={() => setShowRejectModal(false)} style={styles.cancelBtn}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const styles = {
  card: {
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '12px',
    padding: '1.25rem',
    marginBottom: '1rem',
    border: '1px solid rgba(255,255,255,0.1)',
    position: 'relative'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '1rem'
  },
  teamName: {
    color: '#ffd700',
    fontWeight: 'bold',
    display: 'block',
    marginBottom: '0.25rem'
  },
  tileInfo: {
    color: '#888',
    fontSize: '0.9rem'
  },
  statusBadge: {
    padding: '0.25rem 0.75rem',
    borderRadius: '12px',
    color: 'white',
    fontSize: '0.8rem',
    fontWeight: 'bold',
    textTransform: 'uppercase'
  },
  imageContainer: {
    marginBottom: '1rem',
    textAlign: 'center'
  },
  image: {
    width: '100%',
    objectFit: 'contain',
    borderRadius: '8px',
    cursor: 'pointer',
    border: '2px solid rgba(255,215,0,0.2)'
  },
  clickHint: {
    color: '#666',
    fontSize: '0.8rem',
    marginTop: '0.5rem'
  },
  meta: {
    display: 'flex',
    justifyContent: 'space-between',
    color: '#888',
    fontSize: '0.85rem',
    marginBottom: '1rem'
  },
  actions: {
    display: 'flex',
    gap: '0.75rem'
  },
  approveBtn: {
    flex: 1,
    padding: '0.75rem',
    background: '#2ecc71',
    border: 'none',
    borderRadius: '6px',
    color: 'white',
    fontWeight: 'bold',
    cursor: 'pointer'
  },
  rejectBtn: {
    flex: 1,
    padding: '0.75rem',
    background: '#e74c3c',
    border: 'none',
    borderRadius: '6px',
    color: 'white',
    fontWeight: 'bold',
    cursor: 'pointer'
  },
  rejectionReason: {
    background: 'rgba(231, 76, 60, 0.1)',
    border: '1px solid rgba(231, 76, 60, 0.3)',
    borderRadius: '6px',
    padding: '0.75rem',
    color: '#e74c3c',
    fontSize: '0.9rem',
    marginTop: '0.75rem'
  },
  approvedInfo: {
    color: '#2ecc71',
    fontSize: '0.85rem',
    marginTop: '0.5rem'
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
  },
  modal: {
    background: '#1a1a2e',
    borderRadius: '12px',
    padding: '1.5rem',
    maxWidth: '400px',
    width: '90%',
    border: '1px solid rgba(255,215,0,0.2)'
  },
  modalTitle: {
    color: '#fff',
    margin: '0 0 0.5rem 0',
    fontSize: '1.1rem'
  },
  modalSubtitle: {
    color: '#888',
    margin: '0 0 1rem 0',
    fontSize: '0.9rem'
  },
  textarea: {
    width: '100%',
    minHeight: '100px',
    padding: '0.75rem',
    borderRadius: '6px',
    border: '1px solid #444',
    background: '#0a0a1a',
    color: 'white',
    resize: 'vertical',
    marginBottom: '1rem',
    fontSize: '0.9rem'
  },
  modalActions: {
    display: 'flex',
    gap: '0.75rem'
  },
  confirmRejectBtn: {
    flex: 1,
    padding: '0.75rem',
    background: '#e74c3c',
    border: 'none',
    borderRadius: '6px',
    color: 'white',
    fontWeight: 'bold',
    cursor: 'pointer'
  },
  cancelBtn: {
    flex: 1,
    padding: '0.75rem',
    background: '#95a5a6',
    border: 'none',
    borderRadius: '6px',
    color: 'white',
    cursor: 'pointer'
  },
  imageViewerOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.95)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2000,
    cursor: 'pointer'
  },
  imageViewerClose: {
    position: 'absolute',
    top: '20px',
    right: '20px',
    background: 'rgba(255,255,255,0.1)',
    border: 'none',
    color: 'white',
    fontSize: '2rem',
    width: '50px',
    height: '50px',
    borderRadius: '50%',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  imageViewerImg: {
    maxWidth: '90vw',
    maxHeight: '85vh',
    objectFit: 'contain',
    borderRadius: '8px',
    cursor: 'default'
  },
  imageViewerHint: {
    color: '#888',
    marginTop: '1rem',
    fontSize: '0.9rem'
  },
  multiItemInfo: {
    background: 'rgba(155, 89, 182, 0.1)',
    border: '1px solid rgba(155, 89, 182, 0.3)',
    borderRadius: '8px',
    padding: '1rem',
    marginBottom: '1rem'
  },
  multiItemHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.75rem'
  },
  multiItemBadge: {
    background: '#9b59b6',
    color: 'white',
    padding: '0.25rem 0.5rem',
    borderRadius: '4px',
    fontSize: '0.8rem',
    fontWeight: 'bold'
  },
  progressCount: {
    color: '#9b59b6',
    fontWeight: 'bold'
  },
  relatedSubmissions: {
    marginTop: '0.5rem'
  },
  relatedTitle: {
    color: '#aaa',
    fontSize: '0.85rem',
    marginBottom: '0.5rem',
    margin: '0 0 0.5rem 0'
  },
  relatedGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.5rem'
  },
  relatedThumb: {
    width: '60px',
    height: '60px',
    objectFit: 'cover',
    borderRadius: '4px',
    border: '2px solid #2ecc71',
    cursor: 'pointer'
  }
}
