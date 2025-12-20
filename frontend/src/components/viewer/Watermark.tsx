import React from 'react';
import { Shield, MapPin, User, Building, Clock } from 'lucide-react';
import type { WatermarkData } from '../../types';

interface GeoLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
  city?: string;
  country?: string;
}

interface WatermarkProps {
  data: WatermarkData;
  geoLocation?: GeoLocation | null;
}

const Watermark: React.FC<WatermarkProps> = ({ data, geoLocation }) => {
  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  };

  // Generate diagonal watermark text
  const shortText = `${data.user_name} • ${data.user_email}`;
  const fullText = `${data.user_name} • ${data.user_email} • ${formatTime(data.timestamp)}`;

  return (
    <>
      {/* Top Right - User Info Card */}
      <div className="absolute top-4 right-4 z-20">
        <div className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-md text-white text-xs p-4 rounded-xl shadow-2xl border border-slate-700/50 min-w-[200px]">
          <div className="flex items-center space-x-2 mb-3 pb-2 border-b border-slate-700/50">
            <Shield className="w-4 h-4 text-emerald-400" />
            <span className="font-semibold text-emerald-400 text-[10px] uppercase tracking-wider">Verified Viewer</span>
          </div>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <User className="w-3 h-3 text-slate-400" />
              <span className="font-medium text-white">{data.user_name}</span>
            </div>
            <div className="text-slate-300 text-[11px] pl-5">{data.user_email}</div>
            {data.employee_id && (
              <div className="text-slate-400 text-[10px] pl-5">ID: {data.employee_id}</div>
            )}
            <div className="flex items-center space-x-2 pt-1">
              <Building className="w-3 h-3 text-slate-400" />
              <span className="text-slate-300">{data.organization}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Left - Location & Time Card */}
      <div className="absolute bottom-4 left-4 z-20">
        <div className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-md text-white text-xs p-4 rounded-xl shadow-2xl border border-slate-700/50 min-w-[220px]">
          <div className="flex items-center space-x-2 mb-3 pb-2 border-b border-slate-700/50">
            <MapPin className="w-4 h-4 text-blue-400" />
            <span className="font-semibold text-blue-400 text-[10px] uppercase tracking-wider">Location Tracked</span>
          </div>
          <div className="space-y-2">
            <div className="text-slate-300">{data.location}</div>
            <div className="text-slate-400 text-[10px]">IP: {data.ip_address}</div>
            {geoLocation && (
              <div className="bg-slate-800/80 rounded-lg p-2 mt-2">
                <div className="text-[10px] text-blue-400 font-medium mb-1">GPS Coordinates</div>
                <div className="font-mono text-[11px] text-white">
                  {geoLocation.latitude.toFixed(6)}, {geoLocation.longitude.toFixed(6)}
                </div>
                <div className="text-[9px] text-slate-500 mt-1">
                  Accuracy: ±{Math.round(geoLocation.accuracy)}m
                </div>
                {(geoLocation.city || geoLocation.country) && (
                  <div className="text-[10px] text-slate-400 mt-1">
                    {[geoLocation.city, geoLocation.country].filter(Boolean).join(', ')}
                  </div>
                )}
              </div>
            )}
            <div className="flex items-center space-x-2 pt-1">
              <Clock className="w-3 h-3 text-slate-400" />
              <span className="text-slate-300 text-[11px]">{formatTime(data.timestamp)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Diagonal repeating watermark - more visible */}
      <div
        className="absolute inset-0 pointer-events-none overflow-hidden z-10"
        style={{ opacity: 0.06 }}
      >
        <div
          className="absolute w-[300%] h-[300%]"
          style={{
            transform: 'rotate(-35deg) translate(-30%, -30%)',
          }}
        >
          {Array.from({ length: 30 }).map((_, rowIndex) => (
            <div key={rowIndex} className="whitespace-nowrap mb-20">
              {Array.from({ length: 8 }).map((_, colIndex) => (
                <span
                  key={colIndex}
                  className="inline-block text-black font-bold mx-12"
                  style={{
                    fontFamily: 'Arial, sans-serif',
                    fontSize: '14px',
                    letterSpacing: '1px',
                  }}
                >
                  {shortText}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Large center watermark */}
      <div
        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10"
        style={{ opacity: 0.04 }}
      >
        <div className="text-center text-black select-none" style={{ fontFamily: 'Arial, sans-serif' }}>
          <p className="text-6xl font-black tracking-tight">{data.user_name}</p>
          <p className="text-3xl font-bold mt-2">{data.user_email}</p>
          <p className="text-xl font-medium mt-2">{formatTime(data.timestamp)}</p>
          {geoLocation && (
            <p className="text-lg font-mono mt-2">
              [{geoLocation.latitude.toFixed(4)}, {geoLocation.longitude.toFixed(4)}]
            </p>
          )}
        </div>
      </div>

      {/* Corner marks */}
      <div className="absolute top-2 left-2 text-black/5 text-[8px] font-mono z-10 select-none">
        {data.user_email} • {formatTime(data.timestamp)}
      </div>
      <div className="absolute top-2 right-2 text-black/5 text-[8px] font-mono z-10 select-none text-right">
        {data.ip_address}
        {geoLocation && ` • ${geoLocation.latitude.toFixed(2)},${geoLocation.longitude.toFixed(2)}`}
      </div>
      <div className="absolute bottom-2 right-2 text-black/5 text-[8px] font-mono z-10 select-none text-right">
        {data.user_name} • {data.organization}
      </div>
      <div className="absolute bottom-2 left-2 text-black/5 text-[8px] font-mono z-10 select-none">
        SecureView™ Protected Document
      </div>

      {/* Additional security pattern - grid overlay */}
      <div
        className="absolute inset-0 pointer-events-none z-5"
        style={{
          backgroundImage: `repeating-linear-gradient(
            0deg,
            transparent,
            transparent 100px,
            rgba(0,0,0,0.01) 100px,
            rgba(0,0,0,0.01) 101px
          ),
          repeating-linear-gradient(
            90deg,
            transparent,
            transparent 100px,
            rgba(0,0,0,0.01) 100px,
            rgba(0,0,0,0.01) 101px
          )`,
        }}
      />
    </>
  );
};

export default Watermark;
