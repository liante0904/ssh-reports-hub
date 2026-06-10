import React from 'react';
import { buildDateTagCloud } from '../../utils/tagCloud';

/**
 * 일자별 태그 클라우드 컴포넌트
 *
 * 레포트들의 태그/섹터/종목명을 집계해 빈도가 높을수록 큰 글씨로 표시한다.
 * 태그 클릭 시 onTagClick(keyword, isSector)를 호출한다.
 */
function TagCloud({ reports, onTagClick }) {
  const tags = buildDateTagCloud(reports);

  if (tags.length === 0) return null;

  return (
    <div className="tag-cloud">
      {tags.map(({ keyword, count, fontSize, isSector }) => (
        <span
          key={keyword}
          className={`tag-cloud-item${isSector ? ' tag-cloud-sector' : ''}`}
          style={{ fontSize: `${fontSize}em` }}
          onClick={() => onTagClick?.(keyword, isSector)}
          title={`${keyword} (${count}건)${isSector ? ' · 섹터' : ''}`}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onTagClick?.(keyword, isSector);
            }
          }}
        >
          {keyword}
        </span>
      ))}
    </div>
  );
}

export default TagCloud;
