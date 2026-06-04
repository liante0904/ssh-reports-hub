import React from 'react';

const REPROCESS_TASKS = [
  { id: 'today', label: '오늘건 재처리' },
  { id: 'failed', label: '실패건 재처리' },
  { id: 'all-firms', label: '전체 증권사 재수집' },
  { id: 'pdf-regen', label: 'PDF 재생성' },
];

function AdminReprocessPanel({ processing, logLines, onReprocess, onClearLog }) {
  return (
    <div className="section-card reprocess-section">
      <div className="section-title">
        🔄 재처리
      </div>
      <div className="reprocess-grid">
        {REPROCESS_TASKS.map((task) => (
          <button
            key={task.id}
            className={`reprocess-btn ${processing[task.id] ? 'processing' : ''}`}
            disabled={processing[task.id]}
            onClick={() => onReprocess(task.id, task.label)}
          >
            {processing[task.id] ? '⏳ 처리 중...' : task.label}
          </button>
        ))}
      </div>

      {logLines.length > 0 && (
        <div className="reprocess-log">
          {logLines.map((line, index) => (
            <div className="log-line" key={index}>{line}</div>
          ))}
          <button
            onClick={onClearLog}
            style={{
              marginTop: 8,
              padding: '4px 12px',
              background: 'transparent',
              border: '1px solid var(--primary-color, #007aff)',
              color: 'var(--primary-color, #007aff)',
              borderRadius: 4,
              cursor: 'pointer',
              fontSize: '0.85em',
            }}
          >
            로그 지우기
          </button>
        </div>
      )}
    </div>
  );
}

export default AdminReprocessPanel;
