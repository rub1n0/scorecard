'use client';

import React, { useState } from 'react';
import { X } from 'lucide-react';

interface ScorecardFormProps {
    onSave: (name: string, description: string) => void;
    onCancel: () => void;
}

export default function ScorecardForm({ onSave, onCancel }: ScorecardFormProps) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(name, description);
    };

    return (
        <div className="modal-overlay" onClick={onCancel}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Create New Scorecard</h2>
                    <button onClick={onCancel} className="btn btn-icon btn-secondary">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">Scorecard Name</label>
                        <input
                            type="text"
                            className="input"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            placeholder="e.g., Q4 2024 Metrics"
                            autoFocus
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Description (Optional)</label>
                        <textarea
                            className="textarea"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Describe the purpose of this scorecard..."
                        />
                    </div>

                    <div className="form-actions">
                        <button type="button" onClick={onCancel} className="btn btn-secondary">
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-primary">
                            Create Scorecard
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
