import React from 'react';
import { createPortal } from 'react-dom';
import { useGridOverlay } from '../hooks/useGridOverlay';
import { hasGridSelection, normalizeGridValue } from '../utils/gridSelect';
import './BoardSelect.css';

function BoardSelect({ value, boards = [], onChange, className = '' }) {
  const { isOpen, searchTerm, setSearchTerm, toggleOverlay, closeOverlay } = useGridOverlay();

  const selectedBoard = boards.find(board => board.article_board_order?.toString() === value?.toString());
  const selectedName = hasGridSelection(value)
    ? (selectedBoard?.board_nm || '게시판 필터')
    : '게시판 필터';

  const handleSelect = (boardOrder) => {
    onChange({ target: { value: normalizeGridValue(boardOrder) } });
    closeOverlay();
  };

  const filteredBoards = boards
    .map((board) => ({
      name: board.board_nm,
      order: board.article_board_order,
      count: board.report_count
    }))
    .filter(item => item.name.includes(searchTerm));

  const overlay = (
    <div className="grid-overlay-portal">
      <div className="grid-overlay-header">
        <div className="grid-header-top">
          <h3>게시판 선택</h3>
          <button className="grid-close-btn" onClick={closeOverlay}>
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>
        <div className="grid-search-wrapper">
          <input
            type="text"
            placeholder="찾으시는 게시판을 입력하세요"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="grid-overlay-content">
        <div className="firm-checkerboard">
          <div
            className={`checker-item all ${hasGridSelection(value) ? '' : 'active'}`}
            onClick={() => handleSelect(null)}
          >
            <div className="checker-icon">ALL</div>
            <div className="checker-name">전체보기</div>
          </div>

          {filteredBoards.map(({ name, order, count }) => {
            const initial = name.substring(0, 1);

            return (
              <div
                key={order}
                className={`checker-item ${value?.toString() === order?.toString() ? 'active' : ''}`}
                onClick={() => handleSelect(order)}
              >
                <div className="checker-icon">
                  {initial}
                </div>
                <div className="checker-name">
                  {name}
                  <span className="checker-count">{count}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  return (
    <div className={`board-grid-container ${className}`.trim()}>
      <button className={`grid-trigger-btn ${hasGridSelection(value) ? 'selected' : ''}`} onClick={toggleOverlay}>
        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
          <path d="M4 11h5V5H4v6zm0 7h5v-6H4v6zm6 0h5v-6h-5v6zm6 0h5v-6h-5v6zm-6-7h5V5h-5v6zm6-6v6h5V5h-5z"/>
        </svg>
        <span>{selectedName}</span>
      </button>

      {isOpen && createPortal(overlay, document.body)}
    </div>
  );
}

export default BoardSelect;
