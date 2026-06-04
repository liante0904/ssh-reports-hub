import React from 'react';

const LOG_LEVEL_COLORS = {
  ERROR: '#ff3b30',
  WARNING: '#ff9500',
  INFO: '#34c759',
  SUCCESS: '#30d158',
  DEBUG: '#007aff',
};

const URL_RE = /https?:\/\/[^\s'")>]+/g;
const LEVEL_RE = /^(\S+\s+\S+\s+\|\s+)(\w+)(\s+\|.*)$/;

function linkify(text, lineIdx, offset) {
  const pieces = [];
  let last = 0;
  let match;

  URL_RE.lastIndex = 0;
  // eslint-disable-next-line no-cond-assign
  while ((match = URL_RE.exec(text)) !== null) {
    if (match.index > last) pieces.push(text.slice(last, match.index));
    pieces.push(
      <a
        key={`u${lineIdx}_${offset + match.index}`}
        href={match[0]}
        target="_blank"
        rel="noopener noreferrer"
        className="log-url"
      >
        {match[0]}
      </a>
    );
    last = match.index + match[0].length;
  }

  if (last < text.length) pieces.push(text.slice(last));
  return pieces.length > 0 ? pieces : text;
}

function AdminLogContent({ text }) {
  const lines = text.split('\n');

  return (
    <pre className="log-viewer-pre">
      {lines.map((line, index) => {
        const match = line.match(LEVEL_RE);
        if (!match) {
          return (
            <div key={index} className="log-line">
              {linkify(line, index, 0)}
            </div>
          );
        }

        const level = match[2];
        const color = LOG_LEVEL_COLORS[level];

        return (
          <div key={index} className="log-line">
            {linkify(match[1], index, 0)}
            {color ? (
              <span style={{ color, fontWeight: 600 }}>{level}</span>
            ) : (
              level
            )}
            {linkify(match[3], index, match[1].length + level.length)}
          </div>
        );
      })}
    </pre>
  );
}

export default AdminLogContent;
