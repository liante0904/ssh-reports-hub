import React from 'react';
import { buildDateTagCloud } from '../../utils/tagCloud';

/**
 * 일자별 태그 클라우드 컴포넌트
 *
 * 레포트들의 태그/섹터/종목명을 집계해 빈도가 높을수록 큰 글씨로 표시한다.
 * 태그 클릭 시 onTagClick(keyword)를 호출한다.
 */
function TagCloud({ reports, onTagClick }) {
  const tags = buildDateTagCloud(reports);

  if (tags.length === 0) return null;

  return (
    <div className="tag-cloud">
      {tags.map(({ keyword, count, fontSize }) => (
        <span
          key={keyword}
          className="tag-cloud-item"
          style={{ fontSize: `${fontSize}em` }}
          onClick={() => onTagClick?.(keyword)}
          title={`${keyword} (${count}건)`}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onTagClick?.(keyword);
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
