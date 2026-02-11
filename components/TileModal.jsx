'use client'

import { useState, useEffect } from 'react'

export default function TileModal({
  tile,
  isCompleted,
  isLocked,
  onClose,
  disabled,
  teamId,
  submissions = [],
  onRefresh
}) {
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [expandedImage, setExpandedImage] = useState(null)

  // Silent refresh when modal opens to get latest submissions
  useEffect(() => {
    if (onRefresh) {
      onRefresh()
    }
  }, [])

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [onClose])

  // Cleanup preview URL on unmount
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview)
    }
  }, [preview])

  if (!tile) return null

  // Filter submissions for this tile
  const tileSubmissions = submissions.filter(s => s.tile_id === tile.id)
  const pendingSubmissions = tileSubmissions.filter(s => s.status === 'pending')
  const approvedSubmissions = tileSubmissions.filter(s => s.status === 'approved')
  const rejectedSubmissions = tileSubmissions.filter(s => s.status === 'rejected')
  const hasPendingSubmissions = pendingSubmissions.length > 0

  // Multi-item tile info
  const isMultiItem = tile.is_multi_item || false
  const requiredSubmissions = tile.required_submissions || 1
  const approvedCount = approvedSubmissions.length

  const canSubmit = !isCompleted && !isLocked && !disabled && teamId

  // Handle file selection
  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0]
    if (selectedFile) {
      // Validate file type
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(selectedFile.type)) {
        setError('Please select a valid image (JPEG, PNG, or WebP)')
        return
      }
      // Validate file size (5MB)
      if (selectedFile.size > 5 * 1024 * 1024) {
        setError('Image must be less than 5MB')
        return
      }
      setFile(selectedFile)
      setPreview(URL.createObjectURL(selectedFile))
      setError(null)
    }
  }

  // Handle submission - check for pending first
  const handleSubmitClick = () => {
    if (hasPendingSubmissions) {
      setShowConfirmDialog(true)
    } else {
      handleSubmit()
    }
  }

  // Handle actual submission
  const handleSubmit = async () => {
    if (!file || !teamId || !tile) return

    setShowConfirmDialog(false)
    setUploading(true)
    setError(null)

    try {
      // 1. Upload image
      const formData = new FormData()
      formData.append('file', file)
      formData.append('team_id', teamId)
      formData.append('tile_id', tile.id)

      const uploadRes = await fetch('/api/submissions/upload', {
        method: 'POST',
        body: formData
      })

      if (!uploadRes.ok) {
        const data = await uploadRes.json()
        throw new Error(data.error || 'Upload failed')
      }

      const { url } = await uploadRes.json()

      // 2. Create submission record
      const submitRes = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          team_id: teamId,
          tile_id: tile.id,
          image_url: url
        })
      })

      if (!submitRes.ok) {
        const data = await submitRes.json()
        throw new Error(data.error || 'Submission failed')
      }

      // Success - close modal and refresh
      onClose(true) // Pass true to signal a refresh is needed
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }

  const clearFile = () => {
    setFile(null)
    if (preview) URL.revokeObjectURL(preview)
    setPreview(null)
    setError(null)
  }

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        {/* Close button */}
        <button style={styles.closeBtn} onClick={onClose}>x</button>

        {/* Status badge */}
        <div style={{
          ...styles.statusBadge,
          background: isCompleted ? 'rgba(46, 204, 113, 0.2)' :
                      hasPendingSubmissions ? 'rgba(241, 196, 15, 0.2)' :
                      isLocked ? 'rgba(149, 165, 166, 0.2)' :
                      'rgba(52, 152, 219, 0.2)',
          color: isCompleted ? '#2ecc71' :
                 hasPendingSubmissions ? '#f1c40f' :
                 isLocked ? '#95a5a6' :
                 '#3498db'
        }}>
          {isCompleted ? 'Completed' :
           hasPendingSubmissions ? `${pendingSubmissions.length} Pending` :
           isLocked ? 'Locked' : 'Active'}
        </div>

        {/* Title */}
        <h2 style={styles.title}>{tile.title}</h2>

        {/* Position info */}
        <p style={styles.position}>
          {tile.is_center ? 'Center Tile' : `Ring ${tile.ring} - Path ${tile.path + 1}`}
        </p>

        {/* Description */}
        {tile.description ? (
          <div style={styles.description}>
            <p>{tile.description}</p>
          </div>
        ) : (
          <div style={styles.noDescription}>
            <p>No description available</p>
          </div>
        )}

        {/* Points */}
        <div style={styles.pointsSection}>
          <span style={styles.pointsLabel}>Points</span>
          <span style={styles.pointsValue}>{tile.points}</span>
        </div>

        {/* Multi-item Progress */}
        {isMultiItem && (
          <div style={styles.multiItemProgress}>
            <div style={styles.multiItemHeader}>
              <span style={styles.multiItemBadge}>Multi-Item Tile</span>
              <span style={styles.multiItemCount}>
                {approvedCount}/{requiredSubmissions} approved
              </span>
            </div>
            <div style={styles.progressBarContainer}>
              <div
                style={{
                  ...styles.progressBarFill,
                  width: `${Math.min(100, (approvedCount / requiredSubmissions) * 100)}%`
                }}
              />
            </div>
            <p style={styles.multiItemHint}>
              {approvedCount >= requiredSubmissions
                ? 'All required submissions approved!'
                : `Submit ${requiredSubmissions - approvedCount} more screenshot${requiredSubmissions - approvedCount > 1 ? 's' : ''} to complete this tile`}
            </p>
          </div>
        )}

        {/* Existing Submissions */}
        {tileSubmissions.length > 0 && (
          <div style={styles.submissionsSection}>
            <h4 style={styles.submissionsTitle}>Your Submissions</h4>
            <div style={styles.submissionsList}>
              {tileSubmissions.map(sub => (
                <div key={sub.id} style={{
                  ...styles.submissionItem,
                  borderColor: sub.status === 'pending' ? '#f1c40f' :
                               sub.status === 'approved' ? '#2ecc71' : '#e74c3c'
                }}>
                  <img
                    src={sub.image_url}
                    alt="Submission"
                    style={styles.submissionThumb}
                    onClick={() => setExpandedImage(sub.image_url)}
                    title="Click to view full size"
                  />
                  <div style={styles.submissionInfo}>
                    <span style={{
                      ...styles.submissionStatus,
                      color: sub.status === 'pending' ? '#f1c40f' :
                             sub.status === 'approved' ? '#2ecc71' : '#e74c3c'
                    }}>
                      {sub.status.charAt(0).toUpperCase() + sub.status.slice(1)}
                    </span>
                    <span style={styles.submissionDate}>
                      {new Date(sub.submitted_at).toLocaleDateString()}
                    </span>
                    {sub.status === 'rejected' && sub.rejection_reason && (
                      <p style={styles.rejectionReason}>{sub.rejection_reason}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upload section - only show if can submit */}
        {canSubmit && (
          <div style={styles.uploadSection}>
            <label style={styles.uploadLabel}>
              {tileSubmissions.length > 0 ? 'Submit Additional Evidence' : 'Upload Screenshot as Proof'}
            </label>

            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileSelect}
              style={styles.fileInput}
              id="proof-upload"
            />

            {!file ? (
              <label htmlFor="proof-upload" style={styles.uploadButton}>
                Select Image
              </label>
            ) : (
              <div style={styles.previewContainer}>
                <img src={preview} alt="Preview" style={styles.previewImage} />
                <button onClick={clearFile} style={styles.clearBtn}>
                  Remove
                </button>
              </div>
            )}

            {error && (
              <p style={styles.errorText}>{error}</p>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div style={styles.actions}>
          {canSubmit && file && (
            <button
              style={styles.submitBtn}
              onClick={handleSubmitClick}
              disabled={uploading}
            >
              {uploading ? 'Submitting...' : 'Submit for Review'}
            </button>
          )}

          {isLocked && (
            <p style={styles.lockedMessage}>
              Complete the previous tile in this path to unlock
            </p>
          )}

          {disabled && !isCompleted && !isLocked && (
            <p style={styles.lockedMessage}>
              Board is locked - complete previous board first
            </p>
          )}

          <button style={styles.cancelBtn} onClick={onClose}>
            Close
          </button>
        </div>

        {/* Confirmation Dialog */}
        {showConfirmDialog && (
          <div style={styles.confirmOverlay} onClick={() => setShowConfirmDialog(false)}>
            <div style={styles.confirmDialog} onClick={e => e.stopPropagation()}>
              <h3 style={styles.confirmTitle}>Pending Submission Exists</h3>
              <p style={styles.confirmText}>
                You already have {pendingSubmissions.length} pending submission{pendingSubmissions.length > 1 ? 's' : ''} for this tile.
                Are you sure you want to submit another?
              </p>
              <div style={styles.confirmActions}>
                <button onClick={handleSubmit} style={styles.confirmYesBtn}>
                  Yes, Submit
                </button>
                <button onClick={() => setShowConfirmDialog(false)} style={styles.confirmNoBtn}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Image Viewer Overlay */}
        {expandedImage && (
          <div style={styles.imageViewerOverlay} onClick={() => setExpandedImage(null)}>
            <button style={styles.imageViewerClose} onClick={() => setExpandedImage(null)}>
              ×
            </button>
            <img
              src={expandedImage}
              alt="Full size submission"
              style={styles.imageViewerImg}
              onClick={e => e.stopPropagation()}
            />
            <p style={styles.imageViewerHint}>Click outside or × to close</p>
          </div>
        )}
      </div>
    </div>
  )
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '1rem'
  },
  modal: {
    background: 'linear-gradient(145deg, #1a1a2e 0%, #16213e 100%)',
    borderRadius: '16px',
    padding: '2rem',
    maxWidth: '450px',
    width: '100%',
    maxHeight: '90vh',
    overflowY: 'auto',
    position: 'relative',
    border: '1px solid rgba(255, 215, 0, 0.2)',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)'
  },
  closeBtn: {
    position: 'absolute',
    top: '1rem',
    right: '1rem',
    background: 'none',
    border: 'none',
    color: '#888',
    fontSize: '1.5rem',
    cursor: 'pointer',
    padding: '0.25rem 0.5rem',
    lineHeight: 1
  },
  statusBadge: {
    display: 'inline-block',
    padding: '0.35rem 0.75rem',
    borderRadius: '20px',
    fontSize: '0.85rem',
    fontWeight: 'bold',
    marginBottom: '1rem'
  },
  title: {
    color: '#ffd700',
    fontSize: '1.5rem',
    margin: '0 0 0.5rem 0',
    paddingRight: '2rem'
  },
  position: {
    color: '#888',
    fontSize: '0.9rem',
    margin: '0 0 1.5rem 0'
  },
  description: {
    background: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '8px',
    padding: '1rem',
    marginBottom: '1.5rem',
    borderLeft: '3px solid #ffd700'
  },
  noDescription: {
    background: 'rgba(255, 255, 255, 0.02)',
    borderRadius: '8px',
    padding: '1rem',
    marginBottom: '1.5rem',
    color: '#666',
    fontStyle: 'italic'
  },
  pointsSection: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: 'rgba(255, 215, 0, 0.1)',
    borderRadius: '8px',
    padding: '1rem',
    marginBottom: '1.5rem'
  },
  pointsLabel: {
    color: '#888',
    fontSize: '0.9rem'
  },
  pointsValue: {
    color: '#ffd700',
    fontSize: '1.5rem',
    fontWeight: 'bold'
  },
  submissionsSection: {
    marginBottom: '1.5rem'
  },
  submissionsTitle: {
    color: '#fff',
    fontSize: '0.95rem',
    marginBottom: '0.75rem'
  },
  submissionsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem'
  },
  submissionItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.5rem',
    background: 'rgba(255, 255, 255, 0.03)',
    borderRadius: '8px',
    border: '1px solid'
  },
  submissionThumb: {
    width: '50px',
    height: '50px',
    objectFit: 'cover',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'transform 0.2s, box-shadow 0.2s',
    border: '2px solid transparent'
  },
  submissionInfo: {
    flex: 1
  },
  submissionStatus: {
    fontWeight: 'bold',
    fontSize: '0.85rem',
    display: 'block'
  },
  submissionDate: {
    color: '#666',
    fontSize: '0.8rem'
  },
  rejectionReason: {
    color: '#e74c3c',
    fontSize: '0.8rem',
    margin: '0.25rem 0 0 0',
    fontStyle: 'italic'
  },
  uploadSection: {
    marginBottom: '1.5rem',
    padding: '1rem',
    background: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '8px',
    border: '1px dashed rgba(255, 215, 0, 0.3)'
  },
  uploadLabel: {
    display: 'block',
    color: '#ffd700',
    fontWeight: 'bold',
    marginBottom: '0.75rem',
    fontSize: '0.9rem'
  },
  fileInput: {
    display: 'none'
  },
  uploadButton: {
    display: 'inline-block',
    padding: '0.75rem 1.5rem',
    background: 'rgba(52, 152, 219, 0.3)',
    border: '1px solid #3498db',
    borderRadius: '8px',
    color: '#3498db',
    cursor: 'pointer',
    fontSize: '0.9rem',
    transition: 'all 0.2s'
  },
  previewContainer: {
    marginTop: '0.5rem'
  },
  previewImage: {
    maxWidth: '100%',
    maxHeight: '200px',
    borderRadius: '8px',
    border: '2px solid rgba(255, 215, 0, 0.3)',
    display: 'block'
  },
  clearBtn: {
    marginTop: '0.5rem',
    padding: '0.4rem 0.8rem',
    background: 'rgba(231, 76, 60, 0.3)',
    border: '1px solid #e74c3c',
    borderRadius: '4px',
    color: '#e74c3c',
    cursor: 'pointer',
    fontSize: '0.85rem'
  },
  errorText: {
    color: '#e74c3c',
    fontSize: '0.85rem',
    marginTop: '0.5rem'
  },
  actions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem'
  },
  submitBtn: {
    width: '100%',
    padding: '0.875rem 1.5rem',
    background: 'linear-gradient(135deg, #f39c12 0%, #e67e22 100%)',
    border: 'none',
    borderRadius: '8px',
    color: 'white',
    fontSize: '1rem',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'transform 0.2s, box-shadow 0.2s',
    boxShadow: '0 4px 15px rgba(243, 156, 18, 0.3)'
  },
  cancelBtn: {
    width: '100%',
    padding: '0.75rem 1.5rem',
    background: 'transparent',
    border: '1px solid #444',
    borderRadius: '8px',
    color: '#888',
    fontSize: '0.9rem',
    cursor: 'pointer'
  },
  lockedMessage: {
    color: '#888',
    fontSize: '0.9rem',
    textAlign: 'center',
    padding: '0.5rem',
    margin: 0
  },
  confirmOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.9)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '16px'
  },
  confirmDialog: {
    background: '#1a1a2e',
    borderRadius: '12px',
    padding: '1.5rem',
    maxWidth: '300px',
    textAlign: 'center',
    border: '1px solid rgba(255, 215, 0, 0.3)'
  },
  confirmTitle: {
    color: '#f1c40f',
    margin: '0 0 1rem 0',
    fontSize: '1.1rem'
  },
  confirmText: {
    color: '#aaa',
    fontSize: '0.9rem',
    margin: '0 0 1.5rem 0'
  },
  confirmActions: {
    display: 'flex',
    gap: '0.75rem'
  },
  confirmYesBtn: {
    flex: 1,
    padding: '0.75rem',
    background: '#f39c12',
    border: 'none',
    borderRadius: '6px',
    color: 'white',
    fontWeight: 'bold',
    cursor: 'pointer'
  },
  confirmNoBtn: {
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
    background: 'rgba(0, 0, 0, 0.95)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2000,
    padding: '1rem'
  },
  imageViewerClose: {
    position: 'absolute',
    top: '1rem',
    right: '1rem',
    background: 'rgba(255, 255, 255, 0.1)',
    border: 'none',
    color: 'white',
    fontSize: '2rem',
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: 1
  },
  imageViewerImg: {
    maxWidth: '90%',
    maxHeight: '80vh',
    objectFit: 'contain',
    borderRadius: '8px',
    boxShadow: '0 10px 50px rgba(0, 0, 0, 0.5)'
  },
  imageViewerHint: {
    color: '#666',
    fontSize: '0.85rem',
    marginTop: '1rem'
  },
  multiItemProgress: {
    background: 'rgba(155, 89, 182, 0.1)',
    border: '1px solid rgba(155, 89, 182, 0.3)',
    borderRadius: '8px',
    padding: '1rem',
    marginBottom: '1.5rem'
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
  multiItemCount: {
    color: '#9b59b6',
    fontWeight: 'bold',
    fontSize: '0.9rem'
  },
  progressBarContainer: {
    height: '8px',
    background: 'rgba(155, 89, 182, 0.2)',
    borderRadius: '4px',
    overflow: 'hidden',
    marginBottom: '0.75rem'
  },
  progressBarFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #9b59b6 0%, #8e44ad 100%)',
    borderRadius: '4px',
    transition: 'width 0.3s ease'
  },
  multiItemHint: {
    color: '#aaa',
    fontSize: '0.85rem',
    margin: 0,
    textAlign: 'center'
  }
}
