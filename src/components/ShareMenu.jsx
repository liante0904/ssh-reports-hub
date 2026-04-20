import React, { useEffect, useRef, useState } from 'react';
import './ShareMenu.css';

function ShareMenu({ isOpen, onClose, reportData, position }) {
  const menuRef = useRef(null);
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    if (isOpen && menuRef.current && position) {
      const menu = menuRef.current;
      const { top, left } = position;
      
      const menuWidth = 280; // 버튼이 늘어나서 너비를 조금 키웁니다
      let adjustedLeft = left - menuWidth / 2;
      
      if (adjustedLeft + menuWidth > window.innerWidth - 20) {
        adjustedLeft = window.innerWidth - menuWidth - 20;
      }
      if (adjustedLeft < 20) {
        adjustedLeft = 20;
      }

      menu.style.top = `${top + 10}px`;
      menu.style.left = `${adjustedLeft}px`;
    }
  }, [isOpen, position]);

  useEffect(() => {
    if (!isOpen) setShowToast(false);
  }, [isOpen]);

  if (!isOpen || !reportData) return null;

  const { title, firm, shareUrl, writer } = reportData;
  const shareImageUrl = `${window.location.origin}/og-image.png`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShowToast(true);
      setTimeout(() => {
        setShowToast(false);
        onClose();
      }, 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  const handleKakaoShare = () => {
    if (window.Kakao && window.Kakao.isInitialized()) {
      window.Kakao.Share.sendDefault({
        objectType: 'feed',
        content: {
          title: `[${firm}] ${title}`,
          description: writer ? `작성자: ${writer}` : '증권사 레포트 리스트',
          imageUrl: shareImageUrl,
          link: {
            mobileWebUrl: shareUrl,
            webUrl: shareUrl,
          },
        },
        buttons: [
          {
            title: '레포트 보기',
            link: {
              mobileWebUrl: shareUrl,
              webUrl: shareUrl,
            },
          },
        ],
      });
    } else {
      // SDK 미로딩 시 폴백: 기존 URL 방식
      const encodedUrl = encodeURIComponent(shareUrl);
      window.open(`https://sharer.kakao.com/talk/friends/picker/link?url=${encodedUrl}`, '_blank');
    }
    onClose();
  };

  const handleTelegramShare = () => {
    const text = `제목: [${firm}] ${title}\n작성자: ${writer || '알 수 없음'}\n원문: ${shareUrl}`;
    const encodedText = encodeURIComponent(text);
    window.open(`https://t.me/share/url?url=${encodedText}`, '_blank'); // url 파라미터 대신 text에 모두 포함하여 보냄
    onClose();
  };

  const handleNativeShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `[${firm}] ${title}`,
        text: `제목: [${firm}] ${title}\n작성자: ${writer || '알 수 없음'}\n원문: ${shareUrl}`,
        // url 필드를 비우거나 text에 포함시켜서 중복을 방지하고 형식을 맞춤
      }).catch(console.error);
    }
    onClose();
  };

  return (
    <div className="share-menu-overlay" onClick={onClose}>
      <div 
        className="share-menu-floating" 
        ref={menuRef}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="share-options-compact">
          <button className="share-option-compact" onClick={handleKakaoShare}>
            <div className="icon-compact kakao">
              <img src="https://developers.kakao.com/assets/img/about/logos/kakaotalksharing/kakaotalk_sharing_btn_medium.png" alt="카톡" />
            </div>
            <span>카톡</span>
          </button>

          <button className="share-option-compact" onClick={handleTelegramShare}>
            <div className="icon-compact telegram">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="white">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .33z"/>
              </svg>
            </div>
            <span>텔레그램</span>
          </button>
          
          <button className="share-option-compact" onClick={handleCopyLink}>
            <div className="icon-compact link">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span>URL 복사</span>
          </button>

          {navigator.share && (
            <button className="share-option-compact" onClick={handleNativeShare}>
              <div className="icon-compact more">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <span>공유하기</span>
            </button>
          )}
        </div>
        <div className="share-menu-arrow"></div>
      </div>

      {showToast && (
        <div className="share-toast">
          링크가 복사되었습니다.
        </div>
      )}
    </div>
  );
}

export default ShareMenu;
