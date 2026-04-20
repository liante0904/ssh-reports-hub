import React from 'react';

function KeywordOverlay({ 
  newKeyword, 
  setNewKeyword, 
  handleAddKeyword, 
  handleDeleteKeyword, 
  handleDeleteAllKeywords, 
  handleUndoDelete, 
  keywords, 
  isLoadingKeywords, 
  lastDeleted, 
  toggleKeywordOverlay 
}) {
  return (
    <div className="grid-overlay-portal keyword-setup-overlay">
      <div className="grid-overlay-header">
        <div className="grid-header-top">
          <h3>알림 키워드 설정</h3>
          <button className="grid-close-btn" onClick={toggleKeywordOverlay}>
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>
        <div className="keyword-overlay-desc">
          관심 있는 <b>종목명(예: 삼성전자)</b>이나 <b>애널리스트 이름</b>을 등록해 보세요.<br/>
          레포트 제목이나 작성자 정보에 해당 키워드가 포함되면 즉시 알려드립니다.
        </div>
        <div className="grid-search-wrapper keyword-input-wrapper">
          <input 
            type="text" 
            placeholder="키워드 입력" 
            value={newKeyword}
            onChange={(e) => setNewKeyword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddKeyword()}
          />
          <button className="keyword-add-btn" onClick={handleAddKeyword}>추가</button>
        </div>
      </div>

      <div className="grid-overlay-content">
        <div className="keyword-management-container">
          <div className="keyword-status-info">
            <span className="count-badge">등록된 키워드: {keywords.length}개</span>
            {keywords.length > 0 && (
              <button className="delete-all-btn" onClick={handleDeleteAllKeywords}>전체 삭제</button>
            )}
          </div>
          
          <div className="keyword-large-list">
            {isLoadingKeywords ? (
              <div className="loading-spinner-container">
                <div className="spinner"></div>
                <p>로딩 중...</p>
              </div>
            ) : keywords.length > 0 ? (
              <div className="keyword-grid">
                {keywords.map((k, index) => (
                  <div key={index} className="keyword-large-tag">
                    <span className="keyword-text">{k.keyword}</span>
                    <button className="keyword-delete-btn" onClick={() => handleDeleteKeyword(k.keyword)}>
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="keyword-empty-state">
                <div className="empty-icon">🔔</div>
                <p>등록된 키워드가 없습니다.<br/>위에서 키워드를 추가해보세요!</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {lastDeleted && (
        <div className="undo-bar-container">
          <div className="undo-bar">
            <span className="undo-msg">
              {lastDeleted.type === 'bulk' ? '전체 삭제되었습니다' : `'${lastDeleted.data[0]}' 키워드가 삭제되었습니다`}
            </span>
            <button className="undo-btn" onClick={handleUndoDelete}>삭제 취소</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default KeywordOverlay;
