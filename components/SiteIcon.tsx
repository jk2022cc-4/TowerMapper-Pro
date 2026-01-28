
import React from 'react';
import { TowerControl as Tower, Radio, Signal, Database, MapPin, User } from 'lucide-react';

interface SiteIconProps {
  type: string;
  className?: string;
  size?: number;
}

const SiteIcon: React.FC<SiteIconProps> = ({ type, className = "", size = 20 }) => {
  switch (type.toLowerCase()) {
    case 'tower':
      return <Tower className={className} size={size} />;
    case 'radio':
      return <Radio className={className} size={size} />;
    case 'signal':
      return <Signal className={className} size={size} />;
    case 'database':
      return <Database className={className} size={size} />;
    case 'customer':
      return <User className={className} size={size} />;
    default:
      return <MapPin className={className} size={size} />;
  }
};

export default SiteIcon;
