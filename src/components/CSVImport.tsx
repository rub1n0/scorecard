'use client';

import React, { useState, useRef } from 'react';
import { X, Upload, Download, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { parseCSV, generateExampleCSV, ParsedKPI } from '@/utils/csvParser';
import { getDisplayValue } from '@/utils/kpiValueUtils'; // Added this import

interface CSVImportProps {
    onImport: (kpis: ParsedKPI[]) => void;
    onCancel: () => void;
}

export default function CSVImport({ onImport, onCancel }: CSVImportProps) {
    const [dragActive, setDragActive] = useState(false);
    const [parsedKPIs, setParsedKPIs] = useState<ParsedKPI[]>([]);
    const [errors, setErrors] = useState<string[]>([]);
    const [fileName, setFileName] = useState<string>('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFile = (file: File) => {
        if (!file.name.endsWith('.csv')) {
            setErrors(['Please upload a CSV file']);
            return;
        }

        setFileName(file.name);
        const reader = new FileReader();

        reader.onload = (e) => {
            const content = e.target?.result as string;
            const result = parseCSV(content);

            if (result.success) {
                setParsedKPIs(result.kpis);
                setErrors(result.errors);
            } else {
                setParsedKPIs([]);
                setErrors(result.errors);
            }
        };

        reader.onerror = () => {
            setErrors(['Error reading file']);
        };

        reader.readAsText(file);
    };

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        e.preventDefault();
        if (e.target.files && e.target.files[0]) {
            handleFile(e.target.files[0]);
        }
    };

    const handleImport = () => {
        if (parsedKPIs.length > 0) {
            onImport(parsedKPIs);
        }
    };

    const downloadExample = (type: 'all' | 'number' | 'line' | 'bar' | 'pie' | 'radar' | 'text') => {
        const csv = generateExampleCSV(type);
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `example_${type}_kpis.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    };

    return (
        <div className="modal-overlay" onClick={onCancel}>
            <div className="modal csv-import-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Import KPIs from CSV</h2>
                    <button onClick={onCancel} className="btn btn-icon btn-secondary">
                        <X size={20} />
                    </button>
                </div>

                <div className="csv-import-content">
                    {/* Download Examples Section */}
                    <div className="examples-section">
                        <h3>Download Template</h3>
                        <p className="template-description">
                            Get the comprehensive template that supports all KPI types in a single file
                        </p>
                        <button onClick={() => downloadExample('all')} className="btn btn-primary btn-download-main">
                            <Download size={20} />
                            Download Complete Template (All Types)
                        </button>

                        <details className="individual-templates">
                            <summary>Or download individual type templates</summary>
                            <div className="example-buttons">
                                <button onClick={() => downloadExample('number')} className="btn btn-secondary btn-sm">
                                    <Download size={16} />
                                    Number KPIs
                                </button>
                                <button onClick={() => downloadExample('line')} className="btn btn-secondary btn-sm">
                                    <Download size={16} />
                                    Line Chart
                                </button>
                                <button onClick={() => downloadExample('bar')} className="btn btn-secondary btn-sm">
                                    <Download size={16} />
                                    Bar Chart
                                </button>
                                <button onClick={() => downloadExample('pie')} className="btn btn-secondary btn-sm">
                                    <Download size={16} />
                                    Pie Chart
                                </button>
                                <button onClick={() => downloadExample('radar')} className="btn btn-secondary btn-sm">
                                    <Download size={16} />
                                    Radar Chart
                                </button>
                                <button onClick={() => downloadExample('text')} className="btn btn-secondary btn-sm">
                                    <Download size={16} />
                                    Text KPIs
                                </button>
                            </div>
                        </details>

                        <div className="mt-4 p-3 bg-industrial-900/50 rounded-md border border-industrial-800">
                            <h4 className="text-xs font-semibold text-industrial-400 uppercase tracking-wider mb-2">Template Headers</h4>
                            <div className="flex flex-wrap gap-2">
                                {['KPI Name', 'Subtitle', 'Value', 'Date', 'Notes', 'Chart Type', 'Section', 'Assignment'].map((header) => (
                                    <span key={header} className="px-2 py-1 bg-industrial-800 text-industrial-300 rounded text-xs font-mono border border-industrial-700">
                                        {header}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Upload Section */}
                    <div className="upload-section">
                        <h3>Upload CSV File</h3>
                        <div
                            className={`upload-area ${dragActive ? 'drag-active' : ''}`}
                            onDragEnter={handleDrag}
                            onDragLeave={handleDrag}
                            onDragOver={handleDrag}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <Upload size={48} />
                            <p className="upload-text">
                                Drag and drop your CSV file here, or <span className="upload-link">click to browse</span>
                            </p>
                            <p className="upload-hint">Supported format: .csv</p>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".csv"
                                onChange={handleChange}
                                style={{ display: 'none' }}
                            />
                        </div>
                    </div>

                    {/* File Info */}
                    {fileName && (
                        <div className="file-info">
                            <FileText size={20} />
                            <span>{fileName}</span>
                        </div>
                    )}

                    {/* Errors */}
                    {errors.length > 0 && (
                        <div className="import-errors">
                            <AlertCircle size={20} />
                            <div>
                                {errors.map((error, index) => (
                                    <p key={index}>{error}</p>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Summary */}
                    {parsedKPIs.length > 0 && (() => {
                        const sections = new Set<string>();
                        const assignees = new Set<string>();

                        parsedKPIs.forEach(kpi => {
                            if (kpi.sectionName) sections.add(kpi.sectionName);
                            if (kpi.assignee) assignees.add(kpi.assignee);
                        });

                        return (
                            <div className="bg-industrial-900/30 rounded-lg border border-industrial-800 p-4 mb-4">
                                <h3 className="text-sm font-semibold text-industrial-200 mb-3">Import Summary</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                                    <div>
                                        <div className="text-industrial-500 uppercase tracking-wider mb-1">KPIs</div>
                                        <div className="text-2xl font-bold text-industrial-100">{parsedKPIs.length}</div>
                                    </div>
                                    <div>
                                        <div className="text-industrial-500 uppercase tracking-wider mb-1">Sections</div>
                                        <div className="text-2xl font-bold text-verdigris-400">{sections.size}</div>
                                        {sections.size > 0 && (
                                            <div className="mt-2 flex flex-wrap gap-1">
                                                {Array.from(sections).map(section => (
                                                    <span key={section} className="px-2 py-0.5 bg-verdigris-900/30 text-verdigris-300 rounded text-xs">
                                                        {section}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <div className="text-industrial-500 uppercase tracking-wider mb-1">Assignments</div>
                                        <div className="text-2xl font-bold text-tuscan-sun-400">{assignees.size}</div>
                                        {assignees.size > 0 && (
                                            <div className="mt-2 flex flex-wrap gap-1">
                                                {Array.from(assignees).map(assignee => (
                                                    <span key={assignee} className="px-2 py-0.5 bg-tuscan-sun-900/30 text-tuscan-sun-300 rounded text-xs">
                                                        {assignee}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })()}

                    {/* Preview */}
                    {parsedKPIs.length > 0 && (
                        <div className="preview-section">
                            <div className="preview-header">
                                <CheckCircle size={20} style={{ color: 'var(--accent-success)' }} />
                                <h3>Preview ({parsedKPIs.length} KPI{parsedKPIs.length !== 1 ? 's' : ''})</h3>
                            </div>
                            <div className="preview-list">
                                {parsedKPIs.map((kpi, index) => (
                                    <div key={index} className="preview-item">
                                        <div className="preview-item-header">
                                            <strong>{kpi.name}</strong>
                                            <span className="preview-badge">{kpi.visualizationType}</span>
                                        </div>
                                        <div className="preview-item-details">
                                            <span>Value: {getDisplayValue(kpi.value)}</span>
                                            {kpi.chartType && <span>Chart: {kpi.chartType}</span>}
                                            {kpi.trendValue !== undefined && <span>Trend: {kpi.trendValue}%</span>}
                                            {kpi.dataPoints && <span>Data Points: {kpi.dataPoints.length}</span>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="form-actions">
                    <button onClick={onCancel} className="btn btn-secondary">
                        Cancel
                    </button>
                    <button
                        onClick={handleImport}
                        className="btn btn-primary"
                        disabled={parsedKPIs.length === 0}
                    >
                        Import {parsedKPIs.length} KPI{parsedKPIs.length !== 1 ? 's' : ''}
                    </button>
                </div>
            </div >
        </div >
    );
}
