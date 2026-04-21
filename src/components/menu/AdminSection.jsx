import React from 'react';
import { CONFIG } from '../../constants/config';

function AdminSection() {
  const vpnAddr = CONFIG.VPN.ADDR;
  
  if (!vpnAddr) return null;

  const adminLinks = [
    { name: 'VSCode', icon: '💻', path: '/code' },
    { name: 'Explorer', icon: '📂', path: '/explorer/' },
    { name: 'Docker', icon: '🐳', path: '/portainer/' },
    { name: 'pgAdmin', icon: '🐘', path: '/pgadmin/' },
    { name: 'Grafana', icon: '📊', path: '/grafana/' },
  ];

  return (
    <div className="admin-section">
      <div className="menu-title admin-title">관리자 전용</div>
      <div className="admin-links-grid">
        {adminLinks.map((link) => (
          <a
            key={link.name}
            className="menu-item admin-link"
            href={CONFIG.VPN.getAdminUrl(link.path)}
            target="_blank"
            rel="noopener noreferrer"
          >
            <span className="icon">{link.icon}</span> {link.name}
          </a>
        ))}
      </div>
    </div>
  );
}

export default AdminSection;
